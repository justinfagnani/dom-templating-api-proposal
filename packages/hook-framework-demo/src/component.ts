/**
 * @fileoverview Preact-like component system built on the DOM templating API.
 *
 * Provides function components with hooks support (useState, etc).
 */

import {postDOMTask} from 'dom-scheduler-prototype';
import type {ChildPart} from 'dom-templating-prototype/lib/child-part.js';
import {
  Directive,
  makeDirective,
} from 'dom-templating-prototype/lib/directive.js';
import type {TemplateResult} from 'dom-templating-prototype/lib/template-result.js';

export interface ComponentProps {
  [key: string]: unknown;
  children?: TemplateResult | undefined;
}

/**
 * A component function that returns a TemplateResult.
 */
export type Component = (props?: ComponentProps) => TemplateResult;

/**
 * Internal state hook structure.
 */
interface StateHook<T> {
  value: T;
}

/**
 * Current component instance for hooks.
 */
let currentInstance: ComponentInstance | undefined = undefined;

/**
 * Manages state and lifecycle for a single component instance.
 * 
 * This is a separate class from the component directive to make it easy to
 * discard component state when the component function changes.
 */
class ComponentInstance {
  #directive: ComponentDirective;
  #updatePending = false;

  readonly componentFn: Component;
  readonly hooks: Array<StateHook<unknown>> = [];
  hookIndex = 0;
  props: Record<string, unknown> | undefined;
  children: TemplateResult | undefined;

  constructor(componentFn: Component, directive: ComponentDirective) {
    this.componentFn = componentFn;
    this.#directive = directive;
  }

  scheduleUpdate(): void {
    // Schedule a DOM task to re-render this component
    // This ensures updates run in tree order and are batched
    // Note that this only enqueues update tasks at the component-level of
    // granularity. When we add fine-grained reactivity we want to ensure that
    // We have a single pass of tree-order updates between component re-renders
    // and fine-grained updates.
    if (this.#updatePending) {
      return;
    }
    this.#updatePending = true;
    const node = (this.#directive.part as ChildPart).parentNode;
    postDOMTask(node, () => {
      this.#updatePending = false;
      const result = this.render();
      this.#directive.setValue(result);
    });
  }

  render(): TemplateResult {
    currentInstance = this;
    this.hookIndex = 0;

    try {
      const result = this.componentFn({...this.props, children: this.children});
      return result;
    } finally {
      currentInstance = undefined;
    }
  }
}

/**
 * Directive for rendering function components.
 *
 * Manages component instances and hooks.
 */
class ComponentDirective extends Directive {
  private instance?: ComponentInstance;

  update(
    componentFn: Component,
    props?: Record<string, unknown>,
    children?: TemplateResult
  ): TemplateResult {
    if (this.instance?.componentFn !== componentFn) {
      // First render, or component function changed - create a new instance
      this.instance = new ComponentInstance(componentFn, this);
    }

    // Update props/children
    this.instance.props = props;
    this.instance.children = children;

    // Render component
    return this.instance.render();
  }
}

/**
 * Component directive function.
 *
 * Mounts a component function into the DOM.
 *
 * Usage:
 *   component(MyComponent)
 *   component(MyComponent, {prop1: 'value'})
 *   component(MyComponent, {prop1: 'value'}, html`<child>`)
 */
export const component = makeDirective(ComponentDirective);

/**
 * A state setter function that accepts either a new value or an updater function.
 */
export type SetStateAction<T> = T | ((prevState: T) => T);

/**
 * Hook that provides state management in function components.
 *
 * @param initialValue The initial state value
 * @returns A tuple of [currentState, setState]
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <button on:click={() => setCount(count + 1)}>Increment</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useState<T>(
  initialValue: T
): [T, (action: SetStateAction<T>) => void] {
  if (currentInstance === undefined) {
    throw new Error('useState can only be called inside a component function');
  }

  const instance = currentInstance;

  // Get or create the hook state
  const hookIndex = instance.hookIndex++;
  let hook = instance.hooks[hookIndex] as StateHook<T> | undefined;
  if (hook === undefined) {
    // First render - initialize the hook
    hook = {value: initialValue};
    instance.hooks[hookIndex] = hook;
  }

  // Create the setState function
  const setState = (action: SetStateAction<T>) => {
    // Calculate the new value
    const newValue =
      typeof action === 'function'
        ? (action as (prevState: T) => T)(hook!.value)
        : action;

    // Only update if the value changed
    if (newValue !== hook!.value) {
      hook!.value = newValue;
      // Trigger re-render
      instance.scheduleUpdate();
    }
  };

  return [hook.value, setState];
}

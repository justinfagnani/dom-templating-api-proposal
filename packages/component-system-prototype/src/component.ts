/**
 * Preact-like component system built on the DOM templating API.
 *
 * Provides function components with hooks support (useState, etc).
 */

import {
  Directive,
  makeDirective,
  type DirectiveResult,
} from 'dom-templating-prototype/lib/directive.js';
import type {TemplateResult} from 'dom-templating-prototype/lib/template-result.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A component function that returns a TemplateResult.
 */
export type ComponentFunction = (
  props?: Record<string, unknown>,
  children?: TemplateResult
) => TemplateResult;

/**
 * A state setter function that accepts either a new value or an updater function.
 */
export type SetStateAction<T> = T | ((prevState: T) => T);

/**
 * Internal state hook structure.
 */
interface StateHook<T> {
  value: T;
}

// ============================================================================
// Hook Context
// ============================================================================

/**
 * Current component instance (set during render)
 */
let currentInstance: ComponentInstance | null = null;

/**
 * Gets the current component instance
 */
function getCurrentInstance(): ComponentInstance | null {
  return currentInstance;
}

/**
 * Sets the current component instance
 */
function setCurrentInstance(instance: ComponentInstance | null): void {
  currentInstance = instance;
}

// ============================================================================
// Component Instance
// ============================================================================

/**
 * Manages state and lifecycle for a single component instance
 */
class ComponentInstance {
  private hooks: unknown[] = [];
  private hookIndex = 0;
  private componentFn: ComponentFunction;
  private directive: ComponentDirective;
  props: Record<string, unknown> | undefined;
  children: TemplateResult | undefined;

  constructor(componentFn: ComponentFunction, directive: ComponentDirective) {
    this.componentFn = componentFn;
    this.directive = directive;
  }

  getHook(index: number): unknown {
    return this.hooks[index];
  }

  setHook(index: number, value: unknown): void {
    this.hooks[index] = value;
  }

  nextHookIndex(): number {
    return this.hookIndex++;
  }

  scheduleUpdate(): void {
    // Trigger re-render by calling setValue on the directive
    const result = this.render();
    this.directive.setValue(result);
  }

  render(): TemplateResult {
    // Reset hook index for this render
    this.hookIndex = 0;

    // Set global hook context
    setCurrentInstance(this);

    try {
      // Call component function
      const result = this.componentFn(this.props, this.children);
      return result;
    } finally {
      setCurrentInstance(null);
    }
  }
}

// ============================================================================
// Component Directive
// ============================================================================

/**
 * Directive for rendering function components.
 *
 * Manages component instances and hooks.
 */
class ComponentDirective extends Directive {
  private instance?: ComponentInstance;

  update(
    componentFn: ComponentFunction,
    props?: Record<string, unknown>,
    children?: TemplateResult
  ): TemplateResult {
    if (!this.instance) {
      // First render - create instance
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
 * Usage:
 *   component(MyComponent)
 *   component(MyComponent, {prop1: 'value'})
 *   component(MyComponent, {prop1: 'value'}, html`<child>`)
 */
export const component = makeDirective(ComponentDirective);

export type {DirectiveResult};

// ============================================================================
// Hooks
// ============================================================================

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
export function useState<T>(initialValue: T): [T, (action: SetStateAction<T>) => void] {
  // Get the current component instance
  const instance = getCurrentInstance();

  if (!instance) {
    throw new Error('useState can only be called inside a component function');
  }

  // Get the index for this hook
  const hookIndex = instance.nextHookIndex();

  // Get or create the hook state
  let hook = instance.getHook(hookIndex) as StateHook<T> | undefined;
  if (hook === undefined) {
    // First render - initialize the hook
    hook = {value: initialValue};
    instance.setHook(hookIndex, hook);
  }

  // Create the setState function
  const setState = (action: SetStateAction<T>) => {
    // Calculate the new value
    const newValue =
      typeof action === 'function' ? (action as (prevState: T) => T)(hook!.value) : action;

    // Only update if the value changed
    if (newValue !== hook!.value) {
      hook!.value = newValue;
      // Trigger re-render
      instance.scheduleUpdate();
    }
  };

  return [hook.value, setState];
}

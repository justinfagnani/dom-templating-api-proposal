/**
 * Component directive for rendering function components.
 */

import {
  Directive,
  makeDirective,
  type DirectiveResult,
} from 'dom-templating-prototype/lib/directive.js';
import type {TemplateResult} from 'dom-templating-prototype/lib/template-result.js';
import {
  setCurrentInstance,
  type ComponentInstance as HookComponentInstance,
} from '../hooks/context.js';

/**
 * A component function that returns a TemplateResult.
 */
export type ComponentFunction = (
  props?: Record<string, unknown>,
  children?: TemplateResult
) => TemplateResult;

/**
 * Manages state and lifecycle for a single component instance
 */
class ComponentInstance implements HookComponentInstance {
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

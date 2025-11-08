/**
 * Component directive for rendering function components.
 */

import {
  Directive,
  makeDirective,
  type DirectiveResult,
} from '../../../dom-templating-prototype/lib/directive.js';
import type {TemplateResult} from '../../../dom-templating-prototype/lib/template-result.js';

/**
 * A component function that returns a TemplateResult.
 */
export type ComponentFunction = (
  props?: Record<string, unknown>,
  children?: TemplateResult
) => TemplateResult;

/**
 * Directive for rendering function components.
 *
 * This is a minimal implementation that just calls the component function
 * and returns its result. It doesn't handle state yet.
 */
class ComponentDirective extends Directive {
  private componentFn?: ComponentFunction;

  override update(
    componentFn: ComponentFunction,
    props?: Record<string, unknown>,
    children?: TemplateResult
  ): TemplateResult {
    this.componentFn = componentFn;

    // Call the component function to get the template result
    const result = componentFn(props, children);

    return result;
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

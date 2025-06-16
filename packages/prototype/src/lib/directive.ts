import {noChange} from './sentinels.js';
import type {TemplatePart} from './template-part.js';

export interface DirectiveClass {
  new (part: TemplatePart, index: number): Directive;
}

/**
 * This utility type extracts the signature of a directive class's update()
 * method so we can use it for the type of the generated directive function.
 */
export type DirectiveParameters<C extends Directive> = Parameters<C['update']>;

/**
 * The return type of a directive function. Directive functions created with
 * `makeDirective()` do not instantiate the directive class directly, but
 * return a DirectiveResult object that captures the function arguments.
 *
 * The directive class is instantiated later by the template engine when
 * the directive is applied to a template part, or reused when the
 * template is re-applied to a part that already has a directive instance of the
 * same class.
 */
export class DirectiveResult<C extends DirectiveClass = DirectiveClass> {
  readonly directiveClass: C;

  /**
   * The values passed to the directive function invocation.
   */
  readonly values: DirectiveParameters<InstanceType<C>>;

  constructor(directiveClass: C, values: DirectiveParameters<InstanceType<C>>) {
    this.directiveClass = directiveClass;
    this.values = values;
  }
}

/**
 * Base class for custom directives.
 */
export abstract class Directive {
  readonly part: TemplatePart;
  readonly index: number;

  constructor(part: TemplatePart, index: number) {
    this.part = part;
    this.index = index;
  }

  abstract update(...props: Array<unknown>): unknown;

  declare connectedCallback: () => void;

  declare disconnectedCallback: () => void;

  /**
   * Sets the value of the directive and the part its attached to.
   *
   * Directives should only call this method asynchronously, outside of the
   * directive's `update()` call, since `setPart()` will overwrite the value
   * provided by outer directives. Prefer returning a value from `update()`
   * that will be passed to the next directive in the chain.
   */
  setValue(value: unknown): void {
    // TODO: Parts should delegate the ability to call setValue() to the
    // directive, so that the part can revoke the ability when the directive
    // is disconnected. They can do this by passing a callback to the
    // directive constructor, which the directive can call to set the value.
    this.part.setValue(value, this.index);
  }
}

/**
 * Creates a directive function from a Directive class. This function has the
 * same parameters as the directive class's `update()` method.
 */
export const makeDirective =
  <C extends DirectiveClass>(c: C) =>
  (...values: DirectiveParameters<InstanceType<C>>): DirectiveResult<C> =>
    new DirectiveResult(c, values);

export const evaluateDirective = (
  value: unknown,
  part: TemplatePart,
  directives: Array<Directive>,
  index = 0,
  fromDirective?: boolean // TODO: remove this parameter
) => {
  // Bail early if the value is explicitly noChange. Note, this means any
  // nested directive is still attached and is not run.
  if (value === noChange) {
    return value;
  }

  if (value instanceof DirectiveResult || fromDirective) {
    // If fromDirective is true, we just assume that the call is from the
    // directive at `index`. This is dangerous and we should refactor the
    // part / directive interface to avoid this.
    let directive = directives[index];

    if (value instanceof DirectiveResult) {
      if (
        directive === undefined ||
        !(directive.constructor === value.directiveClass)
      ) {
        // If the directive is not the same as the previous one, we need to
        // create a new directive instance.
        // TODO: clear and disconnect the tail of the directives array
        directive = directives[index] =
          new (value.directiveClass as DirectiveClass)(part, index);
      }
      value = directive.update(...value.values);
    }
    value = evaluateDirective(value, part, directives, index + 1);
  } else {
    // TODO: disconnect unused directives
    directives.length = index;
  }
  return value;
};

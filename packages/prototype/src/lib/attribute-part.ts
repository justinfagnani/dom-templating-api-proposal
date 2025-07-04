import {Directive, evaluateWithDirectives} from './directive.js';
import {noChange, nothing} from './sentinels.js';
import {TemplatePart} from './template-part.js';
import {isPrimitive} from './utils.js';

/**
 * A part that represents an attribute binding with a single value - that is a
 * value that controls the entire attribute value, rather than an interpolation
 * with multiple values and static strings.
 */
export class SingleAttributePart extends TemplatePart {
  readonly element: Element;
  readonly name: string;

  #committedValue: unknown;
  #directives: Array<Directive> = [];

  constructor(node: Element, name: string, strings?: ReadonlyArray<string>) {
    super();
    if (
      strings !== undefined &&
      !(strings.length === 2 && strings[0] === '' && strings[1] === '')
    ) {
      throw new Error('Invalid strings for SingleAttributePart');
    }
    this.element = node;
    this.name = name;
    this.#committedValue = nothing;
  }

  setValue(value: unknown) {
    value = evaluateWithDirectives(value, this, this.#directives);
    if (
      !isPrimitive(value) ||
      (value !== this.#committedValue && value !== noChange)
    ) {
      this.#committedValue = value;
      this.commitValue(value);
    }
  }

  override setConnected(connected: boolean): void {
    for (const directive of this.#directives) {
      if (connected) {
        directive.connectedCallback?.();
      } else {
        directive.disconnectedCallback?.();
      }
    }
  }

  protected commitValue(value: unknown): void {
    if (value === nothing) {
      this.element.removeAttribute(this.name);
    } else {
      this.element.setAttribute(this.name, (value ?? '') as string);
    }
  }

  override clone(node: Node): TemplatePart {
    return new SingleAttributePart(node as Element, this.name);
  }
}

/**
 * A part that represents an attribute binding with multiple values - that is a
 * binding that interpolates between multiple values and static strings.
 */
export class MultiAttributePart extends TemplatePart {
  readonly element: Element;
  readonly name: string;
  readonly strings: ReadonlyArray<string>;

  #childParts: Array<PartialAttributePart>;

  constructor(node: Element, name: string, strings: ReadonlyArray<string>) {
    super();
    if (strings.length === 2 && strings[0] === '' && strings[1] === '') {
      throw new Error('Invalid strings for MultiAttributePart');
    }
    this.element = node;
    this.name = name;
    this.strings = strings;

    this.#childParts = Array.from(
      {length: strings.length - 1},
      (_, i) => new PartialAttributePart(this, i)
    );
  }

  setValue(values: ReadonlyArray<unknown>) {
    const strings = this.strings;
    let change = false;
    let value: unknown = strings[0];

    for (let i = 0; i < values.length; i++) {
      const childPart = this.#childParts[i];
      const childChanged = childPart._setValue(values[i]);
      change ||= childChanged;
      const v = childPart.getValue();
      if (v === nothing) {
        value = nothing;
      } else if (value !== nothing) {
        value += (v ?? '') + strings[i + 1];
      }
    }

    if (change) {
      this.commitValue(value);
    }
  }

  override setConnected(connected: boolean): void {
    for (const child of this.#childParts) {
      child.setConnected(connected);
    }
  }

  protected commitValue(value: unknown): void {
    if (value === nothing) {
      this.element.removeAttribute(this.name);
    } else {
      this.element.setAttribute(this.name, (value ?? '') as string);
    }
  }

  override clone(node: Node): TemplatePart {
    return new MultiAttributePart(node as Element, this.name, this.strings);
  }
}

export class PartialAttributePart extends TemplatePart {
  #parent: MultiAttributePart;
  #index: number;
  #committedValue: unknown = new String();
  #directives: Array<Directive> = [];

  constructor(parent: MultiAttributePart, index: number) {
    super();
    this.#parent = parent;
    this.#index = index;
  }

  get name() {
    return this.#parent.name;
  }

  setValue(value: unknown) {
    // TODO: Do this more efficiently by only updating the value at the index
    // inside AttributePart.
    const newValues = Array.from(
      {length: this.#parent.strings.length - 1},
      () => noChange
    ) as Array<unknown>;
    newValues[this.#index] = value;
    this.#parent.setValue(newValues);
  }

  override setConnected(connected: boolean): void {
    for (const directive of this.#directives) {
      if (connected) {
        directive.connectedCallback?.();
      } else {
        directive.disconnectedCallback?.();
      }
    }
  }

  /** @internal */
  _setValue(value: unknown) {
    value = evaluateWithDirectives(value, this, this.#directives);
    const changed =
      !isPrimitive(value) ||
      (value !== this.#committedValue && value !== noChange);
    if (changed) {
      this.#committedValue = value;
    }
    return changed;
  }

  getValue() {
    return this.#committedValue;
  }

  override clone(_node: Node): TemplatePart {
    throw new Error('PartialAttributePart cannot be cloned');
  }
}

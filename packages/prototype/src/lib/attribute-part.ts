import {noChange, nothing} from './sentinels.js';
import {TemplatePart, type TemplatePartType} from './template-part.js';
import {isPrimitive} from './utils.js';

export class AttributePart extends TemplatePart {
  readonly type: TemplatePartType = TemplatePart.ATTRIBUTE_PART;
  readonly element: Element;
  readonly name: string;
  readonly strings: ReadonlyArray<string>;

  #committedValue: unknown | ReadonlyArray<unknown>;

  constructor(node: Element, name: string, strings: ReadonlyArray<string>) {
    super();
    this.element = node;
    this.name = name;
    this.strings = strings;

    if (this.isSingleValue) {
      this.#committedValue = nothing;
    } else {
      this.#committedValue = Array.from(
        {length: strings.length - 1},
        () => new String()
      );
    }
  }

  /**
   * Whether this part is for a single-binding attribute, which is an attribute
   * where a binding is applied to the entire attribute value, rather than
   * interpolating between multiple values and static strings.
   */
  get isSingleValue(): boolean {
    return (
      this.strings.length === 2 &&
      this.strings[0] === '' &&
      this.strings[1] === ''
    );
  }

  setValue(values: ReadonlyArray<unknown>) {
    const strings = this.strings;
    // Whether any of the values has changed, for dirty-checking
    let change = false;
    let value: unknown;

    if (this.isSingleValue) {
      value = values[0];
      change =
        !isPrimitive(value) ||
        (value !== this.#committedValue && value !== noChange);
      if (change) {
        this.#committedValue = value;
      }
    } else {
      if (!Array.isArray(this.#committedValue)) {
        throw new Error('Internal error: committedValue must be an array');
      }
      value = strings[0];

      let i, v;
      for (i = 0; i < values.length; i++) {
        // v = resolveDirective(this, values[i]);
        v = values[i];

        // If the user-provided value is `noChange`, use the previous value
        if (v === noChange) {
          v = this.#committedValue[i];
        }

        // Dirty checking: if the value is a primitive, we can check for
        // equality, otherwise assume a change
        change ||= !isPrimitive(v) || v !== this.#committedValue[i];

        if (v === nothing) {
          value = nothing;
        } else if (value !== nothing) {
          value += (v ?? '') + strings[i + 1];
        }
        this.#committedValue[i] = v;
      }
    }

    if (change) {
      this.commitValue(value);
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
    return new AttributePart(node as Element, this.name, this.strings);
  }
}

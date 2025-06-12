import {AttributePart} from './attribute-part.js';
import {nothing} from './sentinels.js';
import {TemplatePart} from './template-part.js';

export class BooleanAttributePart extends AttributePart {
  override readonly type = TemplatePart.BOOLEAN_ATTRIBUTE_PART;

  constructor(node: Element, name: string, strings: ReadonlyArray<string>) {
    super(node, name, strings);
    if (!this.isSingleValue) {
      // TODO: add test
      throw new Error('BooleanAttributeParts must only have a single value');
    }
  }

  protected override commitValue(value: unknown) {
    this.element.toggleAttribute(this.name, !!value && value !== nothing);
  }

  override clone(node: Node): TemplatePart {
    return new BooleanAttributePart(node as Element, this.name, this.strings);
  }
}

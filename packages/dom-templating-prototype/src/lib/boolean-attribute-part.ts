import {SingleAttributePart} from './attribute-part.js';
import {nothing} from './sentinels.js';
import {TemplatePart} from './template-part.js';

export class BooleanAttributePart extends SingleAttributePart {
  protected override commitValue(value: unknown) {
    this.element.toggleAttribute(this.name, !!value && value !== nothing);
  }

  override clone(node: Node): TemplatePart {
    return new BooleanAttributePart(node as Element, this.name);
  }
}

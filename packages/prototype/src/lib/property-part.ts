import {AttributePart} from './attribute-part.js';
import {nothing} from './sentinels.js';
import {TemplatePart} from './template-part.js';

export class PropertyPart extends AttributePart {
  override readonly type = TemplatePart.PROPERTY_PART;

  protected override commitValue(value: unknown) {
    (this.element as any)[this.name] = value === nothing ? undefined : value;
  }

  override clone(node: Node): TemplatePart {
    return new PropertyPart(node as Element, this.name, this.strings);
  }
}

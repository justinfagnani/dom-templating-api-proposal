import {MultiAttributePart, SingleAttributePart} from './attribute-part.js';
import {nothing} from './sentinels.js';
import {TemplatePart} from './template-part.js';

export class MultiPropertyPart extends MultiAttributePart {
  protected override commitValue(value: unknown) {
    (this.element as any)[this.name] = value === nothing ? undefined : value;
  }

  override clone(node: Node): TemplatePart {
    return new MultiPropertyPart(node as Element, this.name, this.strings);
  }
}

export class SinglePropertyPart extends SingleAttributePart {
  protected override commitValue(value: unknown) {
    (this.element as any)[this.name] = value === nothing ? undefined : value;
  }

  override clone(node: Node): TemplatePart {
    return new SinglePropertyPart(node as Element, this.name);
  }
}

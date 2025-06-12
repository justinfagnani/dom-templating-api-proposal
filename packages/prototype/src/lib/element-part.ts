import {TemplatePart} from "./template-part.js";

export class ElementPart extends TemplatePart {
  override readonly type = TemplatePart.ELEMENT_PART;
  readonly element: Element;

  constructor(element: Element) {
    super();
    this.element = element;
  }

  override clone(node: Node): TemplatePart {
    return new ElementPart(node as Element);
  }

  override setValue(value: unknown): void {
    value;
  }
}

import {Directive, evaluateDirective} from "./directive.js";
import {TemplatePart} from "./template-part.js";

export class ElementPart extends TemplatePart {
  readonly element: Element;

  #directives: Array<Directive> = [];
  
  constructor(element: Element) {
    super();
    this.element = element;
  }

  override clone(node: Node): TemplatePart {
    return new ElementPart(node as Element);
  }

  override setValue(value: unknown): void {
    evaluateDirective(value, this, this.#directives);
  }
}

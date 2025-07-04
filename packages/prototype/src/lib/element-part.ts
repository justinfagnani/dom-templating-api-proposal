import {Directive, evaluateWithDirectives} from './directive.js';
import {TemplatePart} from './template-part.js';

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
    evaluateWithDirectives(value, this, this.#directives);
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
}

export abstract class TemplatePart {
  abstract clone(node: Node): TemplatePart;

  abstract setValue(value: unknown, directiveIndex?: number): void;
}

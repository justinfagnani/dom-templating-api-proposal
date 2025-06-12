export abstract class TemplatePart {
  static readonly ATTRIBUTE_PART = 1;
  static readonly CHILD_PART = 2;
  static readonly PROPERTY_PART = 3;
  static readonly BOOLEAN_ATTRIBUTE_PART = 4;
  static readonly EVENT_PART = 5;
  static readonly ELEMENT_PART = 6;
  static readonly COMMENT_PART = 7;

  abstract readonly type: TemplatePartType;

  abstract clone(node: Node): TemplatePart;

  abstract setValue(value: unknown): void;
}

export type TemplatePartType =
  | typeof TemplatePart.ATTRIBUTE_PART
  | typeof TemplatePart.CHILD_PART
  | typeof TemplatePart.PROPERTY_PART
  | typeof TemplatePart.BOOLEAN_ATTRIBUTE_PART
  | typeof TemplatePart.EVENT_PART
  | typeof TemplatePart.ELEMENT_PART
  | typeof TemplatePart.COMMENT_PART;

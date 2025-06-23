export const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  new TemplateResult('html', strings, values);

export const svg = (strings: TemplateStringsArray, ...values: unknown[]) =>
  new TemplateResult('svg', strings, values);

export const mathml = (strings: TemplateStringsArray, ...values: unknown[]) =>
  new TemplateResult('mathml', strings, values);

export type TemplateResultKind = 'html' | 'svg' | 'mathml';

export class TemplateResult {
  static readonly HTML_RESULT = 'html';
  static readonly SVG_RESULT = 'svg';
  static readonly MATHML_RESULT = 'mathml';

  readonly kind: TemplateResultKind;
  readonly strings: TemplateStringsArray;
  readonly values: ReadonlyArray<unknown>;

  constructor(
    kind: TemplateResultKind,
    strings: TemplateStringsArray,
    values: ReadonlyArray<unknown>
  ) {
    this.kind = kind;
    this.strings = strings;
    this.values = values;
  }
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  new TemplateResult('html', strings, values);

export const svg = (strings: TemplateStringsArray, ...values: unknown[]) =>
  new TemplateResult('svg', strings, values);

export const mathml = (strings: TemplateStringsArray, ...values: unknown[]) =>
  new TemplateResult('mathml', strings, values);

export type TemplateResultKind = 'html' | 'svg' | 'mathml';

export class TemplateResult {
  static #htmlTemplateCache = new Map<
    TemplateStringsArray,
    HTMLTemplateElement
  >();
  static #svgTemplateCache = new Map<
    TemplateStringsArray,
    HTMLTemplateElement
  >();
  static #mathmlTemplateCache = new Map<
    TemplateStringsArray,
    HTMLTemplateElement
  >();

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

  get template() {
    const cache =
      this.kind === 'html'
        ? TemplateResult.#htmlTemplateCache
        : this.kind === 'svg'
          ? TemplateResult.#svgTemplateCache
          : TemplateResult.#mathmlTemplateCache;
    let template = cache.get(this.strings);
    if (template === undefined) {
      template = document.createElement('template');
      template.innerHTML = this.strings.join('');
      cache.set(this.strings, template);
    }
    return template;
  }
}

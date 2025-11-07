/**
 * Simple mock implementation of DOMTemplate for testing the transform.
 * This doesn't actually create DOM elements, just returns a string representation.
 */

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += String(values[i]);
    }
  }
  return result;
}

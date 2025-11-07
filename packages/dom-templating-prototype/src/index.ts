import {html, svg, mathml} from './lib/template-result.js';
export {html, svg, mathml} from './lib/template-result.js';
export {render} from './lib/render.js';

/**
 * An namespace object that contains the global DOM Templating API as defined in
 * the explainer.
 *
 * To use this similarly to how the explainer shows, you can do:
 *
 * ```ts
 * import {DOMTemplate} from 'dom-templating-prototype';
 *
 * const {html, svg, mathml} = DOMTemplate;
 *
 * const template = html`<div>Hello, world!</div>`;
 * ```
 */
export const DOMTemplate = {
  html,
  svg,
  mathml,
};

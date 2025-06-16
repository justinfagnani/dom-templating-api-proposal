import {MultiAttributePart, SingleAttributePart} from './attribute-part.js';
import {BooleanAttributePart} from './boolean-attribute-part.js';
import {ChildPart} from './child-part.js';
import {CommentPart} from './comment-part.js';
import {ElementPart} from './element-part.js';
import {EventPart} from './event-part.js';
import {
  boundAttributeSuffix,
  getTemplateHtml,
  marker,
} from './get-template-html.js';
import {MultiPropertyPart, SinglePropertyPart} from './property-part.js';
import {TemplateInstance} from './template-instance.js';
import type {TemplatePart} from './template-part.js';
import {TemplateResult} from './template-result.js';

/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - they must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
export const templateCache = new WeakMap<TemplateStringsArray, Template>();

// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = () => document.createComment('');

const walker = document.createTreeWalker(
  document,
  NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
);

// String used to tell if a comment is a marker comment
const markerMatch = '?' + marker;

const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE;

const isComment = (node: Node): node is Comment =>
  node.nodeType === Node.COMMENT_NODE;

export class Template {
  element: HTMLTemplateElement;

  parts: Array<{part: TemplatePart; index: number}> = [];

  constructor(templateResult: TemplateResult) {
    const {strings, kind} = templateResult;
    let node: Node | null;
    let nodeIndex = 0;
    let attrNameIndex = 0;
    const partCount = strings.length - 1;
    const parts = this.parts;

    // Create the template element
    const {html, attributeNames} = getTemplateHtml(strings, kind);
    // console.log('html', html);
    const el = (this.element = document.createElement('template'));
    el.innerHTML = html as unknown as string;

    walker.currentNode = this.element.content;

    // Re-parent SVG or MathML nodes into template root
    if (
      kind === TemplateResult.SVG_RESULT ||
      kind === TemplateResult.MATHML_RESULT
    ) {
      const wrapper = this.element.content.firstChild!;
      wrapper.replaceWith(...wrapper.childNodes);
    }

    // Walk the template to find binding markers and create TemplateParts
    while ((node = walker.nextNode()) !== null && parts.length < partCount) {
      if (isElement(node)) {
        const tag = node.localName;
        // Warn if `textarea` includes an expression and throw if `template`
        // does since these are not supported. We do this by checking
        // innerHTML for anything that looks like a marker. This catches
        // cases like bindings in textarea there markers turn into text nodes.
        if (
          tag === 'textarea' ||
          (tag === 'template' && node.innerHTML.includes(marker))
        ) {
          throw new Error(
            `Expressions are not supported inside \`${tag}\` elements.`
          );
        }
        // TODO (justinfagnani): for attempted dynamic tag names, we don't
        // increment the bindingIndex, and it'll be off by 1 in the element
        // and off by two after it.
        if (node.hasAttributes()) {
          for (const attributeName of node.getAttributeNames()) {
            if (attributeName.endsWith(boundAttributeSuffix)) {
              // The bound attribute name as it appears in the template string.
              // This name is case-preserved, so it can be used for arbitrary
              // property and event names.
              const sourceName = attributeNames[attrNameIndex++];
              const value = node.getAttribute(attributeName)!;
              const statics = value.split(marker);
              const isSingleValueBinding =
                statics.length === 2 && statics[0] === '' && statics[1] === '';

              const [, sigil, name] = /([.?@])?(.*)/.exec(sourceName)!;
              const partConstructor =
                sigil === '.'
                  ? isSingleValueBinding
                    ? SinglePropertyPart
                    : MultiPropertyPart
                  : sigil === '?'
                    ? BooleanAttributePart
                    : sigil === '@'
                      ? EventPart
                      : isSingleValueBinding
                        ? SingleAttributePart
                        : MultiAttributePart;
              parts.push({
                part: new partConstructor(node as HTMLElement, name, statics),
                index: nodeIndex,
              });
              node.removeAttribute(attributeName);
            } else if (attributeName.startsWith(marker)) {
              parts.push({
                part: new ElementPart(node),
                index: nodeIndex,
              });
              node.removeAttribute(attributeName);
            }
          }
        }
        if (tag === 'script' || tag === 'style' || tag === 'title') {
          // <script> and <style> are raw text elements, which don't parse
          // comments, so we need to split the text content on markers,
          // create a Text node for each segment, and create a TemplatePart
          // for each marker.
          const strings = node.textContent!.split(marker);
          const lastIndex = strings.length - 1;
          if (lastIndex > 0) {
            node.textContent = '';
            // Generate a new text node for each literal section
            // These nodes are also used as the markers for child parts
            for (let i = 0; i < lastIndex; i++) {
              node.append(strings[i], createMarker());
              // Walk past the marker node we just added
              walker.nextNode();
              parts.push({
                part: new ChildPart(node, node.nextSibling),
                index: ++nodeIndex,
              });
            }
            // Note because this marker is added after the walker's current
            // node, it will be walked to in the outer loop (and ignored), so we
            // don't need to adjust nodeIndex here
            node.append(strings[lastIndex], createMarker());
          }
        }
      } else if (isComment(node)) {
        const data = node.data;
        if (data === markerMatch) {
          parts.push({
            part: new ChildPart(node, node.nextSibling),
            index: nodeIndex,
          });
        } else {
          let i = -1;
          while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
            parts.push({
              part: new CommentPart(node),
              index: nodeIndex,
            });
            // Move to the end of the match
            i += marker.length - 1;
          }
        }
      }
      nodeIndex++;
    }

    // If there was a duplicate attribute on a tag, then when the tag is
    // parsed into an element the attribute gets de-duplicated. We can detect
    // this mismatch if we haven't precisely consumed every attribute name
    // when preparing the template. This works because `attrNames` is built
    // from the template string and `attrNameIndex` comes from processing the
    // resulting DOM.
    if (attributeNames.length !== attrNameIndex) {
      throw new Error(
        `Detected duplicate attribute bindings. This occurs if your template ` +
          `has duplicate attributes on an element tag. For example ` +
          `"<input ?disabled=\${true} ?disabled=\${false}>" contains a ` +
          `duplicate "disabled" attribute. The error was detected in ` +
          `the following template: \n` +
          '`' +
          strings.join('${...}') +
          '`'
      );
    }

    // Set walker.currentNode to another node here to prevent a memory leak
    walker.currentNode = document;
  }

  clone() {
    // TODO (justinfagnani): support scoped custom element registries here
    const fragment = document.importNode(this.element.content, true);
    const partClones: Array<TemplatePart> = [];
    walker.currentNode = fragment;

    let node = walker.nextNode()!;
    let nodeIndex = 0;
    let partIndex = 0;
    let nextTemplatePart = this.parts[0];

    while (nextTemplatePart !== undefined) {
      if (nodeIndex === nextTemplatePart.index) {
        partClones.push(nextTemplatePart.part.clone(node));
        nextTemplatePart = this.parts[++partIndex];
      }
      if (nodeIndex !== nextTemplatePart?.index) {
        node = walker.nextNode()!;
        nodeIndex++;
      }
    }
    // Set walker.currentNode to another node here to prevent a memory leak
    walker.currentNode = document;

    const instance = new TemplateInstance(this, partClones);
    return {instance, fragment};
  }
}

import {Directive, evaluateDirective} from './directive.js';
import {noChange, nothing} from './sentinels.js';
import {TemplateInstance} from './template-instance.js';
import {TemplatePart} from './template-part.js';
import {TemplateResult} from './template-result.js';
import {Template, templateCache} from './template.js';
import {createMarker, isIterable, isPrimitive} from './utils.js';

export class ChildPart extends TemplatePart {
  #committedValue: unknown = nothing;
  #directives: Array<Directive> = [];

  /**
   * The part's leading marker node, if any. See `.parentNode` for more
   * information.
   */
  readonly startNode: ChildNode;

  /**
   * The part's trailing marker node, if any. See `.parentNode` for more
   * information.
   */
  readonly endNode: ChildNode | null;

  constructor(startNode: ChildNode, endNode: ChildNode | null = null) {
    super();
    this.startNode = startNode;
    this.endNode = endNode;
  }

  /**
   * The parent node into which the part renders its content.
   *
   * A ChildPart's content consists of a range of adjacent child nodes of
   * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
   * `.endNode`).
   *
   * - If both `.startNode` and `.endNode` are non-null, then the part's content
   * consists of all siblings between `.startNode` and `.endNode`, exclusively.
   *
   * - If `.startNode` is non-null but `.endNode` is null, then the part's
   * content consists of all siblings following `.startNode`, up to and
   * including the last child of `.parentNode`. If `.endNode` is non-null, then
   * `.startNode` will always be non-null.
   *
   * - If both `.endNode` and `.startNode` are null, then the part's content
   * consists of all child nodes of `.parentNode`.
   */
  get parentNode(): Node {
    return this.startNode.parentNode!;
  }

  setValue(value: unknown, directiveIndex?: number): void {
    if (
      this.startNode === null ||
      (this.endNode !== null &&
        this.startNode.parentNode !== this.endNode!.parentNode)
    ) {
      throw new Error(
        `This ChildPart cannot accept a value. This likely means the element `
      );
    }

    value = evaluateDirective(
      value,
      this,
      this.#directives,
      0,
      directiveIndex !== undefined
    );

    if (isPrimitive(value)) {
      // Non-rendering child values. It's important that these do not render
      // empty text nodes to avoid issues with preventing default <slot>
      // fallback content.
      if (value === nothing || value == null || value === '') {
        if (this.#committedValue !== nothing) {
          this.#clear();
        }
        this.#committedValue = nothing;
      } else if (value !== this.#committedValue && value !== noChange) {
        this.#commitText(value);
      }
    } else if (value instanceof TemplateResult) {
      this.#commitTemplateResult(value as TemplateResult);
    } else if ((value as Node).nodeType !== undefined) {
      this.#commitNode(value as Node);
    } else if (isIterable(value)) {
      this.#commitIterable(value);
    } else {
      // Fallback, will render the string representation
      this.#commitText(value);
    }
  }

  clone(node: Node) {
    return new ChildPart(
      node as ChildNode,
      node.nextSibling as ChildNode | null
    );
  }

  #insert<T extends Node>(node: T) {
    return this.startNode.parentNode!.insertBefore(node, this.endNode);
  }

  #commitNode(value: Node): void {
    if (this.#committedValue !== value) {
      this.#clear();
      this.#committedValue = this.#insert(value);
    }
  }

  #commitText(value: unknown): void {
    // If the committed value is a primitive it means we called _commitText on
    // the previous render, and we know that this._$startNode.nextSibling is a
    // Text node. We can now just replace the text content (.data) of the node.
    if (this.#committedValue !== nothing && isPrimitive(this.#committedValue)) {
      const node = this.startNode.nextSibling as Text;
      (node as Text).data = value as string;
    } else {
      this.#commitNode(document.createTextNode(value as string));
    }
    this.#committedValue = value;
  }

  #commitTemplateResult(result: TemplateResult): void {
    const {values} = result;
    let template = templateCache.get(result.strings);
    if (template === undefined) {
      templateCache.set(result.strings, (template = new Template(result)));
    }

    if (
      this.#committedValue instanceof TemplateInstance &&
      this.#committedValue.template === template
    ) {
      // The existing TemplateInstance and the new TemplateResult are for the
      // same template, so we can just update the existing instance.
      this.#committedValue.update(values);
    } else {
      // The existing TemplateInstance is not for the same template, so we
      // need to create a new TemplateInstance and commit it.
      const {instance, fragment} = template.clone();
      instance.update(values);
      this.#commitNode(fragment);
      this.#committedValue = instance;
    }
  }

  #commitIterable(value: Iterable<unknown>): void {
    // For an Iterable, we create a new InstancePart per item, then set its
    // value to the item. This is a little bit of overhead for every item in
    // an Iterable, but it lets us recurse easily and efficiently update Arrays
    // of TemplateResults that will be commonly returned from expressions like:
    // array.map((i) => html`${i}`), by reusing existing TemplateInstances.

    // If value is an array, then the previous render was of an
    // iterable and value will contain the ChildParts from the previous
    // render. If value is not an array, clear this part and make a new
    // array for ChildParts.
    if (!Array.isArray(this.#committedValue)) {
      this.#committedValue = [];
      this.#clear();
    }

    // Lets us keep track of how many items we stamped so we can clear leftover
    // items from a previous render
    const itemParts = this.#committedValue as ChildPart[];
    let partIndex = 0;
    let itemPart: ChildPart | undefined;

    for (const item of value) {
      if (partIndex === itemParts.length) {
        // If no existing part, create a new one
        // TODO (justinfagnani): test perf impact of always creating two parts
        // instead of sharing parts between nodes
        // https://github.com/lit/lit/issues/1266
        itemParts.push(
          (itemPart = new ChildPart(
            this.#insert(createMarker()),
            this.#insert(createMarker())
          ))
        );
      } else {
        // Reuse an existing part
        itemPart = itemParts[partIndex];
      }
      itemPart.setValue(item);
      partIndex++;
    }

    if (partIndex < itemParts.length) {
      // itemParts always have end nodes
      this.#clear(itemPart && itemPart.endNode!.nextSibling);
      // Truncate the parts array so _value reflects the current state
      itemParts.length = partIndex;
    }
  }

  /**
   * Removes the nodes contained within this Part from the DOM.
   *
   * @param start Start node to clear from, for clearing a subset of the part's
   *     DOM (used when truncating iterables)
   */
  #clear(start: ChildNode | null = this.startNode.nextSibling) {
    if (
      this.endNode !== null &&
      start?.parentNode !== this.endNode?.parentNode
    ) {
      throw new Error('Invalid ChildPart anchor nodes');
    }
    while (start !== this.endNode) {
      // The non-null assertion is safe because if startNode.nextSibling is
      // null, then endNode is also null, and we would not have entered this
      // loop.
      const n = start!.nextSibling;
      start!.remove();
      start = n;
    }
  }
}

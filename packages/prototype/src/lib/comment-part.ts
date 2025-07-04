import {TemplatePart} from './template-part.js';

// TODO: Make comment parts do something reasonable. Likely they should behave
// like MultiAttributeParts and have static strings and one or more bindings.
export class CommentPart extends TemplatePart {
  readonly node: Comment;

  constructor(node: Comment) {
    super();
    this.node = node;
  }

  override clone(node: Node): TemplatePart {
    return new CommentPart(node as Comment);
  }

  override setValue(value: unknown): void {
    value;
  }

  override setConnected(_connected: boolean): void {
    throw new Error('Not implemented: CommentPart.setConnected');
  }
}

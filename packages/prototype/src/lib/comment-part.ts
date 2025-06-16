import {TemplatePart} from './template-part.js';

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
}

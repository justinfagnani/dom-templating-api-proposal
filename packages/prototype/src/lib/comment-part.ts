import {TemplatePart} from './template-part.js';

export class CommentPart extends TemplatePart {
  override readonly type = TemplatePart.COMMENT_PART;
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

import {MultiAttributePart} from './attribute-part.js';
import type {TemplatePart} from './template-part.js';
import type {Template} from './template.js';

export class TemplateInstance {
  readonly template: Template;
  readonly parts: Array<TemplatePart>;

  constructor(template: Template, parts: Array<TemplatePart>) {
    this.template = template;
    this.parts = parts;
  }

  update(values: ReadonlyArray<unknown>) {
    let i = 0;
    for (const part of this.parts) {
      if (part instanceof MultiAttributePart) {
        const end = i + part.strings.length - 1;
        part.setValue(values.slice(i, end));
        i = end;
      } else {
        part.setValue(values[i]);
        i++;
      }
    }
  }
}

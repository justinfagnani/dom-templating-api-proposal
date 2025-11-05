import {ChildPart} from './child-part.js';
import type {TemplateResult} from './template-result.js';
import {createMarker} from './utils.js';

const rootParts = new WeakMap<Element | DocumentFragment, ChildPart>();

export const render = (
  result: TemplateResult,
  container: Element | DocumentFragment
) => {
  if (
    !(container instanceof Element || container instanceof DocumentFragment)
  ) {
    throw new Error('Container must be an Element or DocumentFragment');
  }

  let part = rootParts.get(container);
  if (part === undefined) {
    const startNode = createMarker();
    container.append(startNode);
    part = new ChildPart(startNode);
    rootParts.set(container, part);
  }

  part.setValue(result);
  return part;
};

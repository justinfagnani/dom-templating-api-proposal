import {SingleAttributePart} from './attribute-part.js';
import {noChange, nothing} from './sentinels.js';
import {TemplatePart} from './template-part.js';

type EventListenerWithOptions = EventListenerOrEventListenerObject &
  Partial<AddEventListenerOptions>;

export class EventPart extends SingleAttributePart {
  #committedValue: unknown = nothing;

  override setValue(newListener: unknown) {
    // newListener =
    //   resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
    if (newListener === noChange) {
      return;
    }
    newListener ??= nothing;
    const oldListener = this.#committedValue;

    // If the new value is nothing or any options change we have to remove the
    // part as a listener.
    const shouldRemoveListener =
      (newListener === nothing && oldListener !== nothing) ||
      (newListener as EventListenerWithOptions).capture !==
        (oldListener as EventListenerWithOptions).capture ||
      (newListener as EventListenerWithOptions).once !==
        (oldListener as EventListenerWithOptions).once ||
      (newListener as EventListenerWithOptions).passive !==
        (oldListener as EventListenerWithOptions).passive;

    // If the new value is not nothing and we removed the listener, we have
    // to add the part as a listener.
    const shouldAddListener =
      newListener !== nothing &&
      (oldListener === nothing || shouldRemoveListener);

    if (shouldRemoveListener) {
      this.element.removeEventListener(
        this.name,
        this,
        oldListener as EventListenerWithOptions
      );
    }

    if (shouldAddListener) {
      this.element.addEventListener(
        this.name,
        this,
        newListener as EventListenerWithOptions
      );
    }
    this.#committedValue = newListener;
  }

  handleEvent(event: Event) {
    let host = this.element;
    const rootNode = this.element.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      host = rootNode.host;
    }
    if (typeof this.#committedValue === 'function') {
      this.#committedValue.call(host, event);
    } else {
      (this.#committedValue as EventListenerObject).handleEvent(event);
    }
  }

  override clone(node: Node): TemplatePart {
    return new EventPart(node as Element, this.name);
  }
}

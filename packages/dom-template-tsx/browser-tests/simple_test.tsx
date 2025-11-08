import {assert} from 'chai';
import * as DOMTemplate from '../../dom-templating-prototype/index.js';
import {render} from '../../dom-templating-prototype/index.js';

declare global {
  namespace JSX {
    // Helper types for extracting attribute/event names from prefixed keys
    type AttributeKey<K> = K extends `attr:${infer Name}` ? Name : never;
    type EventKey<K> = K extends `on:${infer Name}` ? Name : never;

    // Map event names to their handler types
    type EventHandlers = {
      [K in keyof HTMLElementEventMap as `on:${K}`]?: (event: HTMLElementEventMap[K]) => void;
    };

    // Specific typed attributes with known values
    type TypedAttributes = {
      'attr:dir'?: 'ltr' | 'rtl' | 'auto';
      // Add more typed attributes here as needed
    };

    // Attributes are an open set, it's legal to set any attribute on any
    // element. Use a separate type for the catch-all to avoid conflicts.
    type ArbitraryAttributes = {
      [key: `attr:${string}`]: string | number | boolean;
    };

    type HTMLAttributes = TypedAttributes & ArbitraryAttributes;

    // Base element type supporting all three binding modes
    type ElementAttributes = HTMLAttributes & EventHandlers;

    type IntrinsicElements = {
      [K in keyof HTMLElementTagNameMap]: Partial<HTMLElementTagNameMap[K]> & ElementAttributes;
    };
  }
}

/**
 * Strips expression comments from provided html string.
 */
const stripExpressionComments = (html: string) =>
  html.replace(/<!--\?node-part-->|<!--\??-->/g, '');

suite('Browser Transform Tests', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
  });

  test('simple div', () => {
    const result = <div></div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div></div>');
  });

  test('div with text content', () => {
    const result = <div>Hello World</div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div>Hello World</div>');
  });

  test('div with expression', () => {
    const name = 'Test';
    const result = <div>{name}</div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div>Test</div>');
  });

  test('nested elements', () => {
    const result = <div><span>Nested</span></div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div><span>Nested</span></div>');
  });

  test('property binding', () => {
    const value = 'test-value';
    // textContent is a property that doesn't map to an attribute
    const result = <div textContent={value}></div>;
    render(result, container);
    // Check that the property was set on the element
    const div = container.querySelector('div');
    assert.equal(div?.textContent, 'test-value');
  });

  test('attribute binding', () => {
    const id = 'my-id';
    const result = <div attr:id={id}></div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div id="my-id"></div>');
  });

  test('event binding', () => {
    let clicked = false;
    const handler = () => { clicked = true; };
    const result = <button on:click={handler}>Click</button>;
    render(result, container);
    const button = container.querySelector('button');
    button?.click();
    assert.isTrue(clicked, 'Event handler should be called');
  });

  test('conditional rendering', () => {
    let show = true;
    let result = <div>{show ? <span>Yes</span> : <span>No</span>}</div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div><span>Yes</span></div>');
    show = false;
    result = <div>{show ? <span>Yes</span> : <span>No</span>}</div>;
    render(result, container);
    assert.equal(stripExpressionComments(container.innerHTML), '<div><span>No</span></div>');
  });

  suite('Type System Showcase', () => {
    test('property bindings accept arbitrary properties', () => {
      // These should all type-check because property bindings allow any property
      // Using tabIndex (real property that doesn't exist as attribute on div)
      const el = <div tabIndex={0} textContent="content"></div>;
      render(el, container);
      const div = container.querySelector('div');
      assert.equal(div?.tabIndex, 0);
      assert.equal(div?.textContent, 'content');
    });

    test('attribute bindings are type-checked', () => {
      // Known attributes get proper types
      const el1 = <div attr:id="test-id" attr:class="my-class"></div>;
      render(el1, container);
      assert.equal(container.querySelector('div')?.id, 'test-id');

      // Dir attribute has literal type
      const el2 = <div attr:dir="ltr"></div>;
      render(el2, container);

      // Data attributes are supported
      const el3 = <div attr:data-testid="my-test"></div>;
      render(el3, container);

      // @ts-expect-error - "invalid" is not a valid dir value
      const bad = <div attr:dir="invalid"></div>;
    });

    test('event bindings are type-checked', () => {
      let clicked = false;
      let mousePos = {x: 0, y: 0};

      // Click event gets proper MouseEvent type
      const el1 = <button on:click={(e) => {
        clicked = true;
        // e is typed as MouseEvent, so we can access clientX/clientY
        mousePos = {x: e.clientX, y: e.clientY};
      }}>Click me</button>;
      render(el1, container);

      // Input event gets proper Event type
      const el2 = <input on:input={(e) => {
        // e is typed as Event
        const target = e.target as HTMLInputElement;
        console.log(target.value);
      }} />;
      render(el2, container);

      // @ts-expect-error - click handler should receive MouseEvent, not KeyboardEvent
      const bad = <button on:click={(e: KeyboardEvent) => { }}></button>;
    });

    test('element-specific attributes', () => {
      // Button gets its specific attributes
      const btn = <button type="submit" disabled={true}>Submit</button>;
      render(btn, container);
      const button = container.querySelector('button');
      assert.equal(button?.type, 'submit');
      assert.equal(button?.disabled, true);

      // Input gets its specific attributes
      const input = <input type="text" value="test" placeholder="Enter text" />;
      render(input, container);

      // @ts-expect-error - "invalid" is not a valid button type
      const bad = <button type="invalid"></button>;
    });

    test('mixing all three binding modes', () => {
      let clicked = false;

      const el = <button
        tabIndex={-1}                     // property binding (real property)
        attr:id="my-button"               // attribute binding
        attr:class="btn primary"          // attribute binding
        attr:data-testid="submit-btn"    // attribute binding
        on:click={() => clicked = true}   // event binding
        disabled={false}                  // property binding
      >
        Submit
      </button>;

      render(el, container);
      const button = container.querySelector('button');

      assert.equal(button?.id, 'my-button');
      assert.equal(button?.tabIndex, -1);
      assert.equal(button?.disabled, false);
      button?.click();
      assert.isTrue(clicked);
    });

    test('type errors are caught at compile time', () => {
      // Invalid button type literal
      // @ts-expect-error - "invalid" is not a valid button type
      const bad1 = <button type="invalid"></button>;

      // Wrong event handler type
      // @ts-expect-error - click handler should receive MouseEvent, not KeyboardEvent
      const bad2 = <button on:click={(e: KeyboardEvent) => {}}></button>;

      // Wrong property type
      // @ts-expect-error - disabled should be boolean, not string
      const bad3 = <button disabled="yes"></button>;

      // Non-existent event
      // @ts-expect-error - "fakeevent" is not a valid event name
      const bad4 = <div on:fakeevent={() => {}}></div>;

      // Invalid dir value
      // @ts-expect-error - "invalid-dir" is not a valid dir value
      const bad5 = <div attr:dir="invalid-dir"></div>;

      // Hyphenated attributes (including data-*) don't enforce the type restriction
      // due to TypeScript's handling of hyphenated JSX properties
      const hyphenatedOk1 = <div attr:data-value={{nested: true}}></div>;
      const hyphenatedOk2 = <div attr:custom-prop={{nested: true}}></div>;

      // But non-hyphenated attribute names DO error with objects!
      // @ts-expect-error - objects not allowed in attr: bindings
      const bad6 = <div attr:customprop={{nested: true}}></div>;

      // Verify the bad ones are used to avoid unused variable warnings
      render(bad1, container);
      render(bad2, container);
      render(bad3, container);
      render(bad4, container);
      render(bad5, container);
      render(bad6, container);
    });
  });
});

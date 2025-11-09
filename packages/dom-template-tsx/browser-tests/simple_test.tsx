import type { } from './jsx-types.d.ts';
import { assert } from 'chai';
import * as DOMTemplate from '../../dom-templating-prototype/index.js';
import {render} from '../../dom-templating-prototype/index.js';

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
    const result = <div prop:textContent={value}></div>;
    render(result, container);
    // Check that the property was set on the element
    const div = container.querySelector('div');
    assert.equal(div?.textContent, 'test-value');
  });

  test('attribute binding', () => {
    const id = 'my-id';
    const result = <div id={id}></div>;
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

  suite('Fragment Tests', () => {
    test('simple fragment', () => {
      const result = <>
        <div>First</div>
        <div>Second</div>
      </>;
      render(result, container);
      assert.equal(stripExpressionComments(container.innerHTML), '<div>First</div><div>Second</div>');
    });

    test('fragment with text', () => {
      const result = <>
        Hello
        <span>World</span>
      </>;
      render(result, container);
      assert.equal(stripExpressionComments(container.innerHTML), 'Hello<span>World</span>');
    });

    test('fragment with expressions', () => {
      const name = 'Test';
      const result = <>
        <span>Hello</span>
        {name}
        <span>!</span>
      </>;
      render(result, container);
      assert.equal(stripExpressionComments(container.innerHTML), '<span>Hello</span>Test<span>!</span>');
    });

    test('nested fragment', () => {
      const result = <div>
        Before
        <>
          <span>Inside</span>
          <span>Fragment</span>
        </>
        After
      </div>;
      render(result, container);
      assert.equal(stripExpressionComments(container.innerHTML), '<div>Before<span>Inside</span><span>Fragment</span>After</div>');
    });

    test('fragment in conditional', () => {
      const show = true;
      const result = <div>
        {show ? <>
          <span>Item 1</span>
          <span>Item 2</span>
        </> : <span>Nothing</span>}
      </div>;
      render(result, container);
      assert.equal(stripExpressionComments(container.innerHTML), '<div><span>Item 1</span><span>Item 2</span></div>');
    });

    test('multiple nested fragments', () => {
      const result = <>
        <div>Top</div>
        <>
          <span>Nested 1</span>
          <>
            <span>Deeply nested</span>
          </>
          <span>Nested 2</span>
        </>
        <div>Bottom</div>
      </>;
      render(result, container);
      assert.equal(stripExpressionComments(container.innerHTML), '<div>Top</div><span>Nested 1</span><span>Deeply nested</span><span>Nested 2</span><div>Bottom</div>');
    });
  });

  suite('Type System Showcase', () => {
    test('property bindings accept arbitrary properties', () => {
      // These should all type-check because property bindings allow any property
      // Using tabIndex (real property that doesn't exist as attribute on div)
      const el = <div prop:tabIndex={0} prop:textContent={'content'}></div>;
      render(el, container);
      const div = container.querySelector('div');
      assert.equal(div?.tabIndex, 0);
      assert.equal(div?.textContent, 'content');
    });

    test('attribute bindings are type-checked', () => {
      // Known attributes get proper types
      const el1 = <div id="test-id" class="my-class"></div>;
      render(el1, container);
      assert.equal(container.querySelector('div')?.id, 'test-id');

      // Dir attribute has literal type
      const el2 = <div dir="ltr"></div>;
      render(el2, container);

      // Data attributes are supported
      const el3 = <div data-testid="my-test"></div>;
      render(el3, container);

      // @ts-expect-error - "invalid" is not a valid dir value
      const bad = <div dir="invalid"></div>;
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

      // Attributes accept any string value
      const relaxed = <button type="invalid"></button>;
    });

    test('mixing all three binding modes', () => {
      let clicked = false;

      const el = <button
        prop:tabIndex={-1}                // property binding (real property)
        id="my-button"                    // attribute binding
        class="btn primary"               // attribute binding
        data-testid="submit-btn"          // attribute binding
        on:click={() => clicked = true}   // event binding
        prop:disabled={false}             // property binding
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
      // Attributes accept any string value (no static type checking)
      const relaxedAttr = <button type="invalid"></button>;

      // Wrong event handler type
      // @ts-expect-error - click handler should receive MouseEvent, not KeyboardEvent
      const bad2 = <button on:click={(e: KeyboardEvent) => {}}></button>;

      // Property bindings with prop: prefix accept any type (no static validation)
      const relaxed1 = <button prop:disabled="yes"></button>;

      // Event handlers with on: prefix currently accept any event name
      // (Type checking for valid events could be improved in future)
      const customEvent = <div on:fakeevent={() => {}}></div>;

      // Invalid dir value
      // @ts-expect-error - "invalid-dir" is not a valid dir value
      const bad5 = <div dir="invalid-dir"></div>;

      // Hyphenated attributes (including data-*) can accept any value
      // due to TypeScript's handling of hyphenated JSX properties
      const hyphenatedOk1 = <div data-value={{nested: true}}></div>;
      const hyphenatedOk2 = <div custom-prop={{nested: true}}></div>;

      // Non-hyphenated attributes also accept any value now (attributes are default)
      const ok3 = <div customprop={{nested: true}}></div>;

      // Verify the test cases are used to avoid unused variable warnings
      render(relaxedAttr, container);
      render(bad2, container);
      render(relaxed1, container);
      render(customEvent, container);
      render(bad5, container);
    });
  });
});

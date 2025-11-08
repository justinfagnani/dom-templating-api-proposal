import type { } from './jsx-types.d.ts';
import { assert } from 'chai';
import * as DOMTemplate from '../../dom-templating-prototype/index.js';
import {render} from '../../dom-templating-prototype/index.js';

// Custom element with various property types
class MyCounter extends HTMLElement {
  #count: number = 0;
  #label: string = '';
  #disabled: boolean = false;
  #callback?: (count: number) => void;

  get count(): number {
    return this.#count;
  }

  set count(value: number) {
    this.#count = value;
    if (this.isConnected) {
      this.render();
    }
  }

  get label(): string {
    return this.#label;
  }

  set label(value: string) {
    this.#label = value;
    if (this.isConnected) {
      this.render();
    }
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  set disabled(value: boolean) {
    this.#disabled = value;
    if (this.isConnected) {
      this.render();
    }
  }

  get onCountChange(): ((count: number) => void) | undefined {
    return this.#callback;
  }

  set onCountChange(callback: ((count: number) => void) | undefined) {
    this.#callback = callback;
  }

  connectedCallback() {
    this.render();
  }

  increment() {
    this.count++;
    this.#callback?.(this.count);
    this.dispatchEvent(new CustomEvent('count-changed', {
      detail: {count: this.count},
      bubbles: true,
    }));
  }

  private render() {
    this.innerHTML = `
      <div class="counter">
        <span class="label">${this.label || 'Count'}</span>:
        <span class="value">${this.count}</span>
        <button ${this.disabled ? 'disabled' : ''}>Increment</button>
      </div>
    `;

    const button = this.querySelector('button');
    button?.addEventListener('click', () => this.increment());
  }
}

// Custom element with typed attributes
class MyBadge extends HTMLElement {
  static observedAttributes = ['variant', 'size', 'text'];

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    const variant = this.getAttribute('variant') || 'default';
    const size = this.getAttribute('size') || 'medium';
    const text = this.getAttribute('text') || '';

    this.innerHTML = `
      <span class="badge badge-${variant} badge-${size}">${text}</span>
    `;
  }
}

// Custom element that accepts complex data
class MyDataGrid extends HTMLElement {
  #data: Array<{id: string, name: string}> = [];
  #columns: string[] = [];

  get data(): Array<{id: string, name: string}> {
    return this.#data;
  }

  set data(value: Array<{id: string, name: string}>) {
    this.#data = value;
    this.render();
  }

  get columns(): string[] {
    return this.#columns;
  }

  set columns(value: string[]) {
    this.#columns = value;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    if (this.columns.length === 0 || this.data.length === 0) {
      this.innerHTML = '<div class="empty">No data</div>';
      return;
    }

    this.innerHTML = `
      <table>
        <thead>
          <tr>${this.columns.map(col => `<th>${col}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${this.data.map(row =>
            `<tr>${this.columns.map(col =>
              `<td>${row[col as keyof typeof row] || ''}</td>`
            ).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    `;
  }
}

// Register custom elements
customElements.define('my-counter', MyCounter);
customElements.define('my-badge', MyBadge);
customElements.define('my-data-grid', MyDataGrid);

// Extend standard DOM types with our custom elements
declare global {
  interface HTMLElementTagNameMap {
    'my-counter': MyCounter;
    'my-badge': MyBadge;
    'my-data-grid': MyDataGrid;
  }

  // Custom event types for our elements
  interface HTMLElementEventMap {
    'count-changed': CustomEvent<{count: number}>;
  }
}

suite('Custom Element Tests', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  teardown(() => {
    container.remove();
  });

  suite('Property Bindings', () => {
    test('basic property binding on custom element', () => {
      const result = <my-counter count={5} label={'Items'}></my-counter>;
      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      // Properties should be set on the element
      assert.equal(counter.count, 5, `Expected count to be 5, got ${counter.count}`);
      assert.equal(counter.label, 'Items', `Expected label to be 'Items', got '${counter.label}'`);
      // Content should be rendered via connectedCallback
      assert.include(counter.innerHTML, 'Items', `Expected innerHTML to include 'Items', got: ${counter.innerHTML}`);
      assert.include(counter.innerHTML, '5');
    });

    test('boolean property binding', () => {
      const result = <my-counter count={0} disabled={true}></my-counter>;
      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      assert.equal(counter.disabled, true);

      const button = counter.querySelector('button');
      assert.equal(button?.disabled, true);
    });

    test('complex data property binding', () => {
      const data = [
        {id: '1', name: 'Alice'},
        {id: '2', name: 'Bob'},
      ];
      const columns = ['id', 'name'];

      const result = <my-data-grid data={data} columns={columns}></my-data-grid>;
      render(result, container);

      const grid = container.querySelector('my-data-grid');
      if (!grid) {
        assert.fail('my-data-grid element not found');
      }
      assert.deepEqual(grid.data, data);
      assert.deepEqual(grid.columns, columns);
      assert.include(grid.innerHTML, 'Alice');
      assert.include(grid.innerHTML, 'Bob');
    });

    test('function property binding', () => {
      let capturedCount = 0;
      const callback = (count: number) => {
        capturedCount = count;
      };

      const result = <my-counter count={0} onCountChange={callback}></my-counter>;
      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      counter.increment();

      assert.equal(capturedCount, 1);
      assert.equal(counter.count, 1);
    });

    test('updating properties reactively', () => {
      let count = 0;
      const result1 = <my-counter count={count}></my-counter>;
      render(result1, container);

      let counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      assert.equal(counter.count, 0);

      count = 10;
      const result2 = <my-counter count={count}></my-counter>;
      render(result2, container);

      counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found after re-render');
      }
      assert.equal(counter.count, 10);
    });
  });

  suite('Attribute Bindings', () => {
    test('basic attribute binding on custom element', () => {
      const variant = 'primary';
      const result = <my-badge attr:variant={variant} attr:text="New"></my-badge>;
      render(result, container);

      const badge = container.querySelector('my-badge');
      if (!badge) {
        assert.fail('my-badge element not found');
      }
      assert.equal(badge.getAttribute('variant'), 'primary');
      assert.equal(badge.getAttribute('text'), 'New');
      assert.include(badge.innerHTML, 'badge-primary');
      assert.include(badge.innerHTML, 'New');
    });

    test('typed attribute binding', () => {
      // These should all type-check because we added variant and size to TypedAttributes
      const result = <my-badge
        attr:variant="success"
        attr:size="large"
        attr:text="Complete"
      ></my-badge>;
      render(result, container);

      const badge = container.querySelector('my-badge');
      if (!badge) {
        assert.fail('my-badge element not found');
      }
      assert.equal(badge.getAttribute('variant'), 'success');
      assert.equal(badge.getAttribute('size'), 'large');
      assert.include(badge.innerHTML, 'badge-success');
      assert.include(badge.innerHTML, 'badge-large');
    });

    test('arbitrary attribute binding', () => {
      const result = <my-badge
        attr:data-testid="my-badge"
        attr:aria-label="Status badge"
        attr:text="Info"
      ></my-badge>;
      render(result, container);

      const badge = container.querySelector('my-badge');
      if (!badge) {
        assert.fail('my-badge element not found');
      }
      assert.equal(badge.getAttribute('data-testid'), 'my-badge');
      assert.equal(badge.getAttribute('aria-label'), 'Status badge');
    });

    test('numeric attribute binding', () => {
      const count = 42;
      const result = <my-badge attr:text={count}></my-badge>;
      render(result, container);

      const badge = container.querySelector('my-badge');
      if (!badge) {
        assert.fail('my-badge element not found');
      }

      assert.equal(badge.getAttribute('text'), '42');
      assert.include(badge.innerHTML, '42');
    });
  });

  suite('Event Bindings', () => {
    test('custom event binding', () => {
      let eventFired = false;
      let eventDetail: {count: number} | undefined;

      const handler = (e: CustomEvent<{count: number}>) => {
        eventFired = true;
        eventDetail = e.detail;
      };

      const result = <my-counter count={5} on:count-changed={handler}></my-counter>;
      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      counter.increment();

      assert.isTrue(eventFired);
      assert.deepEqual(eventDetail, {count: 6});
    });

    test('standard event binding on custom element', () => {
      let clicked = false;

      const result = <my-counter
        count={0}
        on:click={() => clicked = true}
      ></my-counter>;
      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      counter.click();

      assert.isTrue(clicked);
    });

    test('event bubbling from custom element', () => {
      let bubbledCount: number | undefined;

      const handler = (e: CustomEvent<{count: number}>) => {
        bubbledCount = e.detail.count;
      };

      container.addEventListener('count-changed', handler);

      const result = <my-counter count={0}></my-counter>;
      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      counter.increment();

      assert.equal(bubbledCount, 1);

      container.removeEventListener('count-changed', handler);
    });
  });

  suite('Mixed Bindings', () => {
    test('combining property, attribute, and event bindings', () => {
      let eventCount = 0;
      const callback = (count: number) => {
        eventCount = count;
      };

      const result = <my-counter
        count={5}                                    // property binding
        label={'Score'}                              // property binding
        disabled={false}                             // property binding
        onCountChange={callback}                     // property binding (function)
        attr:data-testid="score-counter"            // attribute binding
        attr:class="game-counter"                    // attribute binding
        on:count-changed={(e) => {                   // event binding
          assert.equal(e.detail.count, 6);
        }}
      ></my-counter>;

      render(result, container);

      const counter = container.querySelector('my-counter');
      if (!counter) {
        assert.fail('my-counter element not found');
      }
      assert.equal(counter.count, 5);
      assert.equal(counter.label, 'Score');
      assert.equal(counter.disabled, false);
      assert.equal(counter.getAttribute('data-testid'), 'score-counter');
      assert.equal(counter.getAttribute('class'), 'game-counter');

      counter.increment();

      assert.equal(eventCount, 6);
      assert.equal(counter.count, 6);
    });

    test('nested custom elements', () => {
      const result = (
        <div>
          <my-counter count={1} label={'First'}></my-counter>
          <my-badge attr:variant="primary" attr:text="Badge"></my-badge>
          <my-counter count={2} label={'Second'}></my-counter>
        </div>
      );
      render(result, container);

      // Verify multiple instances of custom elements can be rendered
      const counters = container.querySelectorAll('my-counter');
      assert.equal(counters.length, 2, 'Should have two counter elements');

      // Verify the first counter works
      assert.include(counters[0].innerHTML, 'First');
      assert.include(counters[0].innerHTML, '1');

      // Verify the badge works
      const badge = container.querySelector('my-badge');
      assert.isNotNull(badge);
      assert.include(badge!.innerHTML, 'Badge');
    });

    test('custom elements in expressions', () => {
      const items = [
        {label: 'Alpha', count: 1},
        {label: 'Beta', count: 2},
        {label: 'Gamma', count: 3},
      ];

      const result = (
        <div>
          {items.map(item => (
            <my-counter count={item.count} label={item.label}></my-counter>
          ))}
        </div>
      );
      render(result, container);

      const counters = container.querySelectorAll('my-counter');
      assert.equal(counters.length, 3);
      assert.equal(counters[0].label, 'Alpha');
      assert.equal(counters[1].label, 'Beta');
      assert.equal(counters[2].label, 'Gamma');
    });
  });

  suite('Type System for Custom Elements', () => {
    test('property bindings are type-checked', () => {
      // Valid: count is a number property
      const good1 = <my-counter count={5}></my-counter>;
      render(good1, container);

      // Valid: label is a string property
      const good2 = <my-counter label="Test"></my-counter>;
      render(good2, container);

      // @ts-expect-error - count should be number, not string
      const bad1 = <my-counter count="five"></my-counter>;

      // @ts-expect-error - disabled should be boolean, not string
      const bad2 = <my-counter disabled="true"></my-counter>;

      render(bad1, container);
      render(bad2, container);
    });

    test('attribute bindings with typed values', () => {
      // Valid: variant is one of the allowed literal types
      const good1 = <my-badge attr:variant="primary"></my-badge>;
      const good2 = <my-badge attr:variant="success"></my-badge>;
      const good3 = <my-badge attr:size="large"></my-badge>;

      render(good1, container);
      render(good2, container);
      render(good3, container);

      // @ts-expect-error - "invalid" is not a valid variant
      const bad1 = <my-badge attr:variant="invalid"></my-badge>;

      // @ts-expect-error - "huge" is not a valid size
      const bad2 = <my-badge attr:size="huge"></my-badge>;

      render(bad1, container);
      render(bad2, container);
    });

    test('custom event handlers are type-checked', () => {
      // Valid: handler receives correct event type with explicit annotation
      const good = <my-counter on:count-changed={(e) => {
        // e.detail.count is correctly typed as number
        const count: number = e.detail.count;
        assert.isNumber(count);
      }}></my-counter>;
      render(good, container);

      // TypeScript can also infer the correct event type
      const good2 = <my-counter on:count-changed={(e) => {
        // No type annotation needed - TypeScript infers e.detail.count is number
        const inferredCount = e.detail.count;
        assert.isNumber(inferredCount);
      }}></my-counter>;
      render(good2, container);
    });

    test('complex property types', () => {
      // Valid: data is an array of objects with id and name
      const validData = [
        {id: '1', name: 'Alice'},
        {id: '2', name: 'Bob'},
      ];
      const good = <my-data-grid data={validData} columns={['id', 'name']}></my-data-grid>;
      render(good, container);

      // TypeScript accepts the correctly-typed data
      const grid = container.querySelector('my-data-grid');
      if (!grid) {
        assert.fail('my-data-grid element not found');
      }
      assert.deepEqual(grid.data, validData);
    });
  });
});

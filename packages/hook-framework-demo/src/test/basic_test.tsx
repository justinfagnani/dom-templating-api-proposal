import {assert} from 'chai';
import {render} from 'dom-templating-prototype';
import type {TemplateResult} from 'dom-templating-prototype/lib/template-result.js';
import {useState} from '../index.js';
import type {} from './jsx-types.js';

// @ts-expect-error: required for the JSX transformer
import * as DOMTemplate from 'dom-templating-prototype';

/**
 * Strips expression comments from provided html string.
 */
const stripExpressionComments = (html: string) =>
  html.replace(/<!--\?node-part-->|<!--\??-->/g, '');

suite('Component System - Basic Tests', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
  });

  suite('Basic TSX rendering (no components)', () => {
    test('renders simple div', () => {
      const result = <div>Hello</div>;
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Hello</div>'
      );
    });

    test('renders with expression', () => {
      const name = 'World';
      const result = <div>Hello {name}</div>;
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Hello World</div>'
      );
    });

    test('renders nested elements', () => {
      const result = (
        <div>
          <h1>Title</h1>
          <p>Content</p>
        </div>
      );
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div><h1>Title</h1><p>Content</p></div>'
      );
    });

    test('handles property bindings', () => {
      const value = 'test-value';
      const result = <div textContent={value}></div>;
      render(result, container);
      const div = container.querySelector('div');
      assert.equal(div?.textContent, 'test-value');
    });

    test('handles event bindings', () => {
      let clicked = false;
      const handler = () => {
        clicked = true;
      };
      const result = <button on:click={handler}>Click</button>;
      render(result, container);
      const button = container.querySelector('button');
      button?.click();
      assert.isTrue(clicked);
    });

    test('handles conditional rendering', () => {
      const show = true;
      const result = (
        <div>{show ? <span>Visible</span> : <span>Hidden</span>}</div>
      );
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div><span>Visible</span></div>'
      );
    });

    test('handles array mapping', () => {
      const items = ['a', 'b', 'c'];
      const result = (
        <ul>
          {items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
      );
      render(result, container);
      const listItems = container.querySelectorAll('li');
      assert.equal(listItems.length, 3);
      assert.equal(listItems[0]?.textContent, 'a');
      assert.equal(listItems[1]?.textContent, 'b');
      assert.equal(listItems[2]?.textContent, 'c');
    });
  });

  suite('Minimal components (no state)', () => {
    test('renders a component that returns a simple template', () => {
      function Hello() {
        return <div>Hello from component</div>;
      }

      const result = <Hello />;
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Hello from component</div>'
      );
    });

    test('renders a component multiple times', () => {
      function Greeting() {
        return <span>Hi</span>;
      }

      const result = (
        <div>
          <Greeting />
          <Greeting />
        </div>
      );
      render(result, container);
      const spans = container.querySelectorAll('span');
      assert.equal(spans.length, 2);
      assert.equal(spans[0]?.textContent, 'Hi');
      assert.equal(spans[1]?.textContent, 'Hi');
    });
  });

  suite('Components with props', () => {
    test('renders component with single prop', () => {
      function Welcome(props?: {name?: string}) {
        return <div>Hello {props?.name}</div>;
      }

      const result = <Welcome name="Alice" />;
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Hello Alice</div>'
      );
    });

    test('renders component with multiple props', () => {
      function UserCard(props?: {name?: string; age?: number}) {
        return (
          <div>
            <span>{props?.name}</span>, {props?.age} years old
          </div>
        );
      }

      const result = <UserCard name="Bob" age={30} />;
      render(result, container);
      const span = container.querySelector('span');
      assert.equal(span?.textContent, 'Bob');
      assert.include(container.textContent, '30 years old');
    });

    test('updates when props change', () => {
      function Counter(props?: {count?: number}) {
        return <div>Count: {props?.count}</div>;
      }

      const result1 = <Counter count={0} />;
      render(result1, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Count: 0</div>'
      );

      const result2 = <Counter count={5} />;
      render(result2, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Count: 5</div>'
      );
    });
  });

  suite('Components with useState', () => {
    test('renders component with useState', () => {
      function Counter() {
        const [count] = useState(0);
        return <div>Count: {count}</div>;
      }

      const result = <Counter />;
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Count: 0</div>'
      );
    });

    test('updates when state changes', async () => {
      let increment: (() => void) | undefined;

      function Counter() {
        const [count, setCount] = useState(0);
        increment = () => setCount(count + 1);
        return <div>Count: {count}</div>;
      }

      const result = <Counter />;
      render(result, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Count: 0</div>'
      );

      // Click to increment
      increment!();

      // Wait for re-render
      await new Promise((resolve) => setTimeout(resolve, 10));

      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>Count: 1</div>'
      );
    });

    test('component with multiple useState calls', async () => {
      let inc1: (() => void) | undefined;
      let inc2: (() => void) | undefined;

      function TwoCounters() {
        const [count1, setCount1] = useState(0);
        const [count2, setCount2] = useState(10);
        inc1 = () => setCount1(count1 + 1);
        inc2 = () => setCount2(count2 + 1);
        return (
          <div>
            <span>A: {count1}</span>
            <span>B: {count2}</span>
          </div>
        );
      }

      const result = <TwoCounters />;
      render(result, container);
      const spans = container.querySelectorAll('span');
      assert.equal(spans[0]?.textContent, 'A: 0');
      assert.equal(spans[1]?.textContent, 'B: 10');

      // Increment first counter
      inc1!();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const spans2 = container.querySelectorAll('span');
      assert.equal(spans2[0]?.textContent, 'A: 1');
      assert.equal(spans2[1]?.textContent, 'B: 10');

      // Increment second counter
      inc2!();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const spans3 = container.querySelectorAll('span');
      assert.equal(spans3[0]?.textContent, 'A: 1');
      assert.equal(spans3[1]?.textContent, 'B: 11');
    });
  });

  suite('Components with children', () => {
    test('renders component with children', () => {
      function Card(props?: {title?: string; children?: TemplateResult}) {
        return (
          <div>
            <h3>{props?.title}</h3>
            <div>{props?.children}</div>
          </div>
        );
      }

      const result = (
        <Card title="My Card">
          <p>Card content</p>
        </Card>
      );
      render(result, container);
      const h3 = container.querySelector('h3');
      const p = container.querySelector('p');
      assert.equal(h3?.textContent, 'My Card');
      assert.equal(p?.textContent, 'Card content');
    });
  });
});

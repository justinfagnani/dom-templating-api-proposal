import type {} from './jsx-types.d.ts';
import {assert} from 'chai';
import * as DOMTemplate from '../../dom-templating-prototype/index.js';
import {render} from '../../dom-templating-prototype/index.js';
import {component} from '../index.js';

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
      const result = <div><h1>Title</h1><p>Content</p></div>;
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

      const result = <div><Greeting /><Greeting /></div>;
      render(result, container);
      const spans = container.querySelectorAll('span');
      assert.equal(spans.length, 2);
      assert.equal(spans[0]?.textContent, 'Hi');
      assert.equal(spans[1]?.textContent, 'Hi');
    });
  });
});

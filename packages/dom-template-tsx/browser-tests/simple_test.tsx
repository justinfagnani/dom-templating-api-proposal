import {assert} from 'chai';
import * as DOMTemplate from '../../dom-templating-prototype/index.js';
import {render} from '../../dom-templating-prototype/index.js';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any;
    }
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
    const result = <div foo={value}></div>;
    render(result, container);
    // Check that the property was set on the element
    const div = container.querySelector('div');
    assert.equal((div as any).foo, 'test-value');
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
});

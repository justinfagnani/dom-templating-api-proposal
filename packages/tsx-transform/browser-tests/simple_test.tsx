import {assert} from 'chai';
import * as DOMTemplate from './dom-template-mock.js';

suite('Browser Transform Tests', () => {
  test('simple div', () => {
    const result = <div></div>;
    assert.equal(result, '<div></div>');
  });

  test('div with text content', () => {
    const result = <div>Hello World</div>;
    assert.equal(result, '<div>Hello World</div>');
  });

  test('div with expression', () => {
    const name = 'Test';
    const result = <div>{name}</div>;
    assert.equal(result, '<div>Test</div>');
  });

  test('nested elements', () => {
    const result = <div><span>Nested</span></div>;
    assert.equal(result, '<div><span>Nested</span></div>');
  });

  test('property binding', () => {
    const value = 'test-value';
    const result = <div foo={value}></div>;
    assert.equal(result, '<div .foo=test-value></div>');
  });

  test('attribute binding', () => {
    const id = 'my-id';
    const result = <div attr:id={id}></div>;
    assert.equal(result, '<div id=my-id></div>');
  });

  test('event binding', () => {
    const handler = () => {};
    const result = <button on:click={handler}>Click</button>;
    assert.include(result, '@click=');
    assert.include(result, 'Click');
  });

  test('conditional rendering', () => {
    const show = true;
    const result = <div>{show ? <span>Yes</span> : <span>No</span>}</div>;
    assert.equal(result, '<div><span>Yes</span></div>');
  });
});

import {describe, test} from 'node:test';
import assert from 'node:assert';
import {transformSource} from '../index.js';

describe('transformSource()', () => {
  test('adds a comment to empty source', () => {
    const input = '';
    const output = transformSource(input);
    assert.ok(output.includes('/* Transformed by tsx-transform */'));
  });

  test('adds a comment to source with code', () => {
    const input = 'const x = 42;';
    const output = transformSource(input);
    assert.ok(output.includes('/* Transformed by tsx-transform */'));
    assert.ok(output.includes('const x = 42'));
  });

  test('preserves original code', () => {
    const input = `function hello(name: string): string {
  return 'Hello, ' + name;
}`;
    const output = transformSource(input);
    assert.ok(output.includes('function hello'));
    assert.ok(output.includes("return 'Hello, ' + name"));
  });

  test('adds comment before existing code', () => {
    const input = 'const x = 1;';
    const output = transformSource(input);
    const commentIndex = output.indexOf('/* Transformed by tsx-transform */');
    const codeIndex = output.indexOf('const x');
    assert.ok(
      commentIndex < codeIndex,
      'Comment should appear before code'
    );
  });
});

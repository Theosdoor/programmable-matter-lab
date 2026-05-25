import assert from 'node:assert';
import { test } from 'node:test';
import { parseMultiset } from '../src/utils/multiset-parser.js';

test('parses comma-separated strings with quantities into counts map', () => {
  const result = parseMultiset('a:2,b:1,c');
  assert.strictEqual(result.get('a'), 2);
  assert.strictEqual(result.get('b'), 1);
  assert.strictEqual(result.get('c'), 1);
  assert.strictEqual(result.size, 3);
});

test('handles empty, null, or whitespace-only inputs gracefully', () => {
  const resultEmpty = parseMultiset('');
  assert.strictEqual(resultEmpty.size, 0);

  const resultSpaces = parseMultiset('   ');
  assert.strictEqual(resultSpaces.size, 0);

  const resultFalsy = parseMultiset(null);
  assert.strictEqual(resultFalsy.size, 0);
});

test('handles extra whitespaces around commas, colons, and names', () => {
  const result = parseMultiset('  a : 3 ,   b : 2 , c   ');
  assert.strictEqual(result.get('a'), 3);
  assert.strictEqual(result.get('b'), 2);
  assert.strictEqual(result.get('c'), 1);
  assert.strictEqual(result.size, 3);
});

test('aggregates counts for duplicate keys', () => {
  const result = parseMultiset('a:2, b:1, a:3, b:2');
  assert.strictEqual(result.get('a'), 5);
  assert.strictEqual(result.get('b'), 3);
  assert.strictEqual(result.size, 2);
});

test('ignores invalid, negative, zero, or non-numeric counts', () => {
  const result = parseMultiset('a:0, b:-3, c:invalid, d:4.5');
  assert.strictEqual(result.has('a'), false);
  assert.strictEqual(result.has('b'), false);
  assert.strictEqual(result.has('c'), false);
  // parseInt('4.5', 10) parses to 4
  assert.strictEqual(result.get('d'), 4);
  assert.strictEqual(result.size, 1);
});

test('ignores parts with empty names', () => {
  const result = parseMultiset(':3, , a:2');
  assert.strictEqual(result.get('a'), 2);
  assert.strictEqual(result.size, 1);
});

import assert from 'node:assert';
import { test } from 'node:test';
import { tools } from '../src/data/tools.js';

test('verifies tools metadata contains expected properties', () => {
  assert.strictEqual(tools.length, 3);
  assert.strictEqual(tools[0].id, 'membranes');
  assert.ok(tools[0].title);
  assert.ok(tools[0].description);
  assert.ok(tools[0].gradient);
  assert.ok(tools[0].iconName);
});

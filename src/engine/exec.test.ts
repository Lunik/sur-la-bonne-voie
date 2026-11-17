import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRepo, exec } from './index.ts';

test('exec rejects unknown commands without mutating state', () => {
  const state = emptyRepo();
  const before = structuredClone(state);
  const result = exec(state, 'git frobnicate');
  assert.equal(result.ok, false);
  assert.deepEqual(state, before);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fr } from './typography.ts';

test('non-breaking spaces before high punctuation and inside guillemets', () => {
  assert.equal(fr('Soft ou hard ? Oui : « commit » !'), 'Soft ou hard ? Oui : « commit » !');
  assert.equal(fr('HEAD~3 a:b'), 'HEAD~3 a:b', 'no space, nothing to do');
});

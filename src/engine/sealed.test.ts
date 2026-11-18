import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from './index.ts';
import { ok, refused } from './test-helpers.ts';

const sealed = (commands: string[]) => ({ ...build(commands), publicLocked: true });
const PUBLIC_FEATURE = ['commit', 'switch -c feature', 'commit', 'push', 'commit', 'switch main', 'commit', 'switch feature'];

test('publicLocked refuses rebasing cars already on origin', () => {
  assert.match(refused(sealed(PUBLIC_FEATURE), 'rebase main'), /B est déjà partie sur origin/);
  assert.equal(ok(sealed(PUBLIC_FEATURE), 'merge main').move, 'merge');
});

test('publicLocked refuses a reset that takes public cars off the track, not one that keeps them', () => {
  const state = sealed(['commit', 'commit', 'push', 'commit']);
  assert.match(refused(state, 'reset --hard A'), /B est déjà partie/);
  assert.match(refused(state, 'reset --soft A'), /B est déjà partie/);
  assert.equal(ok(state, 'reset --hard B').move, 'reset');
});

test('publicLocked refuses an interactive rebase over public cars and a force push', () => {
  assert.match(refused(sealed(['commit', 'commit', 'commit', 'push']), 'rebase -i A pick:C pick:B'), /déjà parties/);
  assert.match(refused(sealed(['commit', 'push', 'commit', '_coll']), 'push --force'), /déjà partie/);
});

test('without the flag, nothing changes', () => {
  assert.equal(ok(build(PUBLIC_FEATURE), 'rebase main').move, 'rebase');
});

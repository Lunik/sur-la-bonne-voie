import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, emptyRepo, sig } from './index.ts';
import { FORK, chain, ok, refused } from './test-helpers.ts';

const TEN = Array(10).fill('commit');

test('log lists the first-parent chain with branch and origin markers', () => {
  const { output, move } = ok(build(['commit', 'push', 'commit', 'branch f']), 'log');
  assert.deepEqual(output, ['B  (HEAD -> main, f)', 'A  (origin/main)']);
  assert.equal(move, null);
});

test('status reports pending cars and distance to origin', () => {
  const pending = ok(build(['commit', 'push', 'commit', 'commit', 'reset --soft HEAD~1']), 'status');
  assert.deepEqual(pending.output, [
    'On branch main',
    'Voitures dételées sur le quai : C',
    'Votre voie : 1 voiture(s) d’avance, 0 de retard sur origin/main',
  ]);
  assert.equal(pending.move, null);
  assert.deepEqual(ok(build(['commit', 'push']), 'status').output, ['On branch main', 'À jour avec origin/main']);
});

test('reflog output is capped by reflogLimit, storage is not', () => {
  const state = build(TEN);
  const { output } = ok(state, 'reflog');
  assert.equal(output.length, 8);
  assert.equal(output[0], 'main@{0}: J   (position actuelle)');
  assert.equal(ok(build(TEN, {}, emptyRepo({ reflogLimit: 3 })), 'reflog show main').output.length, 3);
  assert.equal(chain(ok(state, 'reset --hard main@{9}').state, 'main'), 'A');
});

test('help lists the commands allowed so far', () => {
  assert.match(ok(emptyRepo(), 'help').output[0], /^Commandes : commit · branch · merge/);
  assert.deepEqual(ok({ ...emptyRepo(), allowed: ['commit'] }, 'help').output, ['Commandes : commit · switch · log · show · status · reflog']);
});

test('gate refuses commands not yet taught', () => {
  const start = { ...build(FORK), allowed: ['commit'] };
  assert.match(refused(start, 'merge feature'), /git merge n’est pas encore au programme/);
  assert.match(refused(start, 'switch -c x'), /git branch n’est pas encore au programme/);
  assert.equal(ok(start, 'switch feature').state.head, 'feature');
  assert.equal(ok(start, 'log').ok, true);
});

test('sig compares boards in exact, raw and shape modes', () => {
  const state = ok(build([...FORK, 'switch feature']), 'rebase main').state;
  assert.equal(sig(state, ['feature', 'origin/main']), 'feature:A-B-E-C′-D′ | origin/main:∅');
  assert.equal(sig(state, ['feature'], 'raw'), 'feature:A-B-E-C-D');
  assert.equal(sig(state, ['feature'], 'shape'), 'feature:main-main-main-feature′-feature′');
  assert.equal(sig(ok(build(FORK), 'merge feature').state, ['main']), 'main:A-B-E-M(D)');
});

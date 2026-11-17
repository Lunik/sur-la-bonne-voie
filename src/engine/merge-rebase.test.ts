import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, orphans } from './index.ts';
import { FORK, chain, labels, ok, refused } from './test-helpers.ts';

test('merge of diverged tracks adds a junction car M', () => {
  const { state, output, move } = ok(build(FORK), 'merge feature');
  const tip = state.commits[state.branches.main];
  assert.equal(chain(state, 'main'), 'A-B-E-M');
  assert.equal(tip.kind, 'merge');
  assert.deepEqual(labels(state, tip.parents), ['E', 'D']);
  assert.match(output[0], /voiture de jonction M \(relie D\)/);
  assert.equal(move, 'merge');
});

test('merge fast-forwards when possible', () => {
  const start = build(['commit', 'switch -c f', 'commit', 'switch main']);
  const { state, move } = ok(start, 'merge f');
  assert.equal(state.branches.main, state.branches.f);
  assert.equal(move, 'merge');
});

test('merge of an included track is a no-op', () => {
  const { output, move } = ok(build(['commit', 'branch f']), 'merge f');
  assert.deepEqual(output, ['Already up to date.']);
  assert.equal(move, null);
});

test('merge refusals', () => {
  const start = build(FORK);
  assert.match(refused({ ...start, fastForwardOnly: true }, 'merge feature'), /Panne de la grue/);
  assert.match(refused(start, 'merge main'), /fusionner une voie avec elle-même/);
  assert.match(refused(start, 'merge nowhere'), /voie inconnue « nowhere »/);
  assert.match(refused(start, 'merge'), /précisez une voie/);
});

test('fast-forward still passes when merges are forbidden', () => {
  const start = build(['commit', 'switch -c f', 'commit', 'switch main']);
  assert.equal(ok({ ...start, fastForwardOnly: true }, 'merge f').move, 'merge');
});

test('rebase recreates the head track behind the target', () => {
  const { state, output, move } = ok(build([...FORK, 'switch feature']), 'rebase main');
  assert.equal(chain(state, 'feature'), 'A-B-E-C′-D′');
  assert.equal(chain(state, 'main'), 'A-B-E');
  assert.deepEqual(labels(state, orphans(state)), ['C', 'D']);
  assert.deepEqual(output, [
    'Successfully rebased refs/heads/feature · voitures recréées : C′, D′',
    '  (les anciennes C, D partent sur la voie de garage)',
  ]);
  assert.equal(move, 'rebase');
});

test('rebase keeps origin (livery) and cargo of recreated cars', () => {
  const { state } = ok(build([...FORK, 'switch feature'], { C: 'debug' }), 'rebase main');
  const recreated = state.commits[state.commits[state.branches.feature].parents[0]];
  assert.equal(recreated.label, 'C′');
  assert.equal(recreated.origin, 'feature');
  assert.equal(recreated.cargo, 'debug');
});

test('rebase onto an included track is a no-op', () => {
  const { output, move } = ok(build(['commit', 'switch -c f', 'commit']), 'rebase main');
  assert.deepEqual(output, ['Current branch f is up to date.']);
  assert.equal(move, null);
});

test('rebase fast-forwards when the head track has nothing of its own', () => {
  const { state, move } = ok(build(['commit', 'switch -c f', 'commit', 'switch main']), 'rebase f');
  assert.equal(state.branches.main, state.branches.f);
  assert.equal(move, 'rebase');
});

test('rebase drops junction cars', () => {
  const start = build([...FORK, 'merge feature', 'switch feature', 'commit', 'switch main']);
  assert.equal(chain(ok(start, 'rebase feature').state, 'main'), 'A-B-C-D-F-E′');
});

test('rebase refusals', () => {
  const start = build(FORK);
  assert.match(refused(start, 'rebase main'), /rebaser une voie sur elle-même/);
  assert.match(refused(start, 'rebase nowhere'), /voie inconnue/);
});

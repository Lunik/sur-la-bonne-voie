import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, orphans } from './index.ts';
import { FORK, TRI, chain, labels, ok, refused } from './test-helpers.ts';

const ABCD = ['commit', 'commit', 'commit', 'commit'];

test('cherry-pick copies a car, cargo and livery included', () => {
  const { state, output, move } = ok(build(TRI, { D: 'debug' }), 'cherry-pick d');
  const copy = state.commits[state.branches.main];
  assert.equal(chain(state, 'main'), 'A-B-D′');
  assert.equal(chain(state, 'feature'), 'A-B-C-D-E');
  assert.equal(copy.cargo, 'debug');
  assert.equal(copy.origin, 'feature');
  assert.deepEqual(output, ['[main D′] copie de la voiture D']);
  assert.equal(move, 'cherry-pick');
});

test('cherry-pick refusals', () => {
  const start = build(TRI);
  assert.match(refused(start, 'cherry-pick'), /précisez la voiture à copier/);
  assert.match(refused(start, 'cherry-pick Z'), /voiture « Z » introuvable/);
  assert.match(refused(start, 'cherry-pick B'), /déjà sur la voie main/);
  const merged = build([...FORK, 'merge feature', 'switch feature']);
  assert.match(refused(merged, 'cherry-pick M'), /voiture de jonction/);
});

test('reset --soft unhooks cars onto the platform; commit squashes them', () => {
  const reset = ok(build(ABCD, { C: 'bug' }), 'reset --soft HEAD~2');
  assert.equal(chain(reset.state, 'main'), 'A-B');
  assert.deepEqual(labels(reset.state, reset.state.pending), ['C', 'D']);
  assert.deepEqual(orphans(reset.state), []);
  assert.deepEqual(reset.output, ['HEAD is now at B', '  C, D dételées, en attente sur le quai (commit pour les souder)']);
  assert.equal(reset.move, 'reset');

  const squash = ok(reset.state, 'commit');
  const tip = squash.state.commits[squash.state.branches.main];
  assert.equal(chain(squash.state, 'main'), 'A-B-CD');
  assert.equal(tip.cargo, 'bug');
  assert.deepEqual(squash.state.pending, []);
  assert.deepEqual(squash.output, ['[main CD] 2 voitures soudées en une seule']);
});

test('reset without mode is --mixed and keeps cars on the platform', () => {
  const { state } = ok(build(ABCD), 'reset B');
  assert.deepEqual(labels(state, state.pending), ['C', 'D']);
});

test('reset --hard sends cars to the siding', () => {
  const { state, output } = ok(build(ABCD), 'reset --hard C^');
  assert.equal(chain(state, 'main'), 'A-B');
  assert.deepEqual(state.pending, []);
  assert.deepEqual(labels(state, orphans(state)), ['C', 'D']);
  assert.equal(output.at(-1), '  D, C partent sur la voie de garage');
});

test('reset --hard branch@{n} recovers cars from the reflog', () => {
  const broken = build(['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'reset --hard C']);
  assert.deepEqual(labels(broken, orphans(broken)), ['D', 'E']);
  for (const ref of ['feature@{1}', 'HEAD@{1}', 'E']) {
    const { state } = ok(broken, `reset --hard ${ref}`);
    assert.equal(chain(state, 'feature'), 'A-B-C-D-E');
    assert.deepEqual(orphans(state), []);
  }
});

test('reset onto the current car is a no-op', () => {
  const { output, move } = ok(build(ABCD), 'reset --hard HEAD');
  assert.deepEqual(output, ['HEAD is now at D']);
  assert.equal(move, null);
});

test('reset refusals', () => {
  assert.match(refused(build(ABCD), 'reset --hard HEAD~9'), /référence « HEAD~9 » introuvable/);
  assert.match(refused(build(ABCD), 'reset --hard Z'), /référence « Z » introuvable/);
});

test('revert adds an inverse car', () => {
  const { state, output, move } = ok(build(['commit', 'commit', 'commit']), 'revert b');
  const tip = state.commits[state.branches.main];
  assert.equal(chain(state, 'main'), 'A-B-C-↩B');
  assert.equal(tip.kind, 'revert');
  assert.deepEqual(output, ['[main ↩B] voiture inverse : annule l’effet de B']);
  assert.equal(move, 'revert');
});

test('revert refusals', () => {
  assert.match(refused(build(FORK), 'revert C'), /n’est pas sur la voie main/);
  assert.match(refused(build(['commit', 'revert A']), 'revert ↩A'), /ne s’inverse pas/);
  assert.match(refused(build(['commit']), 'revert'), /précisez la voiture à inverser/);
  assert.match(refused(build(['commit']), 'revert Q'), /voiture « Q » introuvable/);
});

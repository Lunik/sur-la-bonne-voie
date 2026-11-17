import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, emptyRepo } from './index.ts';
import { chain, ok, refused } from './test-helpers.ts';

test('commit adds the next lettered car on the head branch', () => {
  const { state, output, move } = ok(build(['commit']), 'commit');
  assert.equal(chain(state, 'main'), 'A-B');
  assert.deepEqual(state.order, ['main']);
  assert.deepEqual(output, ['[main B] nouvelle voiture accrochée']);
  assert.equal(move, 'commit');
});

test('commit loads the cargo declared for its label', () => {
  const state = build(['commit', 'commit'], { B: 'debug' });
  assert.equal(state.commits[state.branches.main].cargo, 'debug');
});

test('branch lays a track at the head car without moving HEAD', () => {
  const { state, move } = ok(build(['commit']), 'branch feature');
  assert.equal(state.branches.feature, state.branches.main);
  assert.equal(state.head, 'main');
  assert.deepEqual(state.order, ['main', 'feature']);
  assert.equal(move, 'branch');
});

test('branch refusals', () => {
  const one = build(['commit']);
  assert.match(refused(one, 'branch'), /donnez un nom/);
  assert.match(refused(one, 'branch main'), /existe déjà/);
  assert.match(refused(one, 'branch -bad'), /nom de voie invalide/);
  assert.match(refused(emptyRepo(), 'branch x'), /La voie main n’a encore aucune voiture/);
  assert.match(refused(build(['commit', 'branch a', 'branch b']), 'branch c'), /n’a que 3 voies/);
});

test('the track limit is configurable', () => {
  const base = emptyRepo({ maxBranches: 2 });
  assert.match(refused(build(['commit', 'branch a'], {}, base), 'branch b'), /n’a que 2 voies/);
});

test('switch -c and checkout -b create a track and drive HEAD there', () => {
  for (const flag of ['switch -c', 'checkout -b']) {
    const { state, output, move } = ok(build(['commit']), `${flag} feature`);
    assert.equal(state.head, 'feature');
    assert.equal(output.at(-1), "Switched to a new branch 'feature'");
    assert.equal(move, 'branch');
  }
});

test('switch changes track without counting as a move', () => {
  const start = build(['commit', 'branch feature']);
  const moved = ok(start, 'switch feature');
  assert.equal(moved.state.head, 'feature');
  assert.equal(moved.move, null);
  const same = ok(start, 'checkout main');
  assert.deepEqual(same.output, ["Already on 'main'"]);
  assert.equal(same.move, null);
});

test('switch refusals', () => {
  const start = build(['commit', 'push']);
  assert.match(refused(start, 'switch nowhere'), /voie inconnue « nowhere »/);
  assert.match(refused(start, 'switch'), /voie inconnue/);
  assert.match(refused(start, 'switch origin/main'), /quai distant se consulte/);
});

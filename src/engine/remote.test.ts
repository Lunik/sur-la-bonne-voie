import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, emptyRepo } from './index.ts';
import { chain, ok, refused } from './test-helpers.ts';

const DIVERGED = ['commit', 'commit', 'push', 'commit', '_coll'];

test('push sends the head track to origin', () => {
  const first = ok(build(['commit']), 'push');
  assert.equal(first.state.remote.main, first.state.branches.main);
  assert.deepEqual(first.output, ['To origin · main -> main · le train part !']);
  assert.equal(first.move, 'push');
  const again = ok(first.state, 'push');
  assert.deepEqual(again.output, ['Everything up-to-date']);
  assert.equal(again.move, null);
});

test('push is rejected when origin has cars we do not', () => {
  assert.match(refused(build(DIVERGED), 'push'), /\[rejected\]/);
});

test('push --force overwrites origin unless forbidden', () => {
  const forced = ok(build(DIVERGED), 'push --force');
  assert.equal(chain(forced.state, 'origin/main'), 'A-B-C');
  assert.equal(forced.output[0], '+ forced update · des voyageurs ont perdu leurs voitures !');
  assert.equal(ok(build(DIVERGED), 'push -f').move, 'push');
  assert.match(refused({ ...build(DIVERGED), forceForbidden: true }, 'push --force'), /push forcé est interdit/);
});

test('push of an empty track is refused', () => {
  assert.match(refused(emptyRepo(), 'push'), /aucune voiture/);
});

test('_coll pushes a colleague car to origin/main without counting as a move', () => {
  const { state, move } = ok(build(['commit', 'push']), '_coll');
  assert.equal(chain(state, 'origin/main'), 'A-B');
  assert.equal(state.commits[state.remote.main].origin, 'collègue');
  assert.equal(chain(state, 'main'), 'A');
  assert.equal(move, null);
  assert.match(refused(build(['commit']), '_coll'), /Aucun quai distant/);
});

test('pull --rebase replays local cars behind origin', () => {
  const { state, output, move } = ok(build(DIVERGED), 'pull --rebase');
  assert.equal(chain(state, 'main'), 'A-B-D-C′');
  assert.equal(output[0], 'From origin · origin/main récupéré');
  assert.equal(move, 'pull');
});

test('pull merges origin with a junction car', () => {
  const { state } = ok(build(DIVERGED), 'pull');
  assert.equal(chain(state, 'main'), 'A-B-C-M');
});

test('pull fast-forwards when behind', () => {
  const { state, move } = ok(build(['commit', 'push', '_coll']), 'pull');
  assert.equal(state.branches.main, state.remote.main);
  assert.equal(move, 'pull');
});

test('pull with nothing new is not a move', () => {
  assert.equal(ok(build(['commit', 'push']), 'pull').move, null);
  assert.equal(ok(build(['commit', 'push']), 'pull --rebase').move, null);
});

test('pull without a remote track is refused', () => {
  assert.match(refused(build(['commit']), 'pull'), /Aucun quai distant pour la voie main/);
});

test('fetch changes nothing', () => {
  const start = build(DIVERGED);
  const { state, move } = ok(start, 'fetch');
  assert.deepEqual(state, start);
  assert.equal(move, null);
});

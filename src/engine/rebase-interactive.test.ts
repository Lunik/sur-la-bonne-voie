import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, orphans, todoList } from './index.ts';
import { chain, labels, ok, refused } from './test-helpers.ts';

const WIP = ['commit', 'switch -c feature', 'commit', 'commit', 'commit', 'commit'];

test('todoList lists the cars to replay, oldest first', () => {
  const state = build(WIP);
  assert.deepEqual(todoList(state, 'main').map((c) => c.label), ['B', 'C', 'D', 'E']);
  assert.deepEqual(todoList(state, 'HEAD~2').map((c) => c.label), ['D', 'E']);
  assert.deepEqual(todoList(state, 'nowhere'), []);
});

test('pick, squash and drop rewrite the track; leading picks keep their car', () => {
  const state = build(WIP, { D: 'debug' });
  const { state: after, output, move } = ok(state, 'rebase -i main pick:B squash:C drop:D pick:E');
  assert.equal(move, 'rebase');
  assert.equal(chain(after, 'feature'), 'A-BC-E′');
  assert.deepEqual(output.slice(0, 4), ['pick B', 'squash C', 'drop D', 'pick E']);
  assert.deepEqual(labels(after, orphans(after)).sort(), ['B', 'C', 'D', 'E']);
  const kept = ok(state, 'rebase -i main pick:B pick:C drop:D pick:E').state;
  assert.equal(chain(kept, 'feature'), 'A-B-C-E′');
  assert.equal(kept.branches.feature !== state.branches.feature, true);
});

test('reordering recreates every car from the first change', () => {
  const after = ok(build(WIP), 'rebase -i main pick:B pick:D pick:C pick:E').state;
  assert.equal(chain(after, 'feature'), 'A-B-D′-C′-E′');
});

test('an untouched todo list moves nothing', () => {
  const r = ok(build(WIP), 'rebase -i main p:B p:C p:D p:E');
  assert.equal(r.move, null);
});

test('todo list errors: missing, unknown car, car twice or missing, squash first', () => {
  const state = build(WIP);
  assert.match(refused(state, 'rebase -i main'), /pick:B pick:C pick:D pick:E/);
  assert.match(refused(state, 'rebase -i main pick:B pick:C pick:D pick:Z'), /illisible/);
  assert.match(refused(state, 'rebase -i main pick:B pick:C pick:D'), /une seule fois/);
  assert.match(refused(state, 'rebase -i main pick:B pick:B pick:D pick:E'), /une seule fois/);
  assert.match(refused(state, 'rebase -i main drop:B squash:C pick:D pick:E'), /première voiture gardée/);
  assert.match(refused(build(['commit']), 'rebase -i main'), /Rien à réorganiser/);
});

test('a todo list may move the track onto another base', () => {
  const state = build(['commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'switch feature']);
  assert.equal(chain(ok(state, 'rebase -i main pick:B squash:C').state, 'feature'), 'A-D-BC');
});

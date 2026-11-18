import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../game/index.ts';
import { lastColumn, layout, livery, switchPath } from './layout.ts';

const labels = (s: ReturnType<typeof build>, cells: { id: string }[]) => cells.map((c) => s.commits[c.id].label);

test('a branch forks from the car it left', () => {
  const s = build(['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit']);
  const [main, feature] = layout(s);
  assert.deepEqual(labels(s, main.cells), ['A', 'B', 'E']);
  assert.deepEqual([main.fork, main.forkRow], [-1, -1]);
  assert.deepEqual(labels(s, feature.cells), ['C', 'D']);
  assert.deepEqual(feature.cells.map((c) => c.col), [2, 3]);
  assert.deepEqual([feature.fork, feature.forkRow], [1, 0]);
  assert.equal(livery(s, 'feature'), 1);
  assert.equal(lastColumn(s, layout(s), true), 3, 'loco after E on main');
});

test('an empty branch sits at its tip, even on the first car', () => {
  const s = build(['commit', 'branch fix']);
  const [, fix] = layout(s);
  assert.deepEqual([fix.cells.length, fix.fork, fix.forkRow], [0, 0, 0]);
});

test('the remote row appears only when its tip is not on a local row', () => {
  const synced = build(['commit', 'commit', 'push', 'commit']);
  assert.deepEqual(layout(synced).map((r) => r.name), ['main']);
  const colleague = build(['commit', 'commit', 'push', 'commit', '_coll']);
  const rows = layout(colleague);
  assert.deepEqual(rows.map((r) => [r.name, r.kind]), [['main', 'local'], ['origin/main', 'remote']]);
  assert.deepEqual(labels(colleague, rows[1].cells), ['D']);
  assert.equal(rows[1].fork, 1);
  assert.equal(livery(colleague, 'collègue'), 3);
});

test('tracks leaving the same car share one trunk', () => {
  const near = switchPath(10, 0, 50, 88);
  const far = switchPath(10, 0, 50, 176);
  const trunk = near.slice(0, near.indexOf('V') + 1);
  assert.ok(far.startsWith(trunk), `${far} should start with ${trunk}`);
});

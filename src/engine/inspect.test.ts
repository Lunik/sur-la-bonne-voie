import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, exec } from './index.ts';
import { FORK, ok, refused } from './test-helpers.ts';

test('log A..B lists the cars on B and not on A, newest first', () => {
  const fork = build(FORK);
  assert.deepEqual(ok(fork, 'log main..feature').output, ['D  (feature)', 'C']);
  assert.deepEqual(ok(fork, 'log feature..main').output, ['E  (HEAD -> main)']);
  assert.deepEqual(ok(fork, 'log main...feature').output, ['E  (HEAD -> main)', 'D  (feature)', 'C']);
  assert.deepEqual(ok(fork, 'log feature..feature').output, ['(aucune voiture)']);
  assert.match(refused(fork, 'log main..nowhere'), /introuvable/);
});

test('ids sort by number, not as strings: k10 comes after k9', () => {
  const long = build(['commit', 'switch -c feature', ...Array(11).fill('commit')]);
  assert.deepEqual(ok(long, 'log main..feature').output.slice(0, 2), ['L  (HEAD -> feature)', 'K']);
});

test('log takes a ref and filters merges', () => {
  const merged = build([...FORK, 'merge feature']);
  assert.deepEqual(ok(merged, 'log feature').output, ['D  (feature)', 'C', 'B', 'A']);
  assert.deepEqual(ok(merged, 'log --merges').output, ['M  (HEAD -> main)']);
  assert.deepEqual(ok(merged, 'log --no-merges').output, ['E', 'B', 'A']);
});

test('show describes one car: track, author, parent, cargo', () => {
  const state = build(['commit', 'push', '_coll', 'pull', 'commit'], { C: 'debug' });
  assert.deepEqual(ok(state, 'show C').output, ['voiture C · née sur main', 'Author: vous', 'accrochée derrière B', 'chargement : debug']);
  assert.deepEqual(ok(state, 'show B').output, ['voiture B · née sur origin', 'Author: le collègue', 'accrochée derrière A', 'chargement : rien à signaler']);
  const merged = build([...FORK, 'merge feature']);
  assert.equal(ok(merged, 'show HEAD').output[2], 'voiture de jonction : relie E et D');
});

test('the player cannot type scripted commands, the content can', () => {
  const pushed = build(['commit', 'push']);
  const typed = exec(pushed, '_coll', { internal: false });
  assert.ok(!typed.ok && /n’est pas une commande/.test(typed.error));
  assert.ok(exec(pushed, '_coll').ok);
});

test('_gc sweeps the siding and the reflog entries pointing to it', () => {
  const state = build(['commit', 'commit', 'commit', 'reset --hard A']);
  const { state: swept, output } = ok(state, '_gc');
  assert.deepEqual(output, ['Ramassage (git gc --prune=now) : B, C détruites, la voie de garage est vide.']);
  assert.deepEqual(Object.values(swept.commits).map((c) => c.label), ['A']);
  assert.deepEqual(swept.reflog.main.map((id) => swept.commits[id].label), ['A', 'A']);
  assert.match(refused(swept, 'cherry-pick C'), /introuvable/);
  assert.equal(ok(swept, '_gc').output[0], 'Ramassage (git gc --prune=now) : voie de garage déjà vide.');
});

test('branch names may hold a slash, never the origin/ prefix', () => {
  const one = build(['commit']);
  assert.equal(ok(one, 'switch -c hotfix/tva').state.head, 'hotfix/tva');
  assert.match(refused(one, 'branch origin/x'), /nom de voie invalide/);
  assert.match(refused(one, 'branch a/'), /nom de voie invalide/);
});

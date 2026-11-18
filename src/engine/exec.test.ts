import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, emptyRepo, exec } from './index.ts';
import { FORK, ok, refused } from './test-helpers.ts';

test('exec rejects unknown commands without mutating state', () => {
  assert.match(refused(emptyRepo(), 'git frobnicate'), /« frobnicate » n’est pas une commande/);
});

test('exec never mutates state, even on success', () => {
  const state = build(FORK);
  const before = structuredClone(state);
  const result = ok(state, 'merge feature');
  assert.deepEqual(state, before);
  assert.notEqual(result.state, state);
});

test('an empty line is a silent no-op', () => {
  const result = ok(emptyRepo(), '   ');
  assert.deepEqual(result.output, []);
  assert.equal(result.move, null);
});

test('the git prefix is optional', () => {
  assert.equal(ok(emptyRepo(), 'git commit').move, 'commit');
});

test('aliases run the full command, gate included', () => {
  let state = ok(emptyRepo(), 'git co').state;
  state = ok(state, 'ck -b feature').state;
  state = ok(state, 'co').state;
  state = ok(state, 'ck main').state;
  assert.equal(ok(state, 'mr feature').move, ok(state, 'merge feature').move);
  assert.deepEqual(ok(state, 'st').output, ok(state, 'status').output);
  assert.deepEqual(ok(state, 'lo').output, ok(state, 'log').output);
  assert.match(refused({ ...state, allowed: ['commit'] }, 'mr feature'), /merge/);
});

test('engine bugs propagate instead of becoming player errors', () => {
  const corrupt = { ...emptyRepo(), branches: { main: 'k404' } };
  assert.throws(() => exec(corrupt, 'log'), TypeError);
});

test('build throws on a refused content command', () => {
  assert.throws(() => build(['merge nowhere']), /build: « merge nowhere » refusée/);
});

test('names inherited from Object.prototype are unknown branches, not crashes', () => {
  const start = build(['commit', 'push', 'commit']);
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    for (const cmd of ['switch', 'merge', 'rebase', 'reset --hard', 'reflog', 'cherry-pick', 'revert']) {
      for (const ref of [name, `origin/${name}`, `${name}@{0}`, `${name}~1`]) {
        const result = exec(start, `${cmd} ${ref}`);
        if (result.ok) {
          ok(result.state, 'commit');
          ok(result.state, 'log');
        }
      }
    }
  }
  // A branch legitimately named like an inherited key works end to end.
  let state = ok(start, 'switch -c constructor').state;
  for (const line of ['commit', 'push', 'status', 'reflog', 'switch main', 'merge constructor']) state = ok(state, line).state;
});

test('labels stop at Z', () => {
  const full = build(Array(26).fill('commit'));
  assert.match(refused(full, 'commit'), /plus de lettre/);
  assert.match(refused(ok(full, 'push').state, '_coll'), /plus de lettre/);
});

test('a huge HEAD~n resolves to nothing without looping', () => {
  assert.match(refused(build(['commit']), 'reset HEAD~99999999999'), /introuvable/);
});

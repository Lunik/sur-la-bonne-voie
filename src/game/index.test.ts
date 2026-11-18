import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Step } from '../levels/index.ts';
import { isPlayed, newSession, reduce, stars, stations, type Session } from './index.ts';

const station = (id: string) => stations.find((s) => s.id === id)!;
const step = (s: Session, st: Step) => reduce(s, { type: 'step', step: st, message: 'ok' });
test('keyboard solutions win every played station through the reducer', () => {
  for (const st of stations) {
    if (!isPlayed(st)) continue;
    let s = reduce(newSession(st), { type: 'start' });
    for (const x of st.solution) s = step(s, x);
    assert.equal(s.status, 'won', st.id);
    assert.equal(s.moves, st.par, st.id);
  }
});

test('a failing nested step is atomic: the switch is dropped too', () => {
  const s0 = newSession(station('grue-en-panne'));
  const s1 = step(s0, ['switch feature', 'merge main', 'switch main', 'merge feature']);
  assert.equal(s1.repo, s0.repo);
  assert.equal(s1.moves, 0);
  assert.equal(s1.toast?.tone, 'bad');
  assert.equal(s1.log.at(-1)?.kind, 'error');
});

test('budget runs out, undo brings the station back', () => {
  let s = newSession(station('ligne-directe'));
  s = step(s, ['switch main', 'merge feature']);
  s = step(s, 'commit');
  assert.equal(s.status, 'failed');
  assert.equal(s.failure, 'budget');
  s = step(s, 'commit');
  assert.equal(s.moves, 2, 'no move once failed');
  s = reduce(s, { type: 'undo', message: 'u', nothing: 'n' });
  assert.equal(s.status, 'playing');
  assert.equal(s.moves, 1);
});

test('timer: ready until start, fails at zero, no undo after a timeout', () => {
  let s = newSession(station('depart-imminent'));
  assert.equal(s.status, 'ready');
  assert.equal(step(s, 'pull').moves, 0, 'no move before taking the post');
  s = reduce(s, { type: 'tick', seconds: 10 });
  assert.equal(s.timeLeft, 80);
  s = reduce(s, { type: 'start' });
  s = step(s, 'pull');
  s = reduce(s, { type: 'tick', seconds: 79 });
  assert.equal(s.status, 'playing');
  s = reduce(s, { type: 'tick', seconds: 2 });
  assert.equal(s.status, 'failed');
  assert.equal(s.failure, 'timeout');
  assert.equal(reduce(s, { type: 'undo', message: 'u', nothing: 'n' }).status, 'failed');
});

test('predictions: wrong guesses cost a star, the right one wins and shows the board', () => {
  const s0 = newSession(station('double-filet'), [2, 0, 1]);
  assert.equal(s0.options[1].why, null);
  let s = reduce(s0, { type: 'guess', option: 0 });
  assert.equal(s.wrongs, 1);
  assert.ok(s.options[0].ruledOut);
  assert.equal(reduce(s, { type: 'guess', option: 0 }).wrongs, 1, 'a ruled-out board is not counted twice');
  s = reduce(s, { type: 'guess', option: 1 });
  assert.equal(s.status, 'won');
  assert.equal(stars(s), 2);
  assert.equal(s.repo, s0.options[1].board, 'the board shows the right answer');
});


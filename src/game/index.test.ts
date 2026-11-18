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

test('events fire once the move count is reached, and again after an undo', () => {
  let s = step(newSession(station('train-supplementaire')), 'merge feature');
  assert.equal(s.repo.commits[s.repo.remote.main].label, 'E');
  assert.equal(s.log.filter((l) => l.kind === 'event').length, 1);
  assert.match(s.toast!.text, /collègue/);
  assert.match(step(s, 'push').toast!.text, /rejected/);
  s = reduce(s, { type: 'undo', message: 'u', nothing: 'n' });
  assert.equal(s.repo.remote.main, newSession(station('train-supplementaire')).repo.remote.main, 'undo takes the event back');
  s = step(s, 'merge feature');
  assert.equal(s.log.filter((l) => l.kind === 'event').length, 2);
});

test('the sweep destroys the siding when the rescue comes too late', () => {
  const s = step(newSession(station('avant-le-ramassage')), 'merge feature');
  assert.match(step(s, 'cherry-pick D').toast!.text, /introuvable/);
});

test('a review moves to the next phase, shows its remark and target, and undo goes back', () => {
  let s = step(newSession(station('revue-de-quai')), 'rebase main');
  assert.equal(s.phase, 1);
  assert.equal(s.toast?.tone, 'good');
  assert.match(s.toast!.text, /soudez C et D/);
  assert.ok(s.target);
  s = reduce(s, { type: 'undo', message: 'u', nothing: 'n' });
  assert.equal(s.phase, 0);
  assert.equal(s.target, null);
});

test('an inquiry inspects but refuses moves, and counts wrong answers', () => {
  let s = newSession(station('controle-des-billets'));
  s = step(s, 'log main..hotfix');
  assert.deepEqual(s.log.slice(1).map((l) => 'text' in l && l.text), ['E  (hotfix)', 'D  (feature)', 'C']);
  const moved = step(s, 'commit');
  assert.equal(moved.repo, s.repo);
  assert.match(moved.toast!.text, /Enquête/);
  s = reduce(s, { type: 'answer', labels: ['E'] });
  assert.equal(s.wrongs, 1);
  s = reduce(s, { type: 'answer', labels: ['E', 'C', 'D'] });
  assert.equal(s.status, 'won');
  assert.equal(stars(s), 2);
});

test('bisect: probes corner the culprit; stars follow the probe count', () => {
  let s = newSession(station('recherche-de-l-avarie'));
  const id = (label: string) => Object.values(s.repo.commits).find((c) => c.label === label)!.id;
  s = reduce(s, { type: 'probe', id: id('D') });
  assert.equal(s.probes[id('D')], false);
  s = reduce(s, { type: 'probe', id: id('F') });
  assert.equal(s.probes[id('F')], true);
  assert.equal(reduce(s, { type: 'probe', id: id('A') }), s, 'the first car is known');
  s = reduce(s, { type: 'probe', id: id('E') });
  assert.equal(s.status, 'won');
  assert.equal(stars(s), 3);
});

test('retro: options carry their orders; the right one wins', () => {
  const s = newSession(station('qui-a-decroche'), [1, 2, 0]);
  assert.deepEqual(s.options[2].commands, ['branch sauvegarde', 'reset --hard B']);
  assert.ok(s.target, 'the board after is the goal');
  assert.equal(reduce(s, { type: 'guess', option: 2 }).status, 'won');
});

test('the sealed track refuses the rebase with a reason', () => {
  const s = step(newSession(station('regle-d-or')), 'rebase main');
  assert.match(s.toast!.text, /plombée/);
});

test('the player cannot type the scripted commands', () => {
  assert.match(step(newSession(station('avant-le-ramassage')), '_gc').toast!.text, /n’est pas une commande/);
});

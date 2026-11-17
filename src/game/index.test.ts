import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstParentChain, tipOf, type RepoState } from '../engine/index.ts';
import type { PlayedStation, Step } from '../levels/index.ts';
import {
  buttonStep, dragStep, newSession, recoverStep, reduce, stars, stations, tapStep,
  type ButtonTool, type DragTool, type GestureResult, type Session, type TapTool,
} from './index.ts';

const station = (id: string) => stations.find((s) => s.id === id)!;
const step = (s: Session, st: Step) => reduce(s, { type: 'step', step: st, message: 'ok' });

/** Car labelled `label` on row `row` (local or `origin/x`). */
const car = (repo: RepoState, row: string, label: string) => {
  const id = firstParentChain(repo, tipOf(repo, row)).find((x) => repo.commits[x].label === label);
  assert.ok(id, `${label} on ${row}`);
  return { id, row };
};
const ok = (r: GestureResult): Step => {
  assert.ok('step' in r, JSON.stringify(r));
  return r.step;
};

type G = ['drag', DragTool, string, string, string] | ['tap', TapTool, string, string] | ['button', ButtonTool] | ['recover', string];

function playGestures(id: string, gestures: G[]): Session {
  let s = newSession(station(id));
  s = reduce(s, { type: 'start' });
  for (const g of gestures) {
    const r = s.repo;
    const st =
      g[0] === 'drag' ? ok(dragStep(r, g[1], car(r, g[2], g[3]), g[4]))
      : g[0] === 'tap' ? ok(tapStep(r, g[1], car(r, g[2], g[3])))
      : g[0] === 'button' ? buttonStep(r, g[1])
      : recoverStep(r, Object.keys(r.commits).find((x) => r.commits[x].label === g[1])!);
    s = step(s, st);
    assert.notEqual(s.toast?.tone, 'bad', `${id}: ${s.toast?.text}`);
  }
  return s;
}

const gestureSolutions: [string, G[]][] = [
  ['premiere-voiture', [['button', 'commit']]],
  ['voie-de-service', [['button', 'branch'], ['button', 'commit']]],
  ['jonction', [['drag', 'merge', 'feature', 'D', 'main']]],
  ['remise-a-niveau', [['drag', 'rebase', 'feature', 'C', 'main']]],
  ['ligne-directe', [['drag', 'rebase', 'feature', 'D', 'main'], ['drag', 'merge', 'feature', 'D′', 'main']]],
  ['grue-en-panne', [
    ['drag', 'rebase', 'feature', 'C', 'main'], ['drag', 'merge', 'feature', 'C′', 'main'],
    ['drag', 'rebase', 'hotfix', 'D', 'main'], ['drag', 'merge', 'hotfix', 'D′', 'main'],
  ]],
  ['express-du-correctif', [['drag', 'cherry-pick', 'feature', 'D', 'main']]],
  ['soudure', [['tap', 'squash', 'feature', 'C'], ['drag', 'rebase', 'feature', 'CDE', 'main']]],
  ['voiture-suspecte', [['drag', 'cherry-pick', 'feature', 'C', 'main'], ['drag', 'cherry-pick', 'feature', 'E', 'main']]],
  ['premier-depart', [['button', 'push']]],
  ['push-rejete', [['button', 'pull-rebase'], ['button', 'push']]],
  ['voiture-fautive', [['tap', 'revert', 'main', 'C'], ['button', 'push']]],
  ['depart-imminent', [['button', 'pull'], ['drag', 'rebase', 'feature', 'C', 'main'], ['drag', 'merge', 'feature', 'D′', 'main'], ['button', 'push']]],
  ['casse', [['recover', 'E']]],
  ['livraison-du-vendredi', [
    ['button', 'pull'], ['drag', 'cherry-pick', 'hotfix', 'F', 'main'],
    ['drag', 'cherry-pick', 'feature', 'C', 'main'], ['drag', 'cherry-pick', 'feature', 'E', 'main'], ['button', 'push'],
  ]],
];

for (const [id, gestures] of gestureSolutions) {
  test(`gestures win « ${id} » in par`, () => {
    const s = playGestures(id, gestures);
    assert.equal(s.status, 'won');
    assert.equal(s.moves, (station(id) as PlayedStation).par);
    assert.equal(stars(s), 3);
  });
}

test('keyboard solutions win every played station through the reducer', () => {
  for (const st of stations) {
    if (st.type === 'predict') continue;
    let s = reduce(newSession(st), { type: 'start' });
    for (const x of st.solution) s = step(s, x);
    assert.equal(s.status, 'won', st.id);
    assert.equal(s.moves, st.par, st.id);
  }
});

test('a failing gesture is atomic: the switch is dropped too', () => {
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

test('gesture refusals', () => {
  const r = newSession(station('push-rejete')).repo;
  assert.deepEqual(dragStep(r, 'rebase', car(r, 'origin/main', 'D'), 'main'), { refusal: 'remote-fixed' });
  assert.deepEqual(tapStep(r, 'revert', car(r, 'origin/main', 'D')), { refusal: 'remote-untouchable' });
  assert.deepEqual(tapStep(r, 'squash', car(r, 'main', 'C')), { refusal: 'squash-needs-two' });
  assert.deepEqual(dragStep(r, 'merge', car(r, 'main', 'C'), 'main'), { refusal: 'same-row' });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contains, isWon, noMerge, lines, play, startBoard, validate, type PlayedStation } from './index.ts';
import { stations } from './stations.ts';

test('21 stations over 5 lines', () => {
  assert.equal(stations.length, 21);
  assert.deepEqual([...new Set(stations.map((s) => s.line))], lines.map((_, i) => i + 1));
});

test('every station is valid: solves in par, predictions have 3 distinct boards', () => {
  assert.deepEqual(validate(stations), []);
});

const played = (id: string) => stations.find((s) => s.id === id) as PlayedStation;

test('validate catches a broken station', () => {
  const base = played('premiere-voiture');
  const errors = validate([
    { ...base, par: 2, budget: 1 },
    { ...base, line: 9 },
    { ...base, id: 'x', solution: ['merge main'] },
    { ...played('grue-en-panne'), rules: [{ text: 'typo', check: noMerge('mian') }] },
    { ...base, id: 'vide', tutorial: [] },
    { ...base, id: 'spoiler', tutorial: [{ title: 'Trop', text: '', example: ['commit', 'commit'], run: ['commit'] }] },
  ]);
  assert.ok(errors.includes('vide : tutoriel vide'));
  assert.ok(errors.includes('spoiler : tutoriel « Trop » : montre la solution'));
  assert.ok(errors.some((e) => e === 'grue-en-panne : la solution ne gagne pas'));
  assert.ok(errors.some((e) => e.includes('budget 1 < par 2')));
  assert.ok(errors.some((e) => e.includes('identifiant en double')));
  assert.ok(errors.some((e) => e.includes('ligne 9 inconnue')));
  assert.ok(errors.some((e) => e.startsWith('x : « merge main » refusée')));
});

test('gates follow the line: merge is not yet taught on line 1', () => {
  assert.throws(() => play(played('premiere-voiture'), ['merge main']), /merge/);
});

test('contains sees squashed and recreated cars, not merges', () => {
  const { state } = play(played('soudure'), played('soudure').solution);
  assert.ok(contains('feature', 'D')(state));
  assert.ok(!contains('main', 'C')(state));
});

test('a merge breaks the « grue en panne » rules', () => {
  const station = played('grue-en-panne');
  assert.throws(() => play(station, ['merge feature']), /fast-forward|jonction/i);
  assert.ok(!isWon(station, startBoard(station)));
});

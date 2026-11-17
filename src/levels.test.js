// Remplace le test Playwright perdu : chaque station se résout avec la solution de son champ `learn`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, exec, sig } from './engine.js';
import { CH, LEVELS } from './levels.js';

const solution = learn => learn.split(/\n|&&/).map(c => c.replace(/#.*/, '').replace(/^\s*git\s+/, '').trim()).filter(Boolean);
const names = s => Object.keys(s.b).concat(Object.keys(s.remote).map(b => 'origin/' + b));

LEVELS.forEach((L, i) => test(`${i + 1}. ${L.nom}`, () => {
  if (L.type === 'prono') {
    const sigOf = cmds => { const s = build(L.start.concat(cmds), L.cargo); return sig(s, names(s)); };
    const right = sigOf(L.cmds);
    L.wrong.forEach(w => assert.notEqual(sigOf(w.cmds), right, w.why));
    return;
  }
  const S = build(L.start, L.cargo);
  Object.assign(S, { allow: CH[L.ch].allow, noM: !!L.noM, noForce: !!L.noForce });
  solution(L.learn).forEach(c => exec(S, c));
  if (L.target) { const T = build(L.target, L.cargo); assert.equal(sig(S, names(T), L.match), sig(T, names(T), L.match)); }
  (L.rules || []).forEach(([txt, ok]) => assert.ok(ok(S), txt));
}));

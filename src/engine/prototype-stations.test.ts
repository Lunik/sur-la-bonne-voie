// Parity check against the prototype: the 21 stations of reference/artifact.html,
// command lists copied verbatim. Jalon 2 moves this data into src/levels/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, exec, sig, type MatchMode, type RepoState } from './index.ts';
import { FORK, TRI } from './test-helpers.ts';

const A2 = ['commit', 'commit'];
const ALLOW = [['commit', 'branch'], ['merge', 'rebase'], ['cherry-pick', 'reset'], ['push', 'pull', 'revert'], []];

/** A nested array is one gesture: it counts as a single move (prototype `run(cmds, msg, asOne)`). */
type Step = string | string[];

interface Station {
  name: string;
  line: number;
  start: string[];
  target?: string[];
  match?: MatchMode;
  cargo?: Record<string, string>;
  fastForwardOnly?: boolean;
  forceForbidden?: boolean;
  par?: number;
  solution?: Step[];
  prono?: { cmds: string[]; wrong: string[][] };
}

const stations: Station[] = [
  { name: 'Première voiture', line: 0, start: A2, target: [...A2, 'commit'], par: 1, solution: ['commit'] },
  { name: 'Voie de service', line: 0, start: A2, target: [...A2, 'switch -c feature', 'commit'], par: 2, solution: ['switch -c feature', 'commit'] },
  { name: 'Aller-retour', line: 0, match: 'shape', start: A2, target: [...A2, 'switch -c feature', 'commit', 'commit', 'switch main', 'commit'], par: 4,
    solution: ['switch -c feature', 'commit', 'commit', 'switch main', 'commit'] },
  { name: 'La bifurcation', line: 0, start: A2,
    prono: { cmds: ['switch -c fix', 'commit', 'switch main', 'commit', 'commit'], wrong: [['switch -c fix', 'commit', 'commit', 'commit'], ['commit', 'commit', 'commit']] } },

  { name: 'La jonction', line: 1, start: FORK, target: [...FORK, 'merge feature'], par: 1, solution: ['switch main', 'merge feature'] },
  { name: 'Remise à niveau', line: 1, start: FORK, target: [...FORK, 'switch feature', 'rebase main'], par: 1, solution: ['switch feature', 'rebase main'] },
  { name: 'Le double filet', line: 1, start: FORK, prono: { cmds: ['switch feature', 'rebase main'], wrong: [['merge feature'], ['rebase feature']] } },
  { name: 'Ligne directe', line: 1, start: FORK, target: [...FORK, 'switch feature', 'rebase main', 'switch main', 'merge feature'], par: 2,
    solution: ['switch feature', 'rebase main', 'switch main', 'merge feature'] },
  { name: 'La grue en panne', line: 1, fastForwardOnly: true, par: 4,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'switch main', 'switch -c hotfix', 'commit', 'switch main', 'commit'],
    solution: ['switch feature', 'rebase main', 'switch main', 'merge feature', 'switch hotfix', 'rebase main', 'switch main', 'merge hotfix'] },

  { name: 'L’express du correctif', line: 2, start: TRI, target: [...TRI, 'cherry-pick D'], par: 1, solution: ['switch main', 'cherry-pick D'] },
  { name: 'La soudure', line: 2, match: 'raw', par: 2,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'commit'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'commit', 'switch feature', 'reset --soft HEAD~3', 'commit', 'rebase main'],
    solution: ['switch feature', ['reset --soft HEAD~3', 'commit'], 'rebase main'] },
  { name: 'La voiture suspecte', line: 2, cargo: { D: 'debug' }, start: TRI, par: 2, solution: ['switch main', 'cherry-pick C', 'cherry-pick E'] },
  { name: 'La copie', line: 2, start: TRI,
    prono: { cmds: ['cherry-pick E'], wrong: [['switch feature', 'reset --hard D', 'switch main', 'cherry-pick E'], ['merge feature']] } },
  { name: 'La release', line: 2, start: FORK, target: [...FORK, 'switch -c release', 'cherry-pick D'], par: 2, solution: ['switch -c release', 'cherry-pick D'] },

  { name: 'Premier départ', line: 3, start: ['commit', 'commit', 'push', 'commit'], target: ['commit', 'commit', 'push', 'commit', 'push'], par: 1, solution: ['push'] },
  { name: 'Push rejeté', line: 3, start: ['commit', 'commit', 'push', 'commit', '_coll'], par: 2, solution: ['pull --rebase', 'push'] },
  { name: 'La voiture fautive est partie', line: 3, forceForbidden: true, cargo: { C: 'bug' }, start: ['commit', 'commit', 'commit', 'push'], par: 2,
    solution: ['revert C', 'push'] },
  { name: 'Départ imminent', line: 3, par: 4, start: ['commit', 'commit', 'push', 'switch -c feature', 'commit', 'commit', 'switch main', '_coll'],
    solution: ['pull', 'switch feature', 'rebase main', 'switch main', 'merge feature', 'push'] },

  { name: 'La casse', line: 4, start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'reset --hard C'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'reset --hard C', 'reset --hard E'], par: 1,
    solution: ['reflog', 'reset --hard feature@{1}'] },
  { name: 'Soft ou hard ?', line: 4, start: ['commit', 'commit', 'commit', 'commit'],
    prono: { cmds: ['reset --soft HEAD~2', 'commit'], wrong: [['reset --hard HEAD~2'], ['commit']] } },
  { name: 'La livraison du vendredi', line: 4, forceForbidden: true, cargo: { D: 'debug' }, par: 5,
    start: ['commit', 'commit', 'push', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'switch -c hotfix', 'commit', 'switch main', '_coll'],
    solution: ['pull', 'cherry-pick F', 'cherry-pick C', 'cherry-pick E', 'push'] },
];

/** Branch names of a board, local then remote, as the prototype's `tNames`. */
const names = (s: RepoState) => [...Object.keys(s.branches), ...Object.keys(s.remote).map((b) => `origin/${b}`)];

/** Plays a solution with the station's gates and flags on; returns the board and the move count. */
function play(station: Station, steps: Step[]) {
  let state: RepoState = {
    ...build(station.start, station.cargo),
    allowed: ALLOW.slice(0, station.line + 1).flat(),
    fastForwardOnly: !!station.fastForwardOnly,
    forceForbidden: !!station.forceForbidden,
  };
  let moves = 0;
  for (const step of steps) {
    let count = 0;
    for (const line of Array.isArray(step) ? step : [step]) {
      const result = exec(state, line);
      if (!result.ok) assert.fail(`${station.name} · ${line}: ${result.error}`);
      state = result.state;
      if (result.move) count++;
    }
    moves += Array.isArray(step) ? Math.min(count, 1) : count;
  }
  return { state, moves };
}

test('the prototype has 21 stations', () => {
  assert.equal(stations.length, 21);
});

for (const station of stations) {
  test(`station « ${station.name} »`, () => {
    build(station.start, station.cargo);
    const target = station.target && build(station.target, station.cargo);

    if (station.solution) {
      const { state, moves } = play(station, station.solution);
      assert.equal(moves, station.par, 'solution move count matches par');
      if (target) {
        const tNames = names(target);
        assert.equal(sig(state, tNames, station.match), sig(target, tNames, station.match));
      }
    }

    if (station.prono) {
      const boards = [station.prono.cmds, ...station.prono.wrong].map((cmds) => build([...station.start, ...cmds], station.cargo));
      const all = [...new Set(boards.flatMap(names))];
      const signatures = boards.map((b) => sig(b, all));
      assert.equal(new Set(signatures).size, 3, `the three answers must differ:\n${signatures.join('\n')}`);
    }
  });
}

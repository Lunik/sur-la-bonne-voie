// Station schema, network lines, win rules and content validation. The stations themselves are data: see stations.ts.
import { ancestors, build, exec, sig, stripPrimes, tipOf, type Commit, type MatchMode, type RepoState } from '../engine/index.ts';

/** Gestures and buttons of the board (jalon 3). */
export type Tool = 'commit' | 'branch' | 'rebase' | 'merge' | 'cherry-pick' | 'squash' | 'revert' | 'push' | 'pull' | 'pull-rebase' | 'recover';

export interface Line {
  title: string;
  /** Gated engine commands this line teaches; a station allows those of its line and every line before. */
  commands: string[];
  /** Tools this line unlocks, cumulative like `commands`. */
  tools: Tool[];
  /** Clickable terminal suggestions. */
  suggestions: string[];
}

/** Network map, in play order. Line `n` of a station is `lines[n - 1]`. */
export const lines: Line[] = [
  { title: 'Le dépôt', commands: ['commit', 'branch'], tools: ['commit', 'branch'], suggestions: ['commit', 'switch -c feature', 'switch main', 'log'] },
  { title: 'Les jonctions', commands: ['merge', 'rebase'], tools: ['rebase', 'merge'], suggestions: ['merge feature', 'switch feature', 'rebase main', 'log'] },
  { title: 'Le tri', commands: ['cherry-pick', 'reset'], tools: ['cherry-pick', 'squash'], suggestions: ['cherry-pick D', 'reset --soft HEAD~3', 'commit', 'status'] },
  { title: 'Les grandes lignes', commands: ['push', 'pull', 'revert'], tools: ['revert', 'push', 'pull', 'pull-rebase'], suggestions: ['push', 'pull --rebase', 'revert C', 'status'] },
  { title: 'Les accidents', commands: [], tools: ['recover'], suggestions: ['reflog', 'reset --hard feature@{1}', 'cherry-pick F', 'push'] },
];

export const allowedCommands = (line: number) => lines.slice(0, line).flatMap((l) => l.commands);
export const allowedTools = (line: number) => lines.slice(0, line).flatMap((l) => l.tools);

// ---------- Win rules ----------

export type Check = (s: RepoState) => boolean;
export interface Rule {
  text: string;
  check: Check;
}

const carsOn = (s: RepoState, ref: string): Commit[] => {
  const tip = tipOf(s, ref);
  return tip ? [...ancestors(s, tip)].map((id) => s.commits[id]) : [];
};

/** Every car is on `ref`, possibly recreated (`C′`) or squashed (`CDE`). Merges and reverts do not count. */
export const contains = (ref: string, ...cars: string[]): Check => (s) =>
  cars.every((car) => carsOn(s, ref).some((c) => c.kind === 'normal' && [...stripPrimes(c.label)].includes(car)));
/** Negative rules fail on an unknown ref, so a typo cannot pass silently. */
export const noCargo = (ref: string, cargo: string): Check => (s) => !!tipOf(s, ref) && !carsOn(s, ref).some((c) => c.cargo === cargo);
export const noMerge = (ref: string): Check => (s) => !!tipOf(s, ref) && !carsOn(s, ref).some((c) => c.kind === 'merge');
export const reverted = (ref: string, car: string): Check => (s) =>
  carsOn(s, ref).some((c) => c.kind === 'revert' && stripPrimes(c.label) === `↩${car}`);
/** `branch` and `origin/branch` point to the same car. */
export const same = (branch: string): Check => (s) => !!s.remote[branch] && s.remote[branch] === s.branches[branch];

// ---------- Stations ----------

/** A nested array is one gesture: it counts as a single move (e.g. squash = `reset --soft` + `commit`). */
export type Step = string | string[];

interface Common {
  /** Stable slug: progress is saved under it. */
  id: string;
  /** 1-based index in `lines`. */
  line: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  brief: string;
  /** Shown after the win: the Git commands (or idea) to remember. */
  learn: string;
  /** Commands that build the starting board (ungated). */
  start: string[];
  /** Car label → cargo, e.g. `{ D: 'debug' }`. */
  cargo?: Record<string, string>;
  /** Tools flagged « NOUVEAU ». */
  newTools?: Tool[];
}

interface Played extends Common {
  /** Moves for 3 stars; the solution must take exactly that many. */
  par: number;
  /** Max moves before failure. */
  budget?: number;
  /** Seconds. */
  timeLimit?: number;
  /** Gestures disabled. */
  keyboardOnly?: boolean;
  /** Merge commits forbidden (« panne »): spread into the engine state. */
  fastForwardOnly?: boolean;
  forceForbidden?: boolean;
  /** Tool selected on arrival. */
  tool?: Tool;
  hint: string;
  solution: Step[];
  /** Target board, compared with `sig` on the target's branches. */
  target?: string[];
  match?: MatchMode;
  rules?: Rule[];
}

export interface CompoStation extends Played {
  type: 'compo';
  target: string[];
}

export interface RulesStation extends Played {
  type: 'rules';
  rules: Rule[];
}

export interface WrongAnswer {
  commands: string[];
  why: string;
}

export interface PredictStation extends Common {
  type: 'predict';
  /** Commands run on the start board; the player picks the resulting board. */
  answer: string[];
  wrong: [WrongAnswer, WrongAnswer];
}

export type PlayedStation = CompoStation | RulesStation;
export type Station = PlayedStation | PredictStation;

const branchNames = (s: RepoState) => [...Object.keys(s.branches), ...Object.keys(s.remote).map((b) => `origin/${b}`)];

/** Board the player starts from, with the station's gates and flags on. */
export function startBoard(station: PlayedStation): RepoState {
  return {
    ...build(station.start, station.cargo),
    allowed: allowedCommands(station.line),
    fastForwardOnly: !!station.fastForwardOnly,
    forceForbidden: !!station.forceForbidden,
  };
}

/** The three boards of a prediction, right answer first. */
export function predictBoards(station: PredictStation): RepoState[] {
  return [station.answer, ...station.wrong.map((w) => w.commands)].map((cmds) => build([...station.start, ...cmds], station.cargo));
}

export function isWon(station: PlayedStation, s: RepoState): boolean {
  if (station.target) {
    const target = build(station.target, station.cargo);
    const names = branchNames(target);
    if (sig(s, names, station.match) !== sig(target, names, station.match)) return false;
  }
  return (station.rules ?? []).every((rule) => rule.check(s));
}

/** Plays steps from the start board; throws on a refused command. */
export function play(station: PlayedStation, steps: Step[]): { state: RepoState; moves: number } {
  let state = startBoard(station);
  let moves = 0;
  for (const step of steps) {
    let count = 0;
    for (const line of Array.isArray(step) ? step : [step]) {
      const result = exec(state, line);
      if (!result.ok) throw new Error(`« ${line} » refusée : ${result.error}`);
      state = result.state;
      if (result.move) count++;
    }
    moves += Array.isArray(step) ? Math.min(count, 1) : count;
  }
  return { state, moves };
}

function validateStation(station: Station): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(station.line) || station.line < 1 || station.line > lines.length) {
    return [`ligne ${station.line} inconnue (1 à ${lines.length})`];
  }
  const tools = allowedTools(station.line);
  for (const tool of [...(station.newTools ?? []), ...('tool' in station && station.tool ? [station.tool] : [])]) {
    if (!tools.includes(tool)) errors.push(`outil ${tool} pas encore débloqué à la ligne ${station.line}`);
  }
  try {
    if (station.type === 'predict') {
      if (station.wrong.length !== 2) errors.push(`${station.wrong.length} fausses réponses au lieu de 2`);
      const boards = predictBoards(station);
      const names = [...new Set(boards.flatMap(branchNames))];
      if (new Set(boards.map((b) => sig(b, names))).size !== boards.length) errors.push('deux réponses donnent le même plateau');
      return errors;
    }
    if (station.type === 'compo' && !station.target?.length) errors.push('composition sans cible');
    if (station.type === 'rules' && !station.rules?.length) errors.push('règlement sans règle');
    if (station.budget !== undefined && station.budget < station.par) errors.push(`budget ${station.budget} < par ${station.par}`);
    if (isWon(station, startBoard(station))) errors.push('déjà gagnée au départ');
    const { state, moves } = play(station, station.solution);
    if (moves !== station.par) errors.push(`la solution prend ${moves} manœuvres, par ${station.par}`);
    if (!isWon(station, state)) errors.push('la solution ne gagne pas');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}

/** Content errors, one line each, prefixed by the station id. Empty = valid. */
export function validate(stations: Station[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  let line = 1;
  for (const station of stations) {
    if (seen.has(station.id)) errors.push(`${station.id} : identifiant en double`);
    seen.add(station.id);
    if (station.line < line) errors.push(`${station.id} : ligne ${station.line} après la ligne ${line}, stations à regrouper par ligne`);
    line = Math.max(line, station.line);
    errors.push(...validateStation(station).map((e) => `${station.id} : ${e}`));
  }
  return errors;
}

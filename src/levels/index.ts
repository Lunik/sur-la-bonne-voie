// Station schema, network lines, win rules and content validation. The stations themselves are data: see stations.ts.
import { ancestors, build, exec, sig, stripPrimes, tipOf, type Commit, type MatchMode, type RepoState } from '../engine/index.ts';

/** Rolling stock drawn for a station (ui/trains.tsx). */
export type Train =
  | 'francilien' | 'mi09' | 'regio2n'
  | 'regiolis' | 'agc' | 'x73500'
  | 'corail' | 'coradia'
  | 'tgv' | 'tgv-m' | 'tgv-duplex'
  | 'infra' | 'fret';

export interface Line {
  title: string;
  /** Gated engine commands this line teaches; a station allows those of its line and every line before. */
  commands: string[];
  /** Clickable terminal suggestions. */
  suggestions: string[];
}

/** Network map, in play order. Line `n` of a station is `lines[n - 1]`. */
export const lines: Line[] = [
  { title: 'Le dépôt', commands: ['commit', 'branch'], suggestions: ['commit', 'switch -c feature', 'switch main', 'log'] },
  { title: 'Les jonctions', commands: ['merge', 'rebase'], suggestions: ['merge feature', 'switch feature', 'rebase main', 'log'] },
  { title: 'Le tri', commands: ['cherry-pick', 'reset'], suggestions: ['cherry-pick D', 'reset --soft HEAD~3', 'commit', 'status'] },
  { title: 'Les grandes lignes', commands: ['push', 'pull', 'revert'], suggestions: ['push', 'pull --rebase', 'revert C', 'status'] },
  { title: 'Les accidents', commands: [], suggestions: ['reflog', 'reset --hard feature@{1}', 'cherry-pick F', 'push'] },
];

export const allowedCommands = (line: number) => lines.slice(0, line).flatMap((l) => l.commands);

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

/** A nested array runs atomically and counts as a single move. */
export type Step = string | string[];

/** One page of the tutorial shown before a station. `backticks` mark Git commands. */
export interface Lesson {
  title: string;
  text: string;
  /** Example board, built like `start` with the station's cargo. */
  example?: string[];
  /** Commands run on the example: the page shows the board before and after them. */
  run?: string[];
}

interface Common {
  /** Stable slug: progress is saved under it. */
  id: string;
  /** 1-based index in `lines`. */
  line: number;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Rolling stock of the station: suburban on line 1, regional on 2, Intercités on 3, TGV on 4, works or freight train on 5. */
  train: Train;
  brief: string;
  /** Pages shown before the station: the notions it needs, never its solution. */
  tutorial: Lesson[];
  /** Shown after the win: the Git commands (or idea) to remember. */
  learn: string;
  /** Commands that build the starting board (ungated). */
  start: string[];
  /** Car label → cargo, e.g. `{ D: 'debug' }`. */
  cargo?: Record<string, string>;
}

interface Played extends Common {
  /** Moves for 3 stars; the solution must take exactly that many. */
  par: number;
  /** Max moves before failure. */
  budget?: number;
  /** Seconds. */
  timeLimit?: number;
  /** Merge commits forbidden (« panne »): spread into the engine state. */
  fastForwardOnly?: boolean;
  forceForbidden?: boolean;
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

/** What the terminal shows for one command of a step. */
export interface Echo {
  command: string;
  output: string[];
}

export type StepResult =
  | { ok: true; state: RepoState; moves: number; transcript: Echo[] }
  | { ok: false; command: string; error: string; transcript: Echo[] };

/** Runs one step atomically: if any command is refused, the whole step is dropped. A nested step counts as one move at most. */
export function runStep(state: RepoState, step: Step): StepResult {
  const transcript: Echo[] = [];
  let count = 0;
  for (const command of Array.isArray(step) ? step : [step]) {
    const result = exec(state, command);
    if (!result.ok) return { ok: false, command, error: result.error, transcript };
    transcript.push({ command, output: result.output });
    state = result.state;
    if (result.move) count++;
  }
  return { ok: true, state, moves: Array.isArray(step) ? Math.min(count, 1) : count, transcript };
}

/** Plays steps from the start board; throws on a refused command. */
export function play(station: PlayedStation, steps: Step[]): { state: RepoState; moves: number } {
  let state = startBoard(station);
  let moves = 0;
  for (const step of steps) {
    const result = runStep(state, step);
    if (!result.ok) throw new Error(`« ${result.command} » refusée : ${result.error}`);
    state = result.state;
    moves += result.moves;
  }
  return { state, moves };
}

/** Boards of a lesson: before, then after `run` (null without example or run). */
export function lessonBoards(station: Station, lesson: Lesson): [RepoState | null, RepoState | null] {
  if (!lesson.example) return [null, null];
  const before = build(lesson.example, station.cargo);
  return [before, lesson.run ? build(lesson.run, station.cargo, before) : null];
}

/** A lesson must not show the board the player is asked to reach or to predict. */
function tutorialErrors(station: Station): string[] {
  if (!station.tutorial.length) return ['tutoriel vide'];
  const predict = station.type === 'predict';
  const goal = predict ? predictBoards(station)[0] : station.target ? build(station.target, station.cargo) : null;
  const mode = predict ? undefined : station.match;
  return station.tutorial.flatMap((lesson) => {
    if (lesson.run && !lesson.example) return [`tutoriel « ${lesson.title} » : run sans example`];
    const [before, after] = lessonBoards(station, lesson);
    const shown = [before, after].filter((b) => b !== null);
    if (!goal || !shown.length) return [];
    return shown.some((b) => {
      const names = [...new Set([...branchNames(b), ...branchNames(goal)])];
      return sig(b, names, mode) === sig(goal, names, mode);
    }) ? [`tutoriel « ${lesson.title} » : montre la solution`] : [];
  });
}

function validateStation(station: Station): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(station.line) || station.line < 1 || station.line > lines.length) {
    return [`ligne ${station.line} inconnue (1 à ${lines.length})`];
  }
  try {
    errors.push(...tutorialErrors(station));
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

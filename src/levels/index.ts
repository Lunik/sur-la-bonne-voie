// Station schema, network lines, win rules and content validation. The stations themselves are data: see stations.ts.
import { ancestors, build, exec, firstParentChain, sig, stripPrimes, tipOf, type Commit, type MatchMode, type RepoState } from '../engine/index.ts';

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
/** `ref` and `other` (`origin/<ref>` by default) point to the same car. */
export const same = (ref: string, other = `origin/${ref}`): Check => (s) => !!tipOf(s, other) && tipOf(s, other) === tipOf(s, ref);

/** A colleague's car is on `ref`, whatever letter it got. */
export const fromColleague = (ref: string): Check => (s) => carsOn(s, ref).some((c) => c.kind === 'normal' && c.origin === 'collègue');
/** Every track named with one of `prefixes` has reached each of `into`. Fails if one of `into` is unknown. */
const reached = (prefixes: string[], ...into: string[]): Check => (s) =>
  into.every((b) => !!tipOf(s, b)) &&
  Object.keys(s.branches)
    .filter((b) => prefixes.some((p) => b.startsWith(p)))
    .every((b) => into.every((t) => ancestors(s, s.branches[t]).has(s.branches[b])));

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

/** What to reach: a target board (compared with `sig` on the target's branches), rules, or both. */
export interface Goal {
  target?: string[];
  match?: MatchMode;
  rules?: Rule[];
}

/** One step of a reviewed station: the reviewer's remark, then what it asks for. */
export interface Phase extends Goal {
  remark: string;
}

/** Scripted happening: once the player's move count reaches `after`, `run` plays (ungated) and `say` is announced. */
export interface Happening {
  after: number;
  run: string[];
  say: string;
}

interface Played extends Common, Goal {
  /** Moves for 3 stars; the solution must take exactly that many. */
  par: number;
  /** Max moves before failure. */
  budget?: number;
  /** Seconds. */
  timeLimit?: number;
  /** Merge commits forbidden (« panne »): spread into the engine state. */
  fastForwardOnly?: boolean;
  forceForbidden?: boolean;
  /** « Voie publique »: cars already on origin are sealed (engine `publicLocked`). */
  publicLocked?: boolean;
  /** « Horaire à événements ». */
  events?: Happening[];
  /** « Ramassage »: the siding is swept for good once the move count reaches it. */
  gcAfter?: number;
  /** « Plan de circulation imposé »: adds the workflow's rules to every goal. */
  workflow?: 'gitflow';
  /** « Feuille de route »: base of the todo-list editor (`rebase -i <todo>`). */
  todo?: string;
  hint: string;
  solution: Step[];
}

export interface CompoStation extends Played {
  type: 'compo';
  target: string[];
}

export interface RulesStation extends Played {
  type: 'rules';
  rules: Rule[];
}

/** « Revue de quai »: goals one after the other, each announced by the reviewer. */
export interface ReviewStation extends Played {
  type: 'review';
  phases: Phase[];
}

export interface WrongAnswer {
  commands: string[];
  why: string;
}

/** `predict`: the orders are shown, the player picks the board. `retro`: the board after is shown, the player picks the orders. */
export interface PredictStation extends Common {
  type: 'predict' | 'retro';
  /** Commands run on the start board: the right answer. */
  answer: string[];
  wrong: [WrongAnswer, WrongAnswer];
}

/** « Enquête »: the player answers a question by picking cars; the terminal only inspects. */
export interface InquiryStation extends Common {
  type: 'enquete';
  question: string;
  /** Exact car labels of the answer, any order. */
  answer: string[];
  hint: string;
}

/** « Recherche de l'avarie »: probe cars of main until the first faulty one is cornered. */
export interface BisectStation extends Common {
  type: 'bisect';
  /** First faulty car; every car after it is faulty too. */
  culprit: string;
  /** Probes for 3 stars: the worst case of a binary search. */
  par: number;
  hint: string;
}

export type PlayedStation = CompoStation | RulesStation | ReviewStation;
export type Station = PlayedStation | PredictStation | InquiryStation | BisectStation;

export const isPlayed = (s: Station): s is PlayedStation => s.type === 'compo' || s.type === 'rules' || s.type === 'review';
export const isGuess = (s: Station): s is PredictStation => s.type === 'predict' || s.type === 'retro';

const branchNames = (s: RepoState) => [...Object.keys(s.branches), ...Object.keys(s.remote)];

type Flags = Partial<Pick<Played, 'fastForwardOnly' | 'forceForbidden' | 'publicLocked'>>;

/** Board the player starts from, with the station's gates and flags on. */
export function startBoard(station: Common & Flags): RepoState {
  return {
    ...build(station.start, station.cargo),
    allowed: allowedCommands(station.line),
    fastForwardOnly: !!station.fastForwardOnly,
    forceForbidden: !!station.forceForbidden,
    publicLocked: !!station.publicLocked,
  };
}

/** The three boards of a prediction, right answer first. */
export function predictBoards(station: PredictStation): RepoState[] {
  return [station.answer, ...station.wrong.map((w) => w.commands)].map((cmds) => build([...station.start, ...cmds], station.cargo));
}

// ---------- Goals ----------

/** Gitflow: main only receives tracks, every hotfix/ and release/ track reaches main and develop. */
function workflowRules(station: PlayedStation): Rule[] {
  if (station.workflow !== 'gitflow') return [];
  const before = new Set(Object.keys(build(station.start, station.cargo).commits));
  return [
    {
      text: 'Gitflow : aucune voiture accrochée directement sur main',
      check: (s) => !!tipOf(s, 'main') && !carsOn(s, 'main').some((c) => c.kind === 'normal' && c.origin === 'main' && !before.has(c.id)),
    },
    { text: 'Gitflow : chaque voie hotfix/ ou release/ rejoint main et develop', check: reached(['hotfix/', 'release/'], 'main', 'develop') },
  ];
}

/** Goals in order: the phases of a review, else the station itself. */
export const goals = (station: PlayedStation): Goal[] => (station.type === 'review' ? station.phases : [station]);

/** Rules to show and check for a goal: the workflow's, then the goal's own. */
export const rulesOf = (station: PlayedStation, goal: Goal): Rule[] => [...workflowRules(station), ...(goal.rules ?? [])];

export function goalMet(station: PlayedStation, goal: Goal, s: RepoState): boolean {
  if (goal.target) {
    const target = build(goal.target, station.cargo);
    const names = branchNames(target);
    if (sig(s, names, goal.match) !== sig(target, names, goal.match)) return false;
  }
  return rulesOf(station, goal).every((rule) => rule.check(s));
}

/** Phase reached from `phase` on board `s`: every goal met in a row is passed. `goals.length` = won. */
export function advance(station: PlayedStation, phase: number, s: RepoState): number {
  const all = goals(station);
  while (phase < all.length && goalMet(station, all[phase], s)) phase++;
  return phase;
}

/** A single-goal station is won when its goal is met. Use `advance` to follow a review. */
export const isWon = (station: PlayedStation, s: RepoState) => advance(station, 0, s) === goals(station).length;

// ---------- Moves and events ----------

/** What the terminal shows for one command of a step. */
export interface Echo {
  command: string;
  output: string[];
}

export type StepResult =
  | { ok: true; state: RepoState; moves: number; transcript: Echo[] }
  | { ok: false; command: string; error: string; transcript: Echo[] };

/** Runs one player step atomically: if any command is refused, the whole step is dropped. A nested step counts as one move at most. */
export function runStep(state: RepoState, step: Step): StepResult {
  const transcript: Echo[] = [];
  let count = 0;
  for (const command of Array.isArray(step) ? step : [step]) {
    const result = exec(state, command, { internal: false });
    if (!result.ok) return { ok: false, command, error: result.error, transcript };
    transcript.push({ command, output: result.output });
    state = result.state;
    if (result.move) count++;
  }
  return { ok: true, state, moves: Array.isArray(step) ? Math.min(count, 1) : count, transcript };
}

const GC_SAY = 'Le ramassage passe : la voie de garage est vidée pour de bon.';

/** Scripted happenings of a station, `gcAfter` included, by move count. */
export const happenings = (station: PlayedStation): Happening[] =>
  [...(station.events ?? []), ...(station.gcAfter ? [{ after: station.gcAfter, run: ['_gc'], say: GC_SAY }] : [])].sort((a, b) => a.after - b.after);

/** Plays the happenings crossed when the move count goes from `before` to `after` (an undo then a redo replays them). */
export function fire(station: PlayedStation, state: RepoState, before: number, after: number): { state: RepoState; fired: { say: string; output: string[] }[] } {
  const fired: { say: string; output: string[] }[] = [];
  for (const h of happenings(station)) {
    if (h.after <= before || h.after > after) continue;
    const output: string[] = [];
    for (const command of h.run) {
      // Ungated: a colleague is not bound by the player's line.
      const result = exec({ ...state, allowed: null }, command);
      if (!result.ok) throw new Error(`événement « ${command} » refusé : ${result.error}`);
      state = { ...result.state, allowed: state.allowed };
      output.push(...result.output);
    }
    fired.push({ say: h.say, output });
  }
  return { state, fired };
}

/** Plays steps from the start board, with happenings and phases; throws on a refused command. */
export function play(station: PlayedStation, steps: Step[]): { state: RepoState; moves: number; phase: number; skipped: number[] } {
  let state = startBoard(station);
  let moves = 0;
  let phase = 0;
  const skipped: number[] = [];
  for (const step of steps) {
    const result = runStep(state, step);
    if (!result.ok) throw new Error(`« ${result.command} » refusée : ${result.error}`);
    state = fire(station, result.state, moves, moves + result.moves).state;
    moves += result.moves;
    const next = advance(station, phase, state);
    // A phase met the moment it opens is never seen by the player.
    for (let p = phase + 1; p < next; p++) skipped.push(p);
    phase = next;
  }
  return { state, moves, phase, skipped };
}

// ---------- Inquiry and bisect ----------

export const sameCars = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Cars that can be probed, oldest first: main's first-parent chain without its first car (known good) and its tip (known faulty). */
export function bisectCandidates(s: RepoState): string[] {
  return firstParentChain(s, s.branches.main).reverse().slice(1, -1);
}

const culpritId = (station: BisectStation, s: RepoState) => firstParentChain(s, s.branches.main).find((id) => s.commits[id].label === station.culprit);

/** A car is faulty when the culprit is the car itself or behind it. */
export const faulty = (station: BisectStation, s: RepoState, id: string) => ancestors(s, id).has(culpritId(station, s) ?? '');

/** The culprit is cornered once a faulty car (or the tip) sits right behind a good one (or the first car). */
export function cornered(s: RepoState, probes: Record<string, boolean>): boolean {
  const chain = firstParentChain(s, s.branches.main).reverse();
  const known = (id: string, i: number) => (i === 0 ? false : i === chain.length - 1 ? true : probes[id]);
  return chain.some((id, i) => i > 0 && known(id, i) === true && known(chain[i - 1], i - 1) === false);
}

/** Binary-search probes needed in the worst case. */
export const bisectPar = (s: RepoState) => Math.ceil(Math.log2(bisectCandidates(s).length + 1));

// ---------- Validation ----------

/** Boards of a lesson: before, then after `run` (null without example or run). */
export function lessonBoards(station: Station, lesson: Lesson): [RepoState | null, RepoState | null] {
  if (!lesson.example) return [null, null];
  const before = build(lesson.example, station.cargo);
  return [before, lesson.run ? build(lesson.run, station.cargo, before) : null];
}

/** A lesson must not show the board the player is asked to reach or to predict. */
function tutorialErrors(station: Station): string[] {
  if (!station.tutorial.length) return ['tutoriel vide'];
  const last = isPlayed(station) ? goals(station).at(-1) : undefined;
  const goal = station.type === 'predict' ? predictBoards(station)[0] : last?.target ? build(last.target, station.cargo) : null;
  const mode = last?.match;
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

function playedErrors(station: PlayedStation): string[] {
  const errors: string[] = [];
  if (station.type === 'compo' && !station.target?.length) errors.push('composition sans cible');
  if (station.type === 'rules' && !station.rules?.length) errors.push('règlement sans règle');
  if (station.type === 'review') {
    if (station.phases.length < 2) errors.push('revue de quai à moins de deux étapes');
    station.phases.forEach((p, i) => !p.target?.length && !p.rules?.length && errors.push(`étape ${i + 1} sans cible ni règle`));
  }
  if (station.budget !== undefined && station.budget < station.par) errors.push(`budget ${station.budget} < par ${station.par}`);
  if (happenings(station).some((h) => h.after < 1)) errors.push('événement avant la première manœuvre');
  if (advance(station, 0, startBoard(station)) > 0) errors.push('déjà gagnée au départ');
  const { moves, phase, skipped } = play(station, station.solution);
  if (moves !== station.par) errors.push(`la solution prend ${moves} manœuvres, par ${station.par}`);
  if (phase !== goals(station).length) errors.push('la solution ne gagne pas');
  for (const p of skipped) errors.push(`étape ${p + 1} déjà remplie à son ouverture`);
  for (const h of happenings(station)) if (h.after > moves) errors.push(`événement après ${h.after} manœuvres jamais déclenché par la solution`);
  return errors;
}

function validateStation(station: Station): string[] {
  if (!Number.isInteger(station.line) || station.line < 1 || station.line > lines.length) {
    return [`ligne ${station.line} inconnue (1 à ${lines.length})`];
  }
  const errors: string[] = [];
  try {
    errors.push(...tutorialErrors(station));
    if (isGuess(station)) {
      if (station.wrong.length !== 2) errors.push(`${station.wrong.length} fausses réponses au lieu de 2`);
      const boards = predictBoards(station);
      const names = [...new Set(boards.flatMap(branchNames))];
      if (new Set(boards.map((b) => sig(b, names))).size !== boards.length) errors.push('deux réponses donnent le même plateau');
    } else if (station.type === 'enquete') {
      const board = startBoard(station);
      const onBoard = new Set([...Object.values(board.branches), ...Object.values(board.remote)].flatMap((t) => [...ancestors(board, t)]).map((id) => board.commits[id].label));
      if (!station.answer.length) errors.push('enquête sans réponse');
      if (new Set(station.answer).size !== station.answer.length) errors.push('réponse en double');
      for (const label of station.answer) if (!onBoard.has(label)) errors.push(`voiture ${label} absente du plateau`);
    } else if (station.type === 'bisect') {
      const board = startBoard(station);
      if (station.cargo) errors.push('recherche avec chargement : il trahirait la voiture fautive');
      if (bisectCandidates(board).length < 2) errors.push('moins de deux voitures à sonder');
      const id = culpritId(station, board);
      if (!id || id === firstParentChain(board, board.branches.main).at(-1)) errors.push(`voiture fautive ${station.culprit} absente de main ou première voiture (connue bonne)`);
      if (station.par !== bisectPar(board)) errors.push(`par ${station.par}, la recherche dichotomique en demande ${bisectPar(board)}`);
    } else errors.push(...playedErrors(station));
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

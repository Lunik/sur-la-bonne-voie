// Game session: moves, stars, budget, timer, undo, predictions, phases, events, inquiries, probes. Pure reducer, no React.
// ui/ reaches engine and levels through this module only (see docs/architecture.md).
import { build, type RepoState } from '../engine/index.ts';
import {
  advance, bisectCandidates, cornered, faulty, fire, goals, isGuess, isPlayed, predictBoards, runStep, sameCars, startBoard,
  type Goal, type Station, type Step,
} from '../levels/index.ts';

export { ancestors, build, emptyRepo, firstParentChain, orphans, stripPrimes, todoList, type Commit, type RepoState } from '../engine/index.ts';
export {
  bisectCandidates, goals, happenings, isGuess, isPlayed, lessonBoards, lines, rulesOf,
  type Goal, type Lesson, type Line, type Phase, type PlayedStation, type Station, type Step, type Train,
} from '../levels/index.ts';
export { stations } from '../levels/stations.ts';

export type LogLine =
  | { kind: 'command' | 'output' | 'error' | 'event'; text: string }
  | { kind: 'undo' };

export type Status = 'ready' | 'playing' | 'won' | 'failed';
export type Failure = 'budget' | 'timeout';

export interface Option {
  board: RepoState;
  /** Orders that produce the board (shown by a retro station). */
  commands: string[];
  /** `null` for the right answer. */
  why: string | null;
  ruledOut: boolean;
}

export interface Toast {
  tone: 'good' | 'bad' | 'info';
  text: string;
}

interface Snapshot {
  repo: RepoState;
  moves: number;
  phase: number;
}

export interface Session {
  station: Station;
  repo: RepoState;
  /** Target board of the current goal (composition, review) or the board after (retro), for the goal panel. */
  target: RepoState | null;
  moves: number;
  /** Current goal of a review; `goals.length` once won. */
  phase: number;
  history: Snapshot[];
  log: LogLine[];
  /** `ready` only for a timed station, until the player takes the post. */
  status: Status;
  failure: Failure | null;
  timeLeft: number | null;
  /** Predictions and retros: the three options, in display order. */
  options: Option[];
  /** Wrong guesses (predictions, retros) or wrong answers (inquiries). */
  wrongs: number;
  /** Bisect: commit id → faulty, for every probed car. */
  probes: Record<string, boolean>;
  /** Feedback of the last step; `null` keeps the UI's default message. */
  toast: Toast | null;
}

/** Feedback texts the reducer shows; they live in the UI's strings. */
export interface StepNotes {
  /** An inquiry refused a move. */
  readOnly: string;
  /** A review phase was met; the next remark sits in the goal panel. */
  phaseDone: string;
  /** A happening fired; its text sits in the terminal. */
  happened: string;
}

export type Action =
  /** `message` is shown when the step moves something. */
  | { type: 'step'; step: Step; message: string; notes: StepNotes }
  | { type: 'undo'; message: string; nothing: string }
  | { type: 'start' }
  | { type: 'tick'; seconds: number }
  | { type: 'guess'; option: number }
  /** Inquiry: the picked car labels. */
  | { type: 'answer'; labels: string[] }
  /** Bisect: the probed commit id. */
  | { type: 'probe'; id: string }
  | { type: 'toast'; toast: Toast | null };

const targetOf = (station: Station, goal: Goal | undefined): RepoState | null =>
  station.type === 'retro' ? predictBoards(station)[0] : goal?.target ? build(goal.target, station.cargo) : null;
const goalAt = (station: Station, phase: number) => (isPlayed(station) ? goals(station)[phase] : undefined);

/** `order` permutes the prediction boards (right answer is index 0); the caller shuffles, so the reducer stays pure. */
export function newSession(station: Station, order: number[] = [0, 1, 2]): Session {
  const guess = isGuess(station);
  const boards = guess ? predictBoards(station) : [];
  const answers = guess ? [{ commands: station.answer, why: null }, ...station.wrong.map((w) => ({ commands: w.commands, why: w.why }))] : [];
  const timeLimit = isPlayed(station) ? station.timeLimit : undefined;
  return {
    station,
    repo: guess ? build(station.start, station.cargo) : startBoard(station),
    target: targetOf(station, goalAt(station, 0)),
    moves: 0,
    phase: 0,
    history: [],
    log: [],
    status: timeLimit ? 'ready' : 'playing',
    failure: null,
    timeLeft: timeLimit ?? null,
    options: guess ? order.map((i) => ({ board: boards[i], ...answers[i], ruledOut: false })) : [],
    wrongs: 0,
    probes: {},
    toast: null,
  };
}

export const shuffled = (n: number, random = Math.random) =>
  Array.from({ length: n }, (_, i) => i)
    .map((i) => ({ i, k: random() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.i);

function step(session: Session, action: Extract<Action, { type: 'step' }>): Session {
  const { station } = session;
  const inquiry = station.type === 'enquete';
  if (session.status !== 'playing' || !(isPlayed(station) || inquiry)) return session;
  const result = runStep(session.repo, action.step);
  const echoed: LogLine[] = result.transcript.flatMap((e) => [
    { kind: 'command' as const, text: e.command },
    ...e.output.map((text) => ({ kind: 'output' as const, text })),
  ]);
  const refuse = (command: string, error: string, log: LogLine[]): Session => ({
    ...session,
    log: [...session.log, ...log, { kind: 'command', text: command }, { kind: 'error', text: error }],
    toast: { tone: 'bad', text: error },
  });
  if (!result.ok) return refuse(result.command, result.error, echoed);
  if (!isPlayed(station)) {
    // An inquiry only inspects: a step that would move something is refused whole.
    return result.moves ? refuse(result.transcript.at(-1)!.command, action.notes.readOnly, []) : { ...session, log: [...session.log, ...echoed] };
  }
  const moves = session.moves + result.moves;
  const { state: repo, fired } = fire(station, result.state, session.moves, moves);
  const phase = advance(station, session.phase, repo);
  const all = goals(station);
  const next: Session = {
    ...session,
    repo,
    moves,
    phase,
    // Once won, the last target stays on screen while the train leaves.
    target: phase === session.phase || phase === all.length ? session.target : targetOf(station, all[phase]),
    history: result.moves ? [...session.history, { repo: session.repo, moves: session.moves, phase: session.phase }] : session.history,
    log: [...session.log, ...echoed, ...fired.flatMap((f): LogLine[] => [{ kind: 'event', text: f.say }, ...f.output.map((text) => ({ kind: 'output' as const, text }))])],
    toast: fired.length ? { tone: 'info', text: action.notes.happened } : phase > session.phase && phase < all.length ? { tone: 'good', text: action.notes.phaseDone } : result.moves ? { tone: 'info', text: action.message } : session.toast,
  };
  if (phase === all.length) return { ...next, status: 'won' };
  if (station.budget !== undefined && moves >= station.budget) return { ...next, status: 'failed', failure: 'budget' };
  return next;
}

export function reduce(session: Session, action: Action): Session {
  switch (action.type) {
    case 'step':
      return step(session, action);
    case 'undo': {
      const last = session.history.at(-1);
      // Undo is offered after a budget failure, not after a timeout.
      if (!last || (session.status !== 'playing' && session.failure !== 'budget')) {
        return { ...session, toast: { tone: 'info', text: action.nothing } };
      }
      return {
        ...session,
        ...last,
        target: last.phase === session.phase ? session.target : targetOf(session.station, goalAt(session.station, last.phase)),
        history: session.history.slice(0, -1),
        log: [...session.log, { kind: 'undo' }],
        status: 'playing',
        failure: null,
        toast: { tone: 'info', text: action.message },
      };
    }
    case 'start':
      return session.status === 'ready' ? { ...session, status: 'playing' } : session;
    case 'tick': {
      if (session.status !== 'playing' || session.timeLeft === null) return session;
      const timeLeft = Math.max(0, session.timeLeft - action.seconds);
      return timeLeft > 0 ? { ...session, timeLeft } : { ...session, timeLeft, status: 'failed', failure: 'timeout' };
    }
    case 'guess': {
      const option = session.options[action.option];
      if (session.status !== 'playing' || !option || option.ruledOut) return session;
      if (option.why === null) {
        return { ...session, repo: option.board, status: 'won' };
      }
      return {
        ...session,
        wrongs: session.wrongs + 1,
        options: session.options.map((o, i) => (i === action.option ? { ...o, ruledOut: true } : o)),
      };
    }
    case 'answer': {
      const { station } = session;
      if (session.status !== 'playing' || station.type !== 'enquete' || !action.labels.length) return session;
      return sameCars(action.labels, station.answer) ? { ...session, status: 'won' } : { ...session, wrongs: session.wrongs + 1 };
    }
    case 'probe': {
      const { station, repo } = session;
      if (session.status !== 'playing' || station.type !== 'bisect' || action.id in session.probes || !bisectCandidates(repo).includes(action.id)) return session;
      const probes = { ...session.probes, [action.id]: faulty(station, repo, action.id) };
      return { ...session, probes, status: cornered(repo, probes) ? 'won' : 'playing' };
    }
    case 'toast':
      return { ...session, toast: action.toast };
  }
}

/** Moves (played) or probes (bisect): 3 within par, 2 at par + 1, else 1. Guesses and inquiries: 3 minus mistakes, at least 1. */
export function stars(session: Session): 1 | 2 | 3 {
  const { station } = session;
  const byPar = (n: number, par: number) => (n <= par ? 3 : n <= par + 1 ? 2 : 1);
  const n = isPlayed(station) ? byPar(session.moves, station.par)
    : station.type === 'bisect' ? byPar(Object.keys(session.probes).length, station.par)
    : 3 - session.wrongs;
  return Math.max(1, n) as 1 | 2 | 3;
}

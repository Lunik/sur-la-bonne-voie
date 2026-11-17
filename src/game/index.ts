// Game session: moves, stars, budget, timer, undo, predictions. Pure reducer, no React.
// ui/ reaches engine and levels through this module only (see docs/architecture.md).
import { build, type RepoState } from '../engine/index.ts';
import { isWon, predictBoards, runStep, startBoard, type Station, type Step } from '../levels/index.ts';

export { ancestors, build, emptyRepo, firstParentChain, orphans, stripPrimes, type Commit, type RepoState } from '../engine/index.ts';
export { allowedTools, lines, type Line, type Station, type Step, type Tool, type Train } from '../levels/index.ts';
export { stations } from '../levels/stations.ts';
export * from './gestures.ts';

export type LogLine =
  | { kind: 'command' | 'output' | 'error'; text: string }
  | { kind: 'undo' };

export type Status = 'ready' | 'playing' | 'won' | 'failed';
export type Failure = 'budget' | 'timeout';

export interface Option {
  board: RepoState;
  /** `null` for the right answer. */
  why: string | null;
  ruledOut: boolean;
}

export interface Toast {
  tone: 'good' | 'bad' | 'info';
  text: string;
}

export interface Session {
  station: Station;
  repo: RepoState;
  /** Target board of a composition, for the goal panel. */
  target: RepoState | null;
  moves: number;
  history: { repo: RepoState; moves: number }[];
  log: LogLine[];
  /** `ready` only for a timed station, until the player takes the post. */
  status: Status;
  failure: Failure | null;
  timeLeft: number | null;
  /** Predictions: the three boards, in display order. */
  options: Option[];
  wrongs: number;
  /** Feedback of the last step; `null` keeps the UI's default message. */
  toast: Toast | null;
}

export type Action =
  /** `message` is shown when the step moves something. */
  | { type: 'step'; step: Step; message: string }
  | { type: 'undo'; message: string; nothing: string }
  | { type: 'start' }
  | { type: 'tick'; seconds: number }
  | { type: 'guess'; option: number }
  | { type: 'toast'; toast: Toast | null };

/** `order` permutes the prediction boards (right answer is index 0); the caller shuffles, so the reducer stays pure. */
export function newSession(station: Station, order: number[] = [0, 1, 2]): Session {
  const predict = station.type === 'predict';
  const boards = predict ? predictBoards(station) : [];
  const whys = predict ? [null, ...station.wrong.map((w) => w.why)] : [];
  return {
    station,
    repo: predict ? build(station.start, station.cargo) : startBoard(station),
    target: !predict && station.target ? build(station.target, station.cargo) : null,
    moves: 0,
    history: [],
    log: [],
    status: !predict && station.timeLimit ? 'ready' : 'playing',
    failure: null,
    timeLeft: !predict && station.timeLimit ? station.timeLimit : null,
    options: predict ? order.map((i) => ({ board: boards[i], why: whys[i], ruledOut: false })) : [],
    wrongs: 0,
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
  if (session.status !== 'playing' || station.type === 'predict') return session;
  const result = runStep(session.repo, action.step);
  const echoed: LogLine[] = result.transcript.flatMap((e) => [
    { kind: 'command' as const, text: e.command },
    ...e.output.map((text) => ({ kind: 'output' as const, text })),
  ]);
  if (!result.ok) {
    return {
      ...session,
      log: [...session.log, ...echoed, { kind: 'command', text: result.command }, { kind: 'error', text: result.error }],
      toast: { tone: 'bad', text: result.error },
      };
  }
  const moves = session.moves + result.moves;
  const next: Session = {
    ...session,
    repo: result.state,
    moves,
    history: result.moves ? [...session.history, { repo: session.repo, moves: session.moves }] : session.history,
    log: [...session.log, ...echoed],
    toast: result.moves ? { tone: 'info', text: action.message } : session.toast,
  };
  if (isWon(station, next.repo)) return { ...next, status: 'won' };
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
        repo: last.repo,
        moves: last.moves,
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
    case 'toast':
      return { ...session, toast: action.toast };
  }
}

/** Compositions and rules: 3 within par, 2 at par + 1, else 1. Predictions: 3 minus mistakes, at least 1. */
export function stars(session: Session): 1 | 2 | 3 {
  const { station } = session;
  const n = station.type === 'predict' ? 3 - session.wrongs : session.moves <= station.par ? 3 : session.moves <= station.par + 1 ? 2 : 1;
  return Math.max(1, n) as 1 | 2 | 3;
}

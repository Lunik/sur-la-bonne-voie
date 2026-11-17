// Game session: moves, stars, budget, timer, undo. Pure reducer, no React.
import { emptyRepo, exec, type RepoState } from '../engine/index.ts';
import { stations, type Station } from '../levels/index.ts';

export interface Session {
  station: Station | undefined;
  repo: RepoState;
  moves: number;
  log: string[];
}

export type Action = { type: 'command'; line: string };

export function newSession(station: Station | undefined = stations[0]): Session {
  return { station, repo: emptyRepo(), moves: 0, log: [] };
}

export function reduce(session: Session, action: Action): Session {
  const result = exec(session.repo, action.line);
  if (!result.ok) return { ...session, log: [...session.log, result.error] };
  return {
    ...session,
    repo: result.state,
    moves: session.moves + (result.move ? 1 : 0),
    log: [...session.log, ...result.output],
  };
}

// Game session: moves, stars, budget, timer, undo. Pure reducer, no React.
import { build, exec, type RepoState } from '../engine/index.ts';
import { startBoard, type Station } from '../levels/index.ts';
import { stations } from '../levels/stations.ts';

export interface Session {
  station: Station;
  repo: RepoState;
  moves: number;
  log: string[];
}

export type Action = { type: 'command'; line: string };

export function newSession(station: Station = stations[0]): Session {
  const repo = station.type === 'predict' ? build(station.start, station.cargo) : startBoard(station);
  return { station, repo, moves: 0, log: [] };
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

import { useEffect, useRef } from 'react';
import { emptyRepo, orphans, type Commit, type RepoState, type Session, type Toast } from '../game/index.ts';
import { strings } from './strings.ts';
import { fr } from './typography.ts';
import { CarToken, LocoToken, Yard } from './Yard.tsx';

export interface BoardProps {
  session: Session;
  /** Feedback line, shown on the yard next to the action. */
  message: Toast;
}

/** The live yard: display only, every move is typed in the terminal. */
export function Board({ session, message }: BoardProps) {
  const { repo, station } = session;
  const yard = useRef<HTMLDivElement>(null);

  // Shake the board when a command is refused.
  const last = session.log.at(-1);
  useEffect(() => {
    if (last?.kind !== 'error' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    yard.current?.animate([{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 350);
  }, [last]);

  return (
    <>
      <div className="yard-box">
        <Yard ref={yard} repo={repo} variant="live" leaving={session.status === 'won' && station.type !== 'predict'} />
        {station.type !== 'predict' && <p className={`toast ${message.tone}`} aria-live="polite">{fr(message.text)}</p>}
      </div>
      <Platform repo={repo} />
      <Siding repo={repo} />
      <Legend line={station.line} />
    </>
  );
}
/** Cars unhooked by `reset --soft`/`--mixed` (the staged changes): the next commit welds them. */
export function Platform({ repo }: { repo: RepoState }) {
  if (!repo.pending.length) return null;
  return (
    <div className="casse platform">
      <p>{strings.platform}</p>
      {repo.pending.map((id) => (
        <span key={id} title={strings.platformCar(repo.commits[id].label)}>
          <CarToken repo={repo} commit={repo.commits[id]} />
        </span>
      ))}
      <p>{strings.platformAfter[0]}<code>{strings.platformAfter[1]}</code>{strings.platformAfter[2]}</p>
    </div>
  );
}

/** Cars no track leads to any more (reset --hard, rebase): recoverable through reflog. */
export function Siding({ repo }: { repo: RepoState }) {
  const siding = orphans(repo);
  if (!siding.length) return null;
  return (
    <div className="casse">
      <p>{strings.siding}</p>
      {siding.map((id) => (
        <span key={id} className="gw" title={strings.sidingCar(repo.commits[id].label)}>
          <CarToken repo={repo} commit={repo.commits[id]} />
        </span>
      ))}
    </div>
  );
}

const sample = (patch: Partial<Commit> & { label: string }): Commit => ({ id: 'x', parents: [], origin: 'main', kind: 'normal', cargo: null, ...patch });
const legendRepo: RepoState = { ...emptyRepo(), commits: { m: sample({ label: 'D' }) } };

function Legend({ line }: { line: number }) {
  const l = strings.legend;
  const items: [string, Commit, string][] = [];
  if (line >= 2) items.push(['fresh', sample({ label: 'C′', origin: 'feature' }), l.fresh], ['merge', sample({ label: 'M', kind: 'merge', parents: ['m', 'm'] }), l.merge]);
  if (line >= 3) items.push(['cargo', sample({ label: 'D', cargo: 'debug' }), l.cargo]);
  if (line >= 4) items.push(['colleague', sample({ label: 'G', origin: 'collègue' }), l.colleague], ['revert', sample({ label: '↩C', kind: 'revert' }), l.revert]);
  return (
    <ul className="legend">
      <li><LocoToken />{l.head}</li>
      {items.map(([key, c, text]) => <li key={key}><CarToken repo={legendRepo} commit={c} />{text}</li>)}
      {line >= 4 && <li><CarToken repo={legendRepo} commit={sample({ label: 'A' })} gone />{l.gone}</li>}
    </ul>
  );
}

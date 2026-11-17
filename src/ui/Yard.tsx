import { useId, type HTMLAttributes, type Ref } from 'react';
import { ancestors, stripPrimes, type Commit, type RepoState } from '../game/index.ts';
import { Icon } from './Icon.tsx';
import { lastColumn, layout, livery } from './layout.ts';
import { strings } from './strings.ts';

const slots = (n: number, extra = '') => `calc(var(--slot) * ${n}${extra})`;
const LOCO_PATH = 'M3,10 Q3,7 7,7 H58 C78,7 92,20 101,40 Q103,44 103,48 Q103,52 99,52 H5 Q3,52 3,50 Z';

/** HEAD: the yellow-banded locomotive. */
export function Loco() {
  const clip = useId();
  return (
    <svg viewBox="0 0 104 63" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={clip}><path d={LOCO_PATH} /></clipPath></defs>
      <rect className="mgw" x="-8" y="19" width="9" height="20" rx="2" />
      <path className="mp" d="M18 7 L27 1 L36 7 M22 1 H32" />
      <path className="mb" d={LOCO_PATH} />
      <g clipPath={`url(#${clip})`}>
        <rect className="mr" x="0" y="0" width="110" height="13" />
        <path className="ml" d="M0,41 H56 C72,41 87,36 106,28 V35 C87,43 72,47 56,47 H0 Z" />
      </g>
      <rect className="mg" x="9" y="16" width="46" height="16" rx="3" />
      <text className="mt" x="32" y="27.2" textAnchor="middle">HEAD</text>
      <path className="mg" d="M61,16 H68 C78,17 86,24 91,32 H61 Z" />
      <ellipse className="mh" cx="99.5" cy="45" rx="2.2" ry="1.5" />
      <rect className="mw" x="10" y="52" width="24" height="6" rx="2" />
      <rect className="mw" x="62" y="52" width="24" height="6" rx="2" />
      {[16, 28, 68, 80].map((cx) => <circle key={cx} className="mwh" cx={cx} cy="59" r="3.6" />)}
    </svg>
  );
}

interface CarProps {
  repo: RepoState;
  commit: Commit;
  row: string;
  col?: number;
  first?: boolean;
  gone?: boolean;
  flags?: { name: string; remote: boolean }[];
  className?: string;
}

/** One commit. `data-id` / `data-from` drive the gestures. */
export function Car({ repo, commit: c, row, col, first, gone, flags = [], className = '' }: CarProps) {
  const cls = c.kind === 'merge' ? 'cm' : c.kind === 'revert' ? 'cr' : `c${livery(repo, c.origin)}`;
  const classes = ['wagon', cls, c.label.includes('′') && 'fresh', stripPrimes(c.label).length > 2 && 'long', first && 'first', className].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      style={col === undefined ? undefined : { left: slots(col, ' + 4px') }}
      data-id={c.id}
      data-from={row}
      title={strings.carTitle(c.label, c.cargo, !!gone)}
    >
      <span className="gl">
        <b>{c.kind === 'merge' ? <>M<small>+{stripPrimes(repo.commits[c.parents[1]].label)}</small></> : c.label}</b>
      </span>
      <span className="lv" />
      <span className="bg l" />
      <span className="bg r" />
      {c.cargo && <span className="pl" />}
      {gone && <span className="dep"><Icon name="dep" /></span>}
      {flags.length > 0 && (
        <span className="flag">{flags.map((f) => <span key={f.name} className={f.remote ? 'r' : ''}>{f.name}</span>)}</span>
      )}
    </div>
  );
}

interface YardProps extends HTMLAttributes<HTMLDivElement> {
  repo: RepoState;
  /** `live`: the playable board. `mini`: goal and predictions. `deco`: header art. */
  variant: 'live' | 'mini' | 'deco';
  fresh?: string[];
  selected?: string | null;
  grab?: boolean;
  dropRow?: string | null;
  leaving?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Yard({ repo: s, variant, fresh = [], selected, grab, dropRow, leaving, className = '', ...rest }: YardProps) {
  const live = variant === 'live';
  const deco = variant === 'deco';
  const withLoco = live || deco;
  const rows = layout(s);
  const max = lastColumn(s, rows, withLoco);
  const width = slots(max + 2, ` + ${withLoco ? 36 : 12}px`);

  const flags = new Map<string, { name: string; remote: boolean }[]>();
  const flag = (id: string, name: string, remote: boolean) => flags.set(id, [...(flags.get(id) ?? []), { name, remote }]);
  for (const [b, id] of Object.entries(s.branches)) flag(id, b, false);
  for (const [b, id] of Object.entries(s.remote)) flag(id, `origin/${b}`, true);
  const gone = new Set<string>();
  for (const tip of Object.values(s.remote)) for (const id of ancestors(s, tip)) gone.add(id);

  return (
    <div
      className={['yard', variant !== 'live' && variant, leaving && 'leave', className].filter(Boolean).join(' ')}
      aria-hidden={deco || undefined}
      {...rest}
    >
      {rows.map((r, ri) => {
        const isHead = r.kind === 'local' && s.head === r.name;
        return (
          <div
            key={r.name}
            className={['voie', isHead && 'go', r.kind === 'remote' && 'remote', dropRow === r.name && 'drop-ok'].filter(Boolean).join(' ')}
            data-row={r.kind === 'local' ? r.name : undefined}
            data-remote={r.kind === 'remote' || undefined}
          >
            {!deco && (live && r.kind === 'local' ? (
              <button type="button" className={`sign${isHead ? ' head' : ''}`} data-sw={r.name}>
                {r.name}
                <small>{isHead ? <><em>{strings.signHead}</em>{strings.signHeadHere}</> : strings.signDriveHere}</small>
              </button>
            ) : (
              <span className="sign">{r.name}<small>{r.kind === 'remote' ? strings.signRemote : ''}</small></span>
            ))}
            <div className="track" style={{ width }}>
              <span className="rail" style={{ left: slots(Math.max(r.fork + 1, 0)) }} />
              {r.fork >= 0 && (
                <svg
                  className="fork"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={{ left: slots(r.fork + 1, ' - var(--slot) * .9'), width: 'calc(var(--slot) * .9)', height: `calc(${ri - r.forkRow} * (var(--rowh) + var(--gap)))` }}
                >
                  <path className="r1" d="M0,0 C55,0 45,100 100,100" />
                  <path className="r2" d="M0,0 C55,0 45,100 100,100" />
                </svg>
              )}
              {r.cells.map((cell, j) => {
                // Off the live board, a flag naming a row that has its own cars is redundant.
                const fl = deco ? [] : (flags.get(cell.id) ?? []).filter((f) => live || !rows.some((rr) => rr.name === f.name && rr.cells.length));
                return (
                  <Car
                    key={cell.id}
                    repo={s}
                    commit={s.commits[cell.id]}
                    row={r.name}
                    col={cell.col}
                    first={j === 0 && r.fork < 0}
                    gone={gone.has(cell.id)}
                    flags={fl}
                    className={[live && fresh.includes(cell.id) && 'new', live && selected === cell.id && 'sel', live && grab && 'grab'].filter(Boolean).join(' ')}
                  />
                );
              })}
              {isHead && withLoco && (
                <div className="loco" style={{ left: slots((r.cells.at(-1)?.col ?? r.fork) + 1, ' + 4px') }}><Loco /></div>
              )}
              {live && <span className="bumper" style={{ left: slots(max + 1, ' + 34px') }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

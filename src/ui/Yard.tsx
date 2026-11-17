import { use, useId, useLayoutEffect, useRef, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import { ancestors, stripPrimes, type Commit, type RepoState } from '../game/index.ts';
import { lastColumn, layout, livery, type Row } from './layout.ts';
import { strings } from './strings.ts';
import { TrainContext, trains } from './trains.tsx';

// Board geometry in SVG units (1 unit = 1 px at scale 1; CSS `--k` scales the whole board).
const SLOT = 78; // car pitch
const CAR_W = 70;
const CAR_H = 34;
const ROW = 88; // row pitch
const BODY_Y = 28; // car y = 0 within a row; bodies rise to y -7 to match their locomotive, flags sit above
const RAIL_Y = BODY_Y + CAR_H + 9; // rail line within a row
const PAD = 14;
const LOCO_W = 100;
const MOVE_MS = 550;
const EASE = 'cubic-bezier(.25,.8,.25,1)';

const carX = (col: number) => PAD + col * SLOT;
const translate = (x: number, y: number) => `translate(${x}px, ${y}px)`;

interface Flag {
  name: string;
  remote: boolean;
}

interface CarBodyProps {
  repo: RepoState;
  commit: Commit;
  /** Draws the coupler to the car on the left. */
  coupled?: boolean;
  gone?: boolean;
  flags?: Flag[];
  selected?: boolean;
}

/** One commit, drawn side-on in local coordinates (body from x 0 to CAR_W, roof at y -4..-7 to CAR_H; wheels sit on y = CAR_H + 9). */
export function CarBody({ repo, commit: c, coupled, gone, flags = [], selected }: CarBodyProps) {
  const raw = stripPrimes(c.label);
  const recreated = c.label.includes('′');
  const kind = c.kind === 'merge' ? 'merge' : c.kind === 'revert' ? 'revert' : `c${livery(repo, c.origin)}`;
  const flagWidths = flags.map((f) => f.name.length * 6.1 + 10);
  const flagX = flagWidths.map((_, i) => flagWidths.slice(0, i).reduce((sum, w) => sum + w + 3, 0));
  const train = use(TrainContext);
  return (
    <g className={`car-body t-${train} ${kind}`}>
      {selected && <rect className="sel" x={-5} y={-12} width={CAR_W + 10} height={CAR_H + 25} rx={8} />}
      {coupled && trains[train].link}
      {trains[train].car}
      {recreated ? (
        <>
          <rect className="stripe" x={1} y={23} width={CAR_W - 2} height={2} />
          <rect className="stripe" x={1} y={27} width={CAR_W - 2} height={2} />
        </>
      ) : (
        <rect className="stripe" x={1} y={24} width={CAR_W - 2} height={4} />
      )}
      <text className={`label${raw.length > 2 ? ' long' : ''}`} x={CAR_W / 2} y={17}>
        {c.kind === 'merge' ? <>M<tspan className="sub" dx={1}>+{stripPrimes(repo.commits[c.parents[1]].label)}</tspan></> : c.label}
      </text>
      {c.cargo && <rect className="cargo" x={7} y={8.5} width={7} height={7} rx={1} transform="rotate(45 10.5 12)" />}
      {gone && (
        <g className="gone" transform={`translate(${CAR_W - 3} -6)`}>
          <circle r={7} />
          <path d="M-2.6 2.6 L2.6 -2.6 M-1 -2.6 H2.6 V1" />
        </g>
      )}
      {flags.map((f, i) => (
        <g key={f.name} className={`flag${f.remote ? ' remote' : ''}`} transform={`translate(${flagX[i]} ${-BODY_Y + 2})`}>
          <rect width={flagWidths[i]} height={15} rx={3} />
          <text x={flagWidths[i] / 2} y={11}>{f.name}</text>
        </g>
      ))}
    </g>
  );
}

/** HEAD: the station's locomotive (or cab car), nose to the right, its front painted signal yellow. Same baseline as a car. */
export function LocoBody() {
  const clip = useId();
  const train = use(TrainContext);
  const { outline, nose, roof, paint, front } = trains[train].loco;
  return (
    <g className={`loco-body t-${train}`}>
      {trains[train].link}
      {roof}
      <path className="body" d={outline} />
      <g clipPath={`url(#${clip})`}>
        {paint}
        <rect className="nose" x={nose} y={-10} width={110 - nose} height={50} />
      </g>
      <defs><clipPath id={clip}><path d={outline} /></clipPath></defs>
      {front}
    </g>
  );
}

/** The locomotive alone, for the legend. */
export function LocoToken() {
  return (
    <svg className="loco-token" viewBox={`-2 -16 ${LOCO_W + 4} ${CAR_H + 26}`} aria-hidden="true">
      <LocoBody />
    </svg>
  );
}

/** A lone car in its own small SVG: drag ghost, siding, legend. */
export function CarToken({ repo, commit, gone, className = '' }: { repo: RepoState; commit: Commit; gone?: boolean; className?: string }) {
  return (
    <svg className={`car-token ${className}`} viewBox={`-6 -16 ${CAR_W + 12} ${CAR_H + 28}`} aria-hidden="true">
      <CarBody repo={repo} commit={commit} gone={gone} />
    </svg>
  );
}

interface Placed {
  id: string;
  row: Row;
  x: number;
  y: number;
  coupled: boolean;
  tip: boolean;
}

interface YardProps extends HTMLAttributes<HTMLDivElement> {
  repo: RepoState;
  /** `live`: the playable board. `mini`: goal and predictions. `deco`: header art. */
  variant: 'live' | 'mini' | 'deco';
  selected?: string | null;
  grab?: boolean;
  dropRow?: string | null;
  leaving?: boolean;
  ref?: Ref<HTMLDivElement>;
}

export function Yard({ repo: s, variant, selected, grab, dropRow, leaving, className = '', ...rest }: YardProps) {
  const live = variant === 'live';
  const deco = variant === 'deco';
  const withLoco = live || deco;
  const rows = layout(s);
  const max = lastColumn(s, rows, withLoco);
  const trackEnd = carX(max + 1) + (withLoco ? LOCO_W - SLOT + 26 : 12);
  const width = trackEnd + 12;
  const height = rows.length * ROW;
  const railY = (ri: number) => ri * ROW + RAIL_Y;

  const flags = new Map<string, Flag[]>();
  const flag = (id: string, name: string, remote: boolean) => flags.set(id, [...(flags.get(id) ?? []), { name, remote }]);
  for (const [b, id] of Object.entries(s.branches)) flag(id, b, false);
  for (const [b, id] of Object.entries(s.remote)) flag(id, `origin/${b}`, true);
  const gone = new Set<string>();
  for (const tip of Object.values(s.remote)) for (const id of ancestors(s, tip)) gone.add(id);

  const placed: Placed[] = rows.flatMap((r, ri) =>
    r.cells.map((cell, j) => ({
      id: cell.id, row: r, x: carX(cell.col), y: ri * ROW + BODY_Y,
      coupled: j > 0 || r.fork >= 0, tip: j === r.cells.length - 1,
    })),
  );
  const headIndex = rows.findIndex((r) => r.kind === 'local' && r.name === s.head);
  const headRow = rows[headIndex];
  const loco = withLoco && headRow ? { x: carX((headRow.cells.at(-1)?.col ?? headRow.fork) + 1), y: headIndex * ROW + BODY_Y } : null;

  // ---- Motion (live board only). Nothing leaves the rails: rolling stock only rolls along its own track.
  // A new car, or a car that now belongs to another track, is coupled in place; the locomotive changes
  // track by pulling away and reappearing on the new one. ----
  const els = useRef(new Map<string, SVGGElement>());
  const locoEl = useRef<SVGGElement>(null);
  const prev = useRef<{ cars: Map<string, { x: number; y: number; row: string }>; loco: typeof loco } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!live) return;
    const before = prev.current;
    if (before && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const roll = (el: SVGGElement, x0: number, x1: number, y: number) =>
        el.animate([{ transform: translate(x0, y) }, { transform: translate(x1, y) }], { duration: MOVE_MS, easing: EASE });
      for (const p of placed) {
        const el = els.current.get(p.id);
        if (!el) continue;
        const b = before.cars.get(p.id);
        if (b && b.row === p.row.name) {
          // Same track: roll. A whole track that changed height snaps with its rails.
          if (b.y === p.y && b.x !== p.x) roll(el, b.x, p.x, p.y);
          continue;
        }
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200, easing: 'ease-out', fill: 'backwards' });
      }
      const lo = locoEl.current;
      const bl = before.loco;
      if (lo && bl && loco) {
        if (bl.y === loco.y) {
          if (bl.x !== loco.x) roll(lo, bl.x, loco.x, loco.y);
        } else {
          lo.animate([
            { transform: translate(bl.x, bl.y), opacity: 1 },
            { transform: translate(bl.x + 28, bl.y), opacity: 0, offset: 0.45 },
            { transform: translate(loco.x, loco.y), opacity: 0, offset: 0.55 },
            { transform: translate(loco.x, loco.y), opacity: 1 },
          ], { duration: MOVE_MS * 1.4, easing: 'ease-in-out' });
        }
      }
    }
    prev.current = { cars: new Map(placed.map((p) => [p.id, { x: p.x, y: p.y, row: p.row.name }])), loco };
  });

  // Keep the locomotive in view on a long train (narrow screens).
  const locoX = loco?.x;
  const locoY = loco?.y;
  useLayoutEffect(() => {
    const sc = scroller.current;
    if (!live || !sc || locoX === undefined) return;
    const k = sc.scrollWidth / width;
    const left = locoX * k;
    const right = (locoX + LOCO_W) * k;
    if (left < sc.scrollLeft || right > sc.scrollLeft + sc.clientWidth) {
      sc.scrollTo({ left: right - sc.clientWidth + 24, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [live, locoX, locoY, width]);

  const size = deco ? undefined : ({ width: `calc(${width}px * var(--k))`, height: `calc(${height}px * var(--k))` } as CSSProperties);

  return (
    <div className={['yard', `yard-${variant}`, grab && 'grab', className].filter(Boolean).join(' ')} aria-hidden={deco || undefined} {...rest}>
      {!deco && (
        <div className="signs">
          {rows.map((r) => {
            const isHead = r.kind === 'local' && r.name === s.head;
            const cls = ['sign', live && isHead && 'head', r.kind === 'remote' && 'remote', dropRow === r.name && 'drop'].filter(Boolean).join(' ');
            return (
              <div key={r.name} className="sign-cell">
                {live && r.kind === 'local' ? (
                  <button type="button" className={cls} data-sw={r.name} data-lane={r.name}>
                    <span className="sign-name">{r.name}</span>
                    <small>{isHead ? strings.signHeadHere : strings.signDriveHere}</small>
                  </button>
                ) : (
                  <span className={cls} data-lane={r.name} data-remote={r.kind === 'remote' || undefined}>
                    <span className="sign-name">{r.name}</span>
                    {r.kind === 'remote' && live && <small>{strings.signRemote}</small>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="tracks" ref={scroller}>
        <svg viewBox={`0 0 ${width} ${height}`} style={size} role={live ? 'img' : undefined} aria-label={live ? strings.yard : undefined}>
          {rows.map((r, ri) => (
            <rect
              key={`lane-${r.name}`}
              className={`lane${dropRow === r.name ? ' drop' : ''}`}
              x={0}
              y={ri * ROW}
              width={width}
              height={ROW}
              data-lane={r.name}
              data-remote={r.kind === 'remote' || undefined}
            />
          ))}
          {rows.map((r, ri) => {
            const start = r.fork >= 0 ? carX(r.fork + 1) - 6 : PAD - 8;
            const y = railY(ri);
            const curve = r.fork >= 0
              ? (() => {
                  const x0 = carX(r.fork) + CAR_W * 0.35;
                  const y0 = railY(r.forkRow);
                  const x1 = start;
                  const w = x1 - x0;
                  return `M${x0} ${y0} C${x0 + w * 0.55} ${y0} ${x1 - w * 0.45} ${y} ${x1} ${y}`;
                })()
              : null;
            // Open line on the right, toward origin, so a departing train never crosses a buffer.
            const track = `M${start} ${y} H${live || deco ? trackEnd + 2000 : trackEnd}`;
            return (
              <g key={`track-${r.name}`} className={`track${r.kind === 'remote' ? ' remote' : ''}`}>
                {curve && <path className="sleepers" d={curve} />}
                <path className="sleepers" d={track} transform="translate(0 3)" />
                {curve && <path className="rail" d={curve} />}
                <path className="rail" d={track} />
                {!deco && r.fork < 0 && (
                  <g className="buffer" transform={`translate(${start - 5} ${y})`}>
                    <rect x={0} y={-15} width={5} height={15} rx={1} />
                    <circle cx={2.5} cy={-11} r={1.8} />
                  </g>
                )}
              </g>
            );
          })}
          {placed.map((p) => {
            const isHead = withLoco && p.row.name === s.head;
            const fl = deco ? [] : (flags.get(p.id) ?? []).filter((f) => live || !rows.some((rr) => rr.name === f.name && rr.cells.length));
            return (
              <g
                key={p.id}
                ref={(el) => {
                  if (el) els.current.set(p.id, el);
                  else els.current.delete(p.id);
                }}
                className={['car', isHead && leaving && 'depart', isHead && deco && 'roll-in'].filter(Boolean).join(' ')}
                style={{ transform: translate(p.x, p.y) }}
                data-id={p.id}
                data-from={p.row.name}
                data-lane={p.row.name}
                data-remote={p.row.kind === 'remote' || undefined}
              >
                <title>{strings.carTitle(s.commits[p.id].label, s.commits[p.id].cargo, gone.has(p.id))}</title>
                <CarBody repo={s} commit={s.commits[p.id]} coupled={p.coupled} gone={gone.has(p.id)} flags={fl} selected={live && selected === p.id} />
              </g>
            );
          })}
          {loco && (
            <g ref={locoEl} className={['loco', leaving && 'depart', deco && 'roll-in'].filter(Boolean).join(' ')} style={{ transform: translate(loco.x, loco.y) }}>
              <LocoBody />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

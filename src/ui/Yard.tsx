import { useId, useLayoutEffect, useRef, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import { ancestors, stripPrimes, type Commit, type RepoState } from '../game/index.ts';
import { lastColumn, layout, livery, type Row } from './layout.ts';
import { strings } from './strings.ts';

// Board geometry in SVG units (1 unit = 1 px at scale 1; CSS `--k` scales the whole board).
const SLOT = 78; // car pitch
const CAR_W = 70;
const CAR_H = 34;
const ROW = 88; // row pitch
const BODY_Y = 22; // car body top within a row, leaves room for the flags
const RAIL_Y = BODY_Y + CAR_H + 9; // rail line within a row
const PAD = 14;
const LOCO_W = 100;
const ENTER_MS = 600;

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

/** One commit, drawn side-on in local coordinates (body from 0,0 to CAR_W,CAR_H; wheels sit on y = CAR_H + 9). */
export function CarBody({ repo, commit: c, coupled, gone, flags = [], selected }: CarBodyProps) {
  const raw = stripPrimes(c.label);
  const recreated = c.label.includes('′');
  const kind = c.kind === 'merge' ? 'merge' : c.kind === 'revert' ? 'revert' : `c${livery(repo, c.origin)}`;
  const flagWidths = flags.map((f) => f.name.length * 6.1 + 10);
  const flagX = flagWidths.map((_, i) => flagWidths.slice(0, i).reduce((sum, w) => sum + w + 3, 0));
  return (
    <g className={`car-body ${kind}`}>
      {selected && <rect className="sel" x={-5} y={-7} width={CAR_W + 10} height={CAR_H + 20} rx={8} />}
      {coupled && <rect className="coupler" x={CAR_W - SLOT} y={CAR_H - 12} width={SLOT - CAR_W} height={3} />}
      <rect className="roof" x={9} y={-3} width={CAR_W - 18} height={4} rx={1.5} />
      <rect className="body" x={0.75} y={0.75} width={CAR_W - 1.5} height={CAR_H - 1.5} rx={6} />
      <rect className="pane" x={6} y={7} width={9} height={10} rx={2} />
      <rect className="pane" x={CAR_W - 15} y={7} width={9} height={10} rx={2} />
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
      <rect className="frame" x={7} y={CAR_H} width={18} height={2} rx={1} />
      <rect className="frame" x={CAR_W - 25} y={CAR_H} width={18} height={2} rx={1} />
      {[11, 21, CAR_W - 21, CAR_W - 11].map((cx) => <circle key={cx} className="wheel" cx={cx} cy={CAR_H + 4.5} r={3.6} />)}
      {c.cargo && <rect className="cargo" x={13} y={-10} width={8} height={8} rx={1} transform="rotate(45 17 -6)" />}
      {gone && (
        <g className="gone" transform={`translate(${CAR_W - 3} -2)`}>
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

/** HEAD: a modern locomotive, nose to the right, its front painted signal yellow. Same baseline as a car. */
export function LocoBody() {
  const clip = useId();
  const outline = 'M0 4 Q0 -6 9 -6 H58 C76 -6 90 8 97 24 Q100 31 95 34 H0 Z';
  return (
    <g className="loco-body">
      <rect className="coupler" x={CAR_W - SLOT} y={CAR_H - 12} width={SLOT - CAR_W} height={3} />
      <path className="panto" d="M22 -6 L30 -14 L38 -6 M26 -14 H34" />
      <path className="body" d={outline} />
      <g clipPath={`url(#${clip})`}>
        <rect className="nose" x={74} y={-8} width={30} height={44} />
        <rect className="nose" x={0} y={25} width={100} height={4} />
      </g>
      <defs><clipPath id={clip}><path d={outline} /></clipPath></defs>
      <path className="pane" d="M64 0 H70 C78 1 84 6 88 13 H64 Z" />
      <rect className="pane" x={7} y={4} width={10} height={10} rx={2} />
      <rect className="pane" x={21} y={4} width={10} height={10} rx={2} />
      <text className="head" x={47} y={20}>HEAD</text>
      <circle className="lamp" cx={94} cy={30} r={1.8} />
      <rect className="frame" x={8} y={CAR_H} width={20} height={2} rx={1} />
      <rect className="frame" x={62} y={CAR_H} width={20} height={2} rx={1} />
      {[13, 23, 67, 77].map((cx) => <circle key={cx} className="wheel" cx={cx} cy={CAR_H + 4.5} r={3.6} />)}
    </g>
  );
}

/** A lone car in its own small SVG: drag ghost, siding, legend. */
export function CarToken({ repo, commit, gone, className = '' }: { repo: RepoState; commit: Commit; gone?: boolean; className?: string }) {
  return (
    <svg className={`car-token ${className}`} viewBox={`-6 -12 ${CAR_W + 12} ${CAR_H + 24}`} aria-hidden="true">
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

  // ---- Motion (live board only). Moved cars glide by CSS transition; new cars enter from where they come from. ----
  const els = useRef(new Map<string, SVGGElement>());
  const prev = useRef<{ cars: Map<string, { x: number; y: number; label: string }>; loco: typeof loco } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!live) return;
    const before = prev.current;
    const now = new Map(placed.map((p) => [p.id, { x: p.x, y: p.y, label: s.commits[p.id].label }]));
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (before && !still) {
      for (const p of placed) {
        if (before.cars.has(p.id)) continue;
        const el = els.current.get(p.id);
        const c = s.commits[p.id];
        if (!el) continue;
        const key = stripPrimes(c.label);
        // A recreated car (rebase, cherry-pick, squash) leaves from its original.
        const source = c.kind !== 'merge'
          ? [...before.cars.values()].find((b) => stripPrimes(b.label) === key || (key.length > 1 && stripPrimes(b.label) === key[0]))
          : undefined;
        // A new car at the HEAD tip is coupled where the locomotive stood; anything else fades in from the left.
        const fromLoco = p.tip && p.row.name === s.head ? before.loco : null;
        const from = source ?? fromLoco ?? { x: p.x - SLOT / 2, y: p.y };
        const opacity = source || fromLoco ? 1 : 0;
        el.animate(
          [{ transform: translate(from.x, from.y), opacity }, { transform: translate(p.x, p.y), opacity: 1 }],
          { duration: ENTER_MS, easing: 'cubic-bezier(.25,.8,.25,1)' },
        );
      }
    }
    prev.current = { cars: now, loco };
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
            const track = `M${start} ${y} H${trackEnd}`;
            return (
              <g key={`track-${r.name}`} className={`track${r.kind === 'remote' ? ' remote' : ''}`}>
                {curve && <path className="sleepers" d={curve} />}
                <path className="sleepers" d={track} transform="translate(0 3)" />
                {curve && <path className="rail" d={curve} />}
                <path className="rail" d={track} />
                {!deco && (
                  <g className="buffer" transform={`translate(${trackEnd} ${y})`}>
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
            <g className={['loco', leaving && 'depart', deco && 'roll-in'].filter(Boolean).join(' ')} style={{ transform: translate(loco.x, loco.y) }}>
              <LocoBody />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// Pure board layout: which car goes on which row and column. No React, tested with node:test.
import { firstParentChain, type RepoState } from '../game/index.ts';

export interface Cell {
  id: string;
  col: number;
}

export interface Row {
  /** `main`, `feature`… or `origin/main`, `upstream/main`. */
  name: string;
  kind: 'local' | 'remote';
  /** Column of the car this row branches from; -1 for a row starting at the buffer. */
  fork: number;
  /** Row of that car; -1 if none. */
  forkRow: number;
  cells: Cell[];
}

/** main first, then the other local branches in order, then remote rows whose tip is not already placed. A car appears once. */
export function layout(s: RepoState): Row[] {
  const rows: Row[] = [];
  const placed = new Map<string, { row: number; col: number }>();
  const add = (name: string, kind: Row['kind'], tip: string) => {
    const chain: string[] = [];
    for (const id of firstParentChain(s, tip)) {
      if (placed.has(id)) break;
      chain.unshift(id);
    }
    // First already-placed car: the switch point. A row with no own car branches right at its tip.
    const forkId = chain.length ? s.commits[chain[0]].parents[0] : tip;
    const at = forkId ? placed.get(forkId) : undefined;
    const fork = at ? at.col : -1;
    const cells = chain.map((id, j) => ({ id, col: fork + 1 + j }));
    for (const c of cells) placed.set(c.id, { row: rows.length, col: c.col });
    rows.push({ name, kind, fork, forkRow: at ? at.row : -1, cells });
  };
  if (s.branches.main) add('main', 'local', s.branches.main);
  for (const b of s.order) if (b !== 'main' && s.branches[b]) add(b, 'local', s.branches[b]);
  for (const [ref, tip] of Object.entries(s.remote)) if (!placed.has(tip)) add(ref, 'remote', tip);
  return rows;
}

/** Livery index: 0 main, 1 and 2 for later branches, 3 for the colleague. */
export function livery(s: RepoState, origin: string): number {
  if (origin === 'collègue') return 3;
  const i = s.order.indexOf(origin);
  return i <= 0 ? 0 : Math.min(i, 2);
}

/** Last used column, plus one for the locomotive on the HEAD row. */
export function lastColumn(s: RepoState, rows: Row[], withLoco: boolean): number {
  let max = 0;
  for (const r of rows) {
    const end = (r.cells.at(-1)?.col ?? r.fork) + (withLoco && r.kind === 'local' && s.head === r.name ? 1 : 0);
    max = Math.max(max, end);
  }
  return max;
}

/**
 * Switch from (x0, y0) down to a lower track starting at (x1, y): quarter turn down, straight drop, quarter turn
 * right. The drop sits halfway, so every track leaving the same car shares the first turn and the drop: one trunk.
 */
export function switchPath(x0: number, y0: number, x1: number, y: number): string {
  const r = (x1 - x0) / 2;
  const xm = x0 + r;
  const k = r * 0.5523; // cubic approximation of a quarter circle
  return `M${x0} ${y0} C${x0 + k} ${y0} ${xm} ${y0 + r - k} ${xm} ${y0 + r} V${y - r} C${xm} ${y - r + k} ${x1 - k} ${y} ${x1} ${y}`;
}

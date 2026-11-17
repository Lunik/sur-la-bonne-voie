// Board gestures → Git commands. Each gesture is one nested step: atomic, and one move at most.
import { firstParentChain, type RepoState } from '../engine/index.ts';
import { allowedTools, type Station, type Step, type Tool } from '../levels/index.ts';

export const dragTools = ['rebase', 'merge', 'cherry-pick'] as const;
export const tapTools = ['squash', 'revert'] as const;
export const buttonTools = ['commit', 'branch', 'push', 'pull', 'pull-rebase'] as const;
export type DragTool = (typeof dragTools)[number];
export type TapTool = (typeof tapTools)[number];
export type BoardTool = DragTool | TapTool;
export type ButtonTool = (typeof buttonTools)[number];

export const isDragTool = (t: Tool | null): t is DragTool => (dragTools as readonly (Tool | null)[]).includes(t);
export const isTapTool = (t: Tool | null): t is TapTool => (tapTools as readonly (Tool | null)[]).includes(t);
export const isButtonTool = (t: Tool): t is ButtonTool => (buttonTools as readonly Tool[]).includes(t);

/** Tool selected on arrival: the station's, else rebase if unlocked, else the last unlocked board tool. */
export function defaultTool(station: Station): BoardTool | null {
  const board = allowedTools(station.line).filter((t): t is BoardTool => isDragTool(t) || isTapTool(t));
  if ('tool' in station && station.tool && (isDragTool(station.tool) || isTapTool(station.tool))) return station.tool;
  if (board.includes('rebase')) return 'rebase';
  return board.at(-1) ?? null;
}

const BRANCH_NAMES = ['feature', 'fix', 'release', 'hotfix'];

export function buttonStep(repo: RepoState, tool: ButtonTool): Step {
  switch (tool) {
    case 'commit':
      return 'commit';
    case 'branch':
      return `switch -c ${BRANCH_NAMES.find((n) => !Object.hasOwn(repo.branches, n)) ?? 'voie'}`;
    case 'push':
      return 'push';
    case 'pull':
      return 'pull';
    case 'pull-rebase':
      return 'pull --rebase';
  }
}

/** A car on the board: commit id and the row it sits on (`main`, `origin/main`…). */
export interface CarRef {
  id: string;
  row: string;
}

/** Why a gesture is refused before any command runs. */
export type Refusal = 'remote-fixed' | 'remote-untouchable' | 'squash-needs-two' | 'not-on-row' | 'same-row';

export type GestureResult = { step: Step } | { refusal: Refusal };

const isRemote = (row: string) => row.startsWith('origin/');

/** Drop a car of `car.row` onto row `to`. */
export function dragStep(repo: RepoState, tool: DragTool, car: CarRef, to: string): GestureResult {
  if (car.row === to) return { refusal: 'same-row' };
  if (isRemote(to)) return { refusal: 'remote-fixed' };
  const label = repo.commits[car.id].label;
  switch (tool) {
    case 'rebase':
      if (isRemote(car.row)) return { refusal: 'remote-fixed' };
      return { step: [`switch ${car.row}`, `rebase ${to}`] };
    case 'merge':
      return { step: [`switch ${to}`, `merge ${car.row}`] };
    case 'cherry-pick':
      return { step: [`switch ${to}`, `cherry-pick ${label}`] };
  }
}

/** Tap a car. Squash welds from that car to the tip of its row. */
export function tapStep(repo: RepoState, tool: TapTool, car: CarRef): GestureResult {
  if (isRemote(car.row)) return { refusal: 'remote-untouchable' };
  const tip = repo.branches[car.row];
  const k = firstParentChain(repo, tip).indexOf(car.id);
  if (k < 0) return { refusal: 'not-on-row' };
  if (tool === 'squash') {
    if (k < 1) return { refusal: 'squash-needs-two' };
    return { step: [`switch ${car.row}`, `reset --soft HEAD~${k + 1}`, 'commit'] };
  }
  return { step: [`switch ${car.row}`, `revert ${repo.commits[car.id].label}`] };
}

/** Tap a car of the siding: the current branch goes back to it. */
export const recoverStep = (repo: RepoState, id: string): Step => [`reset --hard ${repo.commits[id].label}`];

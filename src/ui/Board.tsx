import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  allowedTools, emptyRepo, dragStep, firstParentChain, isDragTool, isTapTool, orphans, recoverStep, tapStep,
  type BoardTool, type CarRef, type Commit, type RepoState, type Session, type Step, type Toast,
} from '../game/index.ts';
import { strings } from './strings.ts';
import { CarToken, LocoToken, Yard } from './Yard.tsx';

export interface BoardProps {
  session: Session;
  tool: BoardTool | null;
  gesturesOff: boolean;
  selected: CarRef | null;
  onSelect: (car: CarRef | null) => void;
  run: (step: Step, message: string) => void;
  toast: (toast: Toast) => void;
}

const DRAG_THRESHOLD = 8;
const isRemote = (row: string) => row.startsWith('origin/');

export function Board({ session, tool, gesturesOff, selected, onSelect, run, toast }: BoardProps) {
  const { repo, station } = session;
  const done = session.status !== 'playing';
  const yard = useRef<HTMLDivElement>(null);
  const drag = useRef<(CarRef & { x: number; y: number; moved: boolean }) | null>(null);
  const clickGuard = useRef(0);
  const [ghost, setGhost] = useState<(CarRef & { x: number; y: number }) | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const label = (id: string) => repo.commits[id].label;

  const dropOn = (car: CarRef, to: string) => {
    if (done || !isDragTool(tool)) return;
    const r = dragStep(repo, tool, car, to);
    if ('refusal' in r) return toast({ tone: 'bad', text: strings.refusal[r.refusal] });
    const message = tool === 'cherry-pick' ? strings.done['cherry-pick'](label(car.id), to) : strings.done[tool](car.row, to);
    run(r.step, message);
  };

  const tap = (car: CarRef) => {
    if (done || !isTapTool(tool)) return;
    const r = tapStep(repo, tool, car);
    if ('refusal' in r) return toast({ tone: 'bad', text: strings.refusal[r.refusal] });
    const welded = firstParentChain(repo, repo.branches[car.row]).indexOf(car.id) + 1;
    run(r.step, tool === 'squash' ? strings.done.squash(welded) : strings.done.revert(label(car.id)));
  };

  /** Row under the pointer, on this board only. */
  const rowAt = (x: number, y: number) => {
    const lane = document.elementFromPoint(x, y)?.closest<HTMLElement | SVGElement>('[data-lane]');
    if (!lane || !yard.current?.contains(lane)) return null;
    const remote = lane.dataset.remote !== undefined;
    return { row: remote ? null : lane.dataset.lane ?? null, remote };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const w = (e.target as Element).closest<SVGElement>('.car');
    if (!w || done || gesturesOff || !tool) return;
    drag.current = { id: w.dataset.id!, row: w.dataset.from!, x: e.clientX, y: e.clientY, moved: false };
  };

  // Document-level listeners so a drag keeps working outside the board. Re-bound each render to see the latest state.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || !isDragTool(tool)) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_THRESHOLD) d.moved = true;
      if (!d.moved) return;
      e.preventDefault();
      setGhost({ id: d.id, row: d.row, x: e.clientX, y: e.clientY });
      const hit = rowAt(e.clientX, e.clientY);
      setDropRow(hit?.row && hit.row !== d.row ? hit.row : null);
    };
    const up = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      clickGuard.current = performance.now() + 80;
      setGhost(null);
      setDropRow(null);
      if (isTapTool(tool)) {
        if (!d.moved) tap(d);
        return;
      }
      const hit = rowAt(e.clientX, e.clientY);
      if (d.moved) {
        if (hit?.row && hit.row !== d.row) dropOn(d, hit.row);
        else {
          toast({ tone: 'info', text: hit?.remote ? strings.toastRemoteFills : strings.toastDropElsewhere });
          onSelect(null);
        }
        return;
      }
      // Tap then tap: the second car names the destination row.
      if (selected && d.row !== selected.row && !isRemote(d.row)) return dropOn(selected, d.row);
      const next = selected?.id === d.id ? null : { id: d.id, row: d.row };
      onSelect(next);
      toast({ tone: 'info', text: next ? strings.toastPicked(label(d.id)) : '' });
    };
    const cancel = () => {
      drag.current = null;
      setGhost(null);
      setDropRow(null);
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
    };
  });

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element;
    const sign = target.closest<HTMLElement>('[data-sw]');
    if (sign) {
      const row = sign.dataset.sw!;
      if (done) return;
      if (selected && row !== selected.row && !gesturesOff) return dropOn(selected, row);
      if (gesturesOff && 'keyboardOnly' in station && station.keyboardOnly) return toast({ tone: 'bad', text: strings.toastSwitchKeyboard(row) });
      return run(`switch ${row}`, strings.done.switch(row));
    }
    if (performance.now() < clickGuard.current) return;
    const lane = target.closest<HTMLElement | SVGElement>('[data-lane]');
    const row = lane && lane.dataset.remote === undefined ? lane.dataset.lane : undefined;
    if (row && selected && row !== selected.row) dropOn(selected, row);
  };

  // Shake the board when a command is refused.
  const last = session.log.at(-1);
  useEffect(() => {
    if (last?.kind !== 'error' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    yard.current?.animate([{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], 350);
  }, [last]);

  const siding = orphans(repo);
  const canRecover = allowedTools(station.line).includes('recover');
  const recover = (id: string) => {
    if (done) return;
    if (!canRecover) return toast({ tone: 'info', text: strings.toastRecoverLater });
    if (gesturesOff && 'keyboardOnly' in station && station.keyboardOnly) return toast({ tone: 'bad', text: strings.toastRecoverKeyboard });
    run(recoverStep(repo, id), strings.done.recover(repo.head, label(id)));
  };

  return (
    <>
      <Yard
        ref={yard}
        repo={repo}
        variant="live"
        selected={selected?.id}
        grab={!gesturesOff && !!tool}
        dropRow={dropRow}
        leaving={session.status === 'won' && station.type !== 'predict'}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y }}>
          <CarToken repo={repo} commit={repo.commits[ghost.id]} />
        </div>
      )}
      {siding.length > 0 && (
        <div className="casse">
          <p>{strings.siding}{canRecover && station.type !== 'predict' ? strings.sidingRecover : ''}</p>
          {siding.map((id) => (
            <button key={id} type="button" className={`gw${canRecover ? ' can' : ''}`} aria-label={strings.sidingCar(label(id))} onClick={() => recover(id)}>
              <CarToken repo={repo} commit={repo.commits[id]} />
            </button>
          ))}
        </div>
      )}
      <Legend line={station.line} />
    </>
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

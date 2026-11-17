import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  allowedTools, dragStep, firstParentChain, isDragTool, isTapTool, orphans, recoverStep, tapStep,
  type BoardTool, type CarRef, type Session, type Step, type Toast,
} from '../game/index.ts';
import { strings } from './strings.ts';
import { Car, Yard } from './Yard.tsx';

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
    const v = document.elementFromPoint(x, y)?.closest<HTMLElement>('.voie');
    if (!v || !yard.current?.contains(v)) return null;
    return { row: v.dataset.row ?? null, remote: v.dataset.remote !== undefined };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const w = (e.target as Element).closest<HTMLElement>('.wagon');
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
    const row = target.closest<HTMLElement>('.voie[data-row]')?.dataset.row;
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
        aria-label={strings.yard}
        fresh={session.fresh}
        selected={selected?.id}
        grab={!gesturesOff && !!tool}
        dropRow={dropRow}
        leaving={session.status === 'won' && station.type !== 'predict'}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y }}>
          <Car repo={repo} commit={repo.commits[ghost.id]} row={ghost.row} />
        </div>
      )}
      {siding.length > 0 && (
        <div className="casse">
          <p>{strings.siding}{canRecover && station.type !== 'predict' ? strings.sidingRecover : ''}</p>
          {siding.map((id) => (
            <button key={id} type="button" className={`gw${canRecover ? ' can' : ''}`} aria-label={strings.sidingCar(label(id))} onClick={() => recover(id)}>
              <b>{label(id)}</b>
            </button>
          ))}
        </div>
      )}
      <Legend line={station.line} />
    </>
  );
}

function Legend({ line }: { line: number }) {
  const l = strings.legend;
  const items: [string, string][] = [['hd', l.head]];
  if (line >= 2) items.push(['fr', l.fresh], ['m', l.merge]);
  if (line >= 3) items.push(['hz', l.cargo]);
  if (line >= 4) items.push(['dp', l.gone], ['co', l.colleague], ['rv', l.revert]);
  return (
    <div className="legend">
      {items.map(([cls, text]) => <span key={cls}><i className={`sw ${cls}`} />{text}</span>)}
    </div>
  );
}

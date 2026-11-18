// Side panels of the station types that are not played in the terminal alone: inquiry, bisect, todo list.
import { useState } from 'react';
import { ancestors, bisectCandidates, firstParentChain, todoList, type RepoState, type Session, type Step } from '../game/index.ts';
import { strings } from './strings.ts';
import { CarToken } from './Yard.tsx';

const byAge = (a: string, b: string) => Number(a.slice(1)) - Number(b.slice(1));

/** Cars a track or origin leads to, oldest first. */
function boardCars(repo: RepoState): string[] {
  const ids = new Set<string>();
  for (const tip of [...Object.values(repo.branches), ...Object.values(repo.remote)]) for (const id of ancestors(repo, tip)) ids.add(id);
  return [...ids].sort(byAge);
}

/** « Enquête »: pick the cars of the answer, then submit. */
export function Inquiry({ session, onAnswer }: { session: Session; onAnswer: (labels: string[]) => void }) {
  const { repo, station } = session;
  const [picked, setPicked] = useState<string[]>([]);
  if (station.type !== 'enquete') return null;
  const won = session.status === 'won';
  const toggle = (label: string) => setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]));
  const [tone, text] = won ? ['good', strings.inquiryRight] : session.wrongs ? ['bad', strings.inquiryWrong(session.wrongs, station.answer.length)] : ['', ''];
  return (
    <section className="panel pick">
      <h3>{strings.inquiryTitle}</h3>
      <p className="small">{strings.inquiryText}</p>
      <div className="chips">
        {boardCars(repo).map((id) => {
          const label = repo.commits[id].label;
          const on = picked.includes(label);
          return (
            <button key={id} type="button" className={`chip${on ? ' on' : ''}`} aria-pressed={on} aria-label={strings.inquiryPick(label, on)} disabled={won} onClick={() => toggle(label)}>
              <CarToken repo={repo} commit={repo.commits[id]} />
            </button>
          );
        })}
      </div>
      <div className="row">
        <button className="btn" type="button" disabled={won || !picked.length} onClick={() => onAnswer(picked)}>{strings.inquirySubmit}</button>
      </div>
      <p className={`toast ${tone}`} aria-live="polite">{text}</p>
    </section>
  );
}

/** « Recherche de l'avarie »: probe cars of main; the first and last cars are known. */
export function Bisect({ session, onProbe }: { session: Session; onProbe: (id: string) => void }) {
  const { repo, station, probes } = session;
  if (station.type !== 'bisect') return null;
  const chain = firstParentChain(repo, repo.branches.main).reverse();
  const candidates = new Set(bisectCandidates(repo));
  const won = session.status === 'won';
  const verdict = (id: string, i: number) => (i === 0 ? false : i === chain.length - 1 ? true : probes[id]);
  return (
    <section className="panel pick">
      <h3>{strings.bisectTitle} <span className="small">{strings.bisectCount(Object.keys(probes).length)}</span></h3>
      <p className="small">{strings.bisectText}</p>
      <div className="chips">
        {chain.map((id, i) => {
          const v = verdict(id, i);
          const state = v === undefined ? strings.bisectUnknown : v ? strings.bisectBad : strings.bisectGood;
          const label = repo.commits[id].label;
          return (
            <button
              key={id}
              type="button"
              className={`chip probe${v === true ? ' bad' : v === false ? ' good' : ''}`}
              aria-label={strings.bisectCar(label, state)}
              disabled={won || !candidates.has(id) || v !== undefined}
              onClick={() => onProbe(id)}
            >
              <CarToken repo={repo} commit={repo.commits[id]} />
              <small>{state}</small>
            </button>
          );
        })}
      </div>
      {won && <p className="toast good" aria-live="polite">{strings.bisectFound(station.culprit)}</p>}
    </section>
  );
}

type TodoAction = keyof typeof strings.todoAction;
interface TodoRow {
  id: string;
  label: string;
  action: TodoAction;
}

/** « Feuille de route »: the `rebase -i` todo list as controls; it runs the command through the terminal. Remount it to reload the list. */
export function TodoEditor({ session, run }: { session: Session; run: (step: Step, message: string) => void }) {
  const { repo, station } = session;
  const base = 'todo' in station ? station.todo : undefined;
  const [rows, setRows] = useState<TodoRow[]>(() => (base ? todoList(repo, base).map((c) => ({ id: c.id, label: c.label, action: 'pick' })) : []));
  if (!base) return null;
  const playing = session.status === 'playing';
  const move = (i: number, by: number) =>
    setRows((r) => {
      const next = [...r];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const command = `rebase -i ${base} ${rows.map((r) => `${r.action}:${r.label}`).join(' ')}`;
  return (
    <section className="panel todo">
      <h3>{strings.todoTitle}</h3>
      <p className="small">{strings.todoText(base)}</p>
      {rows.length ? (
        <ol className="todo-list">
          {rows.map((r, i) => (
            <li key={r.id} className={r.action}>
              <select value={r.action} aria-label={strings.todoActionLabel(r.label)} disabled={!playing}
                onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, action: e.target.value as TodoAction } : x)))}>
                {(Object.keys(strings.todoAction) as TodoAction[]).map((a) => <option key={a} value={a}>{strings.todoAction[a]}</option>)}
              </select>
              <CarToken repo={repo} commit={repo.commits[r.id]} />
              <span className="row">
                <button className="btn quiet sm" type="button" aria-label={strings.todoUp(r.label)} disabled={!playing || i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="btn quiet sm" type="button" aria-label={strings.todoDown(r.label)} disabled={!playing || i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="small">{strings.todoEmpty}</p>
      )}
      {rows.length > 0 && (
        <>
          <code className="todo-cmd">git {command}</code>
          <div className="row"><button className="btn" type="button" disabled={!playing} onClick={() => run(command, strings.todoDone)}>{strings.todoRun}</button></div>
        </>
      )}
    </section>
  );
}

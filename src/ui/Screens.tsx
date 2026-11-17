import type { CSSProperties } from 'react';
import { build, lines, stations, type Session, type Station } from '../game/index.ts';
import { indexInLine, mainTag, tags } from './station-info.ts';
import { strings } from './strings.ts';
import { fr } from './typography.ts';
import { Yard } from './Yard.tsx';

const heroBoard = build(['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'switch feature', 'rebase main']);
const lineColor = (line: number) => ({ '--lc': `var(--n${line})` }) as CSSProperties;

export function Header() {
  const [before, em, after] = strings.heroTitle;
  return (
    <header className="top">
      <div className="brand">
        <svg className="logo" viewBox="0 0 40 40" aria-hidden="true">
          <rect className="lb" width="40" height="40" rx="10" />
          <path className="lr" d="M8 28h24" />
          <path className="lr" d="M8 28c11 0 12-13 24-13" />
          <circle className="ld" cx="32" cy="15" r="3.4" />
        </svg>
        <span className="brand-name">{strings.appTitle}</span>
        <span className="brand-sub">{strings.appSubtitle}</span>
      </div>
      <div className="hero">
        <div className="hero-txt">
          <h1>{before}<em>{em}</em>{after}</h1>
          <p>{strings.heroText}</p>
          <ul className="facts">
            {strings.facts(lines.length, stations.length).map(([n, label]) => <li key={label}><b>{n}</b>{label}</li>)}
          </ul>
        </div>
        <Yard repo={heroBoard} variant="deco" />
      </div>
    </header>
  );
}

interface MapProps {
  current: Station;
  stars: Record<string, number>;
  isOpen: (i: number) => boolean;
  unlockAll: boolean;
  onUnlockAll: (on: boolean) => void;
  onPick: (i: number) => void;
}

export function NetworkMap({ current, stars, isOpen, unlockAll, onUnlockAll, onPick }: MapProps) {
  const total = stations.reduce((n, s) => n + (stars[s.id] ?? 0), 0);
  return (
    <nav className="net" aria-label={strings.network}>
      <div className="net-head">
        <h2>{strings.network}</h2>
        <span className="tot">{strings.starTotal(total, stations.length * 3)}</span>
        <label className="unlock">
          <input type="checkbox" checked={unlockAll} onChange={(e) => onUnlockAll(e.target.checked)} /> {strings.unlockAll}
        </label>
      </div>
      <div className="lines">
        {lines.map((line, li) => (
          <div key={line.title} className="line" style={lineColor(li + 1)}>
            <span className="lname"><b>L{li + 1}</b>{line.title}</span>
            <div className="stations">
              {stations.map((s, i) => {
                if (s.line !== li + 1) return null;
                const open = isOpen(i);
                const n = stars[s.id] ?? 0;
                const j = indexInLine(s);
                const title = fr(s.title);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={['station', s === current && 'cur', n && 'done', !open && 'locked'].filter(Boolean).join(' ')}
                    disabled={!open}
                    aria-label={strings.stationLabel(j, title, open)}
                    aria-current={s === current || undefined}
                    title={title}
                    onClick={() => onPick(i)}
                  >
                    <span className="dot">{j}</span>
                    <span className="sn">{strings.tagShort[mainTag(s)]}</span>
                    <span className="ss">{open ? strings.stars(n) : strings.closed}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function DepartureBoard({ session }: { session: Session }) {
  const { station: s, repo } = session;
  return (
    <section className="board" aria-label={strings.departures}>
      <div className="board-main">
        <p className="lbl">{strings.where(s.line, lines[s.line - 1].title, indexInLine(s))}</p>
        <h2>{fr(s.title)}</h2>
        <div className="tags">
          {tags(s).map((t, k) => <span key={t} className={`tag${k ? ' alt' : ''}`}>{strings.tag[t]}</span>)}
          <span className="lamps" role="img" aria-label={strings.difficulty(s.difficulty)}>
            {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= s.difficulty ? 'on' : ''} />)}
          </span>
        </div>
        <p className="brief">{fr(s.brief)}</p>
        <div className="chips">
          {s.type === 'predict' ? <span className="chip">{strings.chipFirstTry}</span> : (
            <>
              <span className="chip">{strings.chipPar(s.par)}</span>
              {s.budget !== undefined && <span className={`chip${session.moves >= s.budget - 1 ? ' hot' : ''}`}>{strings.chipBudget(session.moves, s.budget)}</span>}
              {session.timeLeft !== null && (
                <span className={`chip clock${session.timeLeft <= 15 && session.status === 'playing' ? ' hot' : ''}`}>{strings.chipClock(session.timeLeft)}</span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="goal">
        {s.type === 'predict' ? (
          <>
            <p className="lbl">{strings.goalOrders}</p>
            <ol className="orders">{s.answer.map((c, i) => <li key={i}>git {c}</li>)}</ol>
          </>
        ) : s.rules ? (
          <>
            <p className="lbl">{strings.goalRules}</p>
            <ul className="rules">
              {s.rules.map((r) => {
                const ok = r.check(repo);
                return (
                  <li key={r.text} className={ok ? 'ok' : ''}>
                    <span className="ck" role="img" aria-label={ok ? strings.ruleOk : strings.ruleTodo}>{ok ? '✓' : ''}</span>
                    {fr(r.text)}
                  </li>
                );
              })}
            </ul>
          </>
        ) : session.target && (
          <>
            <p className="lbl">{strings.goalTarget}</p>
            <Yard repo={session.target} variant="mini" />
          </>
        )}
      </div>
    </section>
  );
}

import type { CSSProperties } from 'react';
import { build, lines, stations, type Session, type Station } from '../game/index.ts';
import { indexInLine, mainTag, tags } from './station-info.ts';
import { strings } from './strings.ts';
import { fr } from './typography.ts';
import { Yard } from './Yard.tsx';

const heroBoard = build(['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'switch feature', 'rebase main']);
const lineColor = (line: number) => ({ '--lc': `var(--n${line})` }) as CSSProperties;

export function Header() {
  return (
    <header className="top">
      <div className="brand">
        <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
          <rect className="logo-plate" width="32" height="32" rx="6" />
          <path className="logo-rail" d="M6 22h20" />
          <path className="logo-rail" d="M6 22c9 0 10-10 20-10" />
          <circle className="logo-signal" cx="25" cy="12" r="2.6" />
        </svg>
        <span className="brand-name">{strings.appTitle}</span>
        <span className="brand-sub">{strings.appSubtitle}</span>
      </div>
      <div className="hero">
        <div className="hero-txt">
          <h1>{strings.heroTitle}</h1>
          <p>{strings.heroText(lines.length, stations.length)}</p>
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
      <ol className="lines">
        {lines.map((line, li) => (
          <li key={line.title} className="line" style={lineColor(li + 1)}>
            <span className="lname"><b aria-label={strings.lineBadge(li + 1)}>{li + 1}</b>{line.title}</span>
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
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DepartureBoard({ session, onTutorial }: { session: Session; onTutorial: () => void }) {
  const { station: s, repo } = session;
  return (
    <section className="board" aria-label={strings.departures} style={lineColor(s.line)}>
      <div className="board-main">
        <p className="where">
          <b className="line-badge" aria-label={strings.lineBadge(s.line)}>{s.line}</b>
          {strings.where(lines[s.line - 1].title, indexInLine(s))}
        </p>
        <h2>{fr(s.title)}</h2>
        <p className="tags">{tags(s).map((t) => <span key={t} className="tag">{strings.tag[t]}</span>)}</p>
        <p className="brief">{fr(s.brief)}</p>
        {/* Not while a clock runs or the train leaves: the failure or victory dialog would stack on it. */}
        {session.timeLeft === null && session.status !== 'won' && (
          <button className="btn quiet sm replay" type="button" onClick={onTutorial}>{strings.tutorialAgain}</button>
        )}
        <dl className="facts">
          <div>
            <dt>{strings.factDifficulty}</dt>
            <dd>
              <span className="lamps" role="img" aria-label={strings.difficulty(s.difficulty)}>
                {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= s.difficulty ? 'on' : ''} />)}
              </span>
            </dd>
          </div>
          <div>
            <dt>{strings.factStars}</dt>
            <dd>{s.type === 'predict' ? strings.factFirstTry : strings.factPar(s.par)}</dd>
          </div>
          {s.type !== 'predict' && s.budget !== undefined && (
            <div className={session.moves >= s.budget - 1 ? 'hot' : undefined}>
              <dt>{strings.factBudget}</dt>
              <dd>{strings.factBudgetValue(session.moves, s.budget)}</dd>
            </div>
          )}
          {session.timeLeft !== null && (
            <div className={`clock${session.timeLeft <= 15 && session.status === 'playing' ? ' hot' : ''}`}>
              <dt>{strings.factClock}</dt>
              <dd>{strings.clock(session.timeLeft)}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="goal">
        {s.type === 'predict' ? (
          <>
            <h3>{strings.goalOrders}</h3>
            <ol className="orders">{s.answer.map((c, i) => <li key={i}>git {c}</li>)}</ol>
          </>
        ) : s.rules ? (
          <>
            <h3>{strings.goalRules}</h3>
            <ul className="rules">
              {s.rules.map((r) => {
                const ok = r.check(repo);
                return (
                  <li key={r.text} className={ok ? 'ok' : ''}>
                    <span className="ck" role="img" aria-label={ok ? strings.ruleOk : strings.ruleTodo} />
                    {fr(r.text)}
                  </li>
                );
              })}
            </ul>
          </>
        ) : session.target && (
          <>
            <h3>{strings.goalTarget}</h3>
            <Yard repo={session.target} variant="mini" />
          </>
        )}
      </div>
    </section>
  );
}

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { lines, stations, type Session } from '../game/index.ts';
import { strings } from './strings.ts';
import { fr } from './typography.ts';
import { Yard } from './Yard.tsx';

/** Native modal dialog. Escape is ignored: each dialog has its own way out, and closing it bare would strand the player. */
function Modal({ children, label }: { children: (titleId: string) => ReactNode; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} className="win" aria-labelledby={label ? undefined : titleId} aria-label={label} onCancel={(e) => e.preventDefault()}>
      {children(titleId)}
    </dialog>
  );
}

interface VictoryProps {
  session: Session;
  stars: 1 | 2 | 3;
  totalStars: number;
  onNext: () => void;
  onRetry: () => void;
}

export function Victory({ session, stars, totalStars, onNext, onRetry }: VictoryProps) {
  const { station: s } = session;
  const i = stations.indexOf(s);
  const last = i === stations.length - 1;
  const next = stations[i + 1];
  const lineDone = !last && next.line !== s.line;
  return (
    <Modal>
      {(id) => (
        <>
          <h2 id={id}>{last ? strings.networkDoneTitle : lineDone ? strings.lineDoneTitle(s.line) : strings.wonTitle}</h2>
          <div className="stars" role="img" aria-label={strings.starsLabel(stars)}>{strings.stars(stars)}</div>
          <p>
            {s.type === 'predict' ? strings.wonPredict(session.wrongs) : strings.wonPlayed(session.moves, s.par)}
            {session.timeLeft !== null && strings.wonTimeLeft(session.timeLeft)}
          </p>
          {lineDone && <p className="small">{strings.nextLine}<b>{lines[next.line - 1].title}</b>{strings.nextLineAfter}</p>}
          {last && <p className="small">{strings.networkTotal(totalStars, stations.length * 3)}</p>}
          <p className="small">{strings.learn}</p>
          <div className="learn">{s.learn}</div>
          <div className="row">
            {stars < 3 && <button className="btn quiet" type="button" onClick={onRetry}>{strings.aimThree}</button>}
            <button className="btn" type="button" autoFocus onClick={onNext}>{last ? strings.backToStart : strings.nextStation}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

interface FailureProps {
  session: Session;
  onUndo: () => void;
  onHint: () => void;
  onRetry: () => void;
}

export function Failure({ session, onUndo, onHint, onRetry }: FailureProps) {
  const [title, text] = session.failure === 'timeout' ? strings.failTimeout : strings.failBudget;
  const canUndo = session.failure === 'budget' && session.history.length > 0;
  return (
    <Modal>
      {(id) => (
        <>
          <h2 className="ko" id={id}>{title}</h2>
          <p>{text}</p>
          <div className="row">
            {canUndo && <button className="btn quiet" type="button" onClick={onUndo}>{strings.undoLast}</button>}
            <button className="btn quiet" type="button" onClick={onHint}>{strings.showHint}</button>
            <button className="btn" type="button" autoFocus onClick={onRetry}>{strings.restart}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function Ready({ seconds, brief, onGo }: { seconds: number; brief: string; onGo: () => void }) {
  return (
    <Modal>
      {(id) => (
        <>
          <h2 id={id}>{strings.readyTitle(seconds)}</h2>
          <p>{fr(brief)}</p>
          <p className="small">{strings.readyText}</p>
          <div className="row"><button className="btn" type="button" autoFocus onClick={onGo}>{strings.takePost}</button></div>
        </>
      )}
    </Modal>
  );
}

export function Prediction({ session, onGuess }: { session: Session; onGuess: (i: number) => void }) {
  const won = session.status === 'won';
  const [tone, text] = won ? ['good', strings.predictRight] : session.wrongs ? ['bad', strings.predictWrong(session.wrongs)] : ['', ''];
  return (
    <section className="prono">
      <h3>{strings.predictTitle}</h3>
      <div className="opts">
        {session.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`opt${o.ruledOut ? ' no' : ''}${won && o.why === null ? ' yes' : ''}`}
            disabled={o.ruledOut || won}
            onClick={() => onGuess(i)}
          >
            <span className="ol">{strings.predictBoard(i)}</span>
            <Yard repo={o.board} variant="mini" />
            <span className="why">{o.ruledOut && o.why ? fr(o.why) : ''}</span>
          </button>
        ))}
      </div>
      <p className={`toast ${tone}`} aria-live="polite">{text}</p>
    </section>
  );
}

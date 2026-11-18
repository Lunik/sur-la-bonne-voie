import { useEffect, useReducer, useRef, useState } from 'react';
import {
  newSession, reduce, shuffled, stars as starsOf, stations,
  type Action, type Session, type Station, type Step, type Toast,
} from '../game/index.ts';
import './app.css';
import { Board } from './Board.tsx';
import { Failure, Prediction, Ready, Victory } from './Dialogs.tsx';
import { Post } from './Post.tsx';
import { loadProgress, saveProgress, type Progress } from './progress.ts';
import { DepartureBoard, Header, NetworkMap } from './Screens.tsx';
import { strings } from './strings.ts';
import { TrainContext } from './trains.tsx';

const isOpen = (p: Progress, i: number) => p.unlockAll || i === 0 || (p.stars[stations[i - 1].id] ?? 0) > 0;
/** Prediction boards are shuffled here, outside the reducer, so it stays pure. */
const sessionFor = (s: Station) => newSession(s, s.type === 'predict' ? shuffled(3) : undefined);

const initialProgress = loadProgress();
const savedIndex = stations.findIndex((s) => s.id === initialProgress.current);
const initialIndex = savedIndex > 0 && isOpen(initialProgress, savedIndex) ? savedIndex : 0;

type UiAction = Action | { type: 'load'; session: Session };
const uiReduce = (s: Session, a: UiAction) => (a.type === 'load' ? a.session : reduce(s, a));

export function App() {
  const [progress, setProgress] = useState(initialProgress);
  const [session, dispatch] = useReducer(uiReduce, undefined, () => sessionFor(stations[initialIndex]));
  const { station, status } = session;
  const [hintShown, setHintShown] = useState(false);
  const [victoryShown, setVictoryShown] = useState(false);
  const [loads, setLoads] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const index = stations.indexOf(station);

  const load = (i: number, { hint = false } = {}) => {
    const s = stations[i];
    dispatch({ type: 'load', session: sessionFor(s) });
    setHintShown(hint);
    setVictoryShown(false);
    setLoads((n) => n + 1);
    setProgress((p) => ({ ...withWin(p), current: s.id }));
    // Bring the exercise to the top of the screen: map above, nothing to scroll back to while playing.
    requestAnimationFrame(() => stage.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  };
  const run = (step: Step, message: string) => dispatch({ type: 'step', step, message });
  const undo = () => dispatch({ type: 'undo', message: strings.toastUndone, nothing: strings.toastNothingToUndo });

  // A win counts as soon as it happens; it is merged into the stored progress on the next load.
  const withWin = (p: Progress): Progress =>
    status === 'won' ? { ...p, stars: { ...p.stars, [station.id]: Math.max(p.stars[station.id] ?? 0, starsOf(session)) } } : p;
  const shown = withWin(progress);
  const savedJson = JSON.stringify(shown);
  useEffect(() => saveProgress(JSON.parse(savedJson)), [savedJson]);

  // Open the victory dialog once the train has left.
  useEffect(() => {
    if (status !== 'won') return;
    const fast = station.type === 'predict' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setVictoryShown(true), fast ? 1100 : 1900);
    return () => clearTimeout(t);
  }, [status, station]);

  const timed = session.timeLeft !== null;
  useEffect(() => {
    if (status !== 'playing' || !timed) return;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', seconds: (now - last) / 1000 });
      last = now;
    }, 200);
    return () => clearInterval(t);
  }, [status, timed, station]);

  const shownToast: Toast =
    status === 'won' ? { tone: 'good', text: strings.toastWon }
    : session.toast ?? { tone: 'info', text: strings.toastReady };

  return (
    <div className="wrap">
      <Header />
      <TrainContext value={station.train}>
        <NetworkMap
          current={station}
          stars={shown.stars}
          isOpen={(i) => isOpen(shown, i)}
          unlockAll={shown.unlockAll}
          onUnlockAll={(on) => setProgress((p) => ({ ...p, unlockAll: on }))}
          onPick={load}
        />
        {/* The whole exercise, kept within one screen on wide displays: sheet and yard on the left, controls on the right. */}
        <div className="stage" ref={stage}>
          <div className="stage-main">
            <DepartureBoard session={session} />
            <Board
              key={`board-${loads}`}
              session={session}
              message={shownToast}
            />
          </div>
          <div className="stage-side">
            {station.type === 'predict' && <Prediction session={session} onGuess={(i) => dispatch({ type: 'guess', option: i })} />}
            <Post
              key={`post-${loads}`}
              session={session}
              hintShown={hintShown}
              onHint={() => setHintShown((h) => !h)}
              onUndo={undo}
              onRestart={() => load(index)}
              run={run}
            />
          </div>
        </div>
        {status === 'ready' && station.type !== 'predict' && (
          <Ready seconds={station.timeLimit!} brief={station.brief} onGo={() => dispatch({ type: 'start' })} />
        )}
        {status === 'failed' && <Failure session={session} onUndo={undo} onHint={() => load(index, { hint: true })} onRetry={() => load(index)} />}
        {status === 'won' && victoryShown && (
          <Victory
            session={session}
            stars={starsOf(session)}
            totalStars={Object.values(shown.stars).reduce((a, b) => a + b, 0)}
            onNext={() => load(index === stations.length - 1 ? 0 : index + 1)}
            onRetry={() => load(index)}
          />
        )}
      </TrainContext>
    </div>
  );
}

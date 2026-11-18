import { useEffect, useReducer, useRef, useState } from 'react';
import {
  newSession, reduce, shuffled, stars as starsOf, stations,
  type Action, type Session, type Station, type Step, type Toast,
} from '../game/index.ts';
import './app.css';
import { Board } from './Board.tsx';
import { Failure, Prediction, Ready, Tutorial, Victory } from './Dialogs.tsx';
import { Post } from './Post.tsx';
import { loadProgress, saveProgress, type Progress } from './progress.ts';
import { DepartureBoard, Header, NetworkMap } from './Screens.tsx';
import { strings } from './strings.ts';
import { TrainContext } from './trains.tsx';

const isOpen = (p: Progress, i: number) => p.unlockAll || i === 0 || (p.stars[stations[i - 1].id] ?? 0) > 0;
/** Prediction boards are shuffled here, outside the reducer, so it stays pure. */
const sessionFor = (s: Station) => newSession(s, s.type === 'predict' ? shuffled(3) : undefined);

type UiAction = Action | { type: 'load'; session: Session };
const uiReduce = (s: Session | null, a: UiAction) => (a.type === 'load' ? a.session : s && reduce(s, a));

export function App() {
  const [progress, setProgress] = useState(loadProgress);
  // No station on arrival or reload: the player picks one on the map, which opens its tutorial.
  const [session, dispatch] = useReducer(uiReduce, null);
  const station = session?.station;
  const status = session?.status;
  const [hintShown, setHintShown] = useState(false);
  // The tutorial opens before a station, on arrival only: not on a restart.
  const [tutorialShown, setTutorialShown] = useState(false);
  const [victoryShown, setVictoryShown] = useState(false);
  const [loads, setLoads] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const index = station ? stations.indexOf(station) : -1;

  const load = (i: number, { hint = false, tutorial = false } = {}) => {
    const s = stations[i];
    dispatch({ type: 'load', session: sessionFor(s) });
    setHintShown(hint);
    setTutorialShown(tutorial);
    setVictoryShown(false);
    setLoads((n) => n + 1);
    setProgress(withWin);
    // Bring the exercise to the top of the screen: map above, nothing to scroll back to while playing.
    requestAnimationFrame(() => stage.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  };
  const run = (step: Step, message: string) => dispatch({ type: 'step', step, message });
  const undo = () => dispatch({ type: 'undo', message: strings.toastUndone, nothing: strings.toastNothingToUndo });

  // A win counts as soon as it happens; it is merged into the stored progress on the next load.
  const withWin = (p: Progress): Progress =>
    session?.status === 'won' ? { ...p, stars: { ...p.stars, [session.station.id]: Math.max(p.stars[session.station.id] ?? 0, starsOf(session)) } } : p;
  const shown = withWin(progress);
  const savedJson = JSON.stringify(shown);
  useEffect(() => saveProgress(JSON.parse(savedJson)), [savedJson]);

  // Open the victory dialog once the train has left.
  useEffect(() => {
    if (status !== 'won' || !station) return;
    const fast = station.type === 'predict' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setVictoryShown(true), fast ? 1100 : 1900);
    return () => clearTimeout(t);
  }, [status, station]);

  const timed = typeof session?.timeLeft === 'number';
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
    : session?.toast ?? { tone: 'info', text: strings.toastReady };

  return (
    <div className="wrap">
      <Header />
      <NetworkMap
        current={station}
        stars={shown.stars}
        isOpen={(i) => isOpen(shown, i)}
        unlockAll={shown.unlockAll}
        onUnlockAll={(on) => setProgress((p) => ({ ...p, unlockAll: on }))}
        onPick={(i) => load(i, { tutorial: true })}
      />
      {session && station && (
        <TrainContext value={station.train}>
          {/* The whole exercise, kept within one screen on wide displays: sheet and yard on the left, controls on the right. */}
          <div className="stage" ref={stage}>
            <div className="stage-main">
              <DepartureBoard session={session} onTutorial={() => setTutorialShown(true)} />
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
                covered={tutorialShown}
                hintShown={hintShown}
                onHint={() => setHintShown((h) => !h)}
                onUndo={undo}
                onRestart={() => load(index)}
                run={run}
              />
            </div>
          </div>
          {tutorialShown && <Tutorial key={`tutorial-${loads}`} station={station} onDone={() => setTutorialShown(false)} />}
          {status === 'ready' && station.type !== 'predict' && !tutorialShown && (
            <Ready seconds={station.timeLimit!} brief={station.brief} onGo={() => dispatch({ type: 'start' })} />
          )}
          {status === 'failed' && <Failure session={session} onUndo={undo} onHint={() => load(index, { hint: true })} onRetry={() => load(index)} />}
          {status === 'won' && victoryShown && (
            <Victory
              session={session}
              stars={starsOf(session)}
              totalStars={Object.values(shown.stars).reduce((a, b) => a + b, 0)}
              onNext={() => load(index === stations.length - 1 ? 0 : index + 1, { tutorial: true })}
              onRetry={() => load(index)}
            />
          )}
        </TrainContext>
      )}
    </div>
  );
}

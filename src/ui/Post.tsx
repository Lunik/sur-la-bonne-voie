import { useEffect, useRef, useState } from 'react';
import { lines, type Session, type Step } from '../game/index.ts';
import { strings } from './strings.ts';
import { fr } from './typography.ts';

interface PostProps {
  session: Session;
  hintShown: boolean;
  /** A dialog (tutorial) is open over the post. */
  covered: boolean;
  onHint: () => void;
  onUndo: () => void;
  onRestart: () => void;
  run: (step: Step, message: string) => void;
}

/** The switch post: a terminal, the only way to move the train. */
export function Post({ session, covered, hintShown, onHint, onUndo, onRestart, run }: PostProps) {
  const { station, log } = session;
  const term = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (term.current) term.current.scrollTop = term.current.scrollHeight;
  }, [log]);
  // Keyboard only: the prompt takes the focus as soon as the player can type, e.g. when the tutorial closes.
  const typing = !covered && session.status === 'playing';
  useEffect(() => {
    if (typing) input.current?.focus({ preventScroll: true });
  }, [typing]);

  if (station.type === 'predict') return null;
  const suggest = (c: string) => {
    setValue(c);
    input.current?.focus();
  };
  const browse = (to: number) => {
    setPos(to);
    setValue(history[to] ?? '');
  };

  return (
    <section className="post panel">
      <h3>
        <span>{strings.terminal} <span className="small">{strings.moves(session.moves, station.budget)}</span></span>
        <span className="row">
          <button className="btn quiet sm" type="button" onClick={onUndo}>{strings.undo}</button>
          <button className="btn quiet sm" type="button" onClick={onRestart}>{strings.restart}</button>
          <button className="btn quiet sm" type="button" aria-expanded={hintShown} onClick={onHint}>{strings.hint}</button>
        </span>
      </h3>
      <div className="term" ref={term} aria-live="polite">
        <div className="o">{strings.logTitle(station.line, station.title)}</div>
        {log.map((l, i) => (
          <div key={i} className={l.kind === 'command' ? 'p' : l.kind === 'error' ? 'e' : l.kind === 'undo' ? 'o' : undefined}>
            {l.kind === 'undo' ? strings.logUndo : l.kind === 'command' ? `$ git ${l.text}` : l.text}
          </div>
        ))}
      </div>
      <form
        className="cli"
        onSubmit={(e) => {
          e.preventDefault();
          const line = value.trim().replace(/^git\s+/, '');
          if (!line || session.status !== 'playing') return;
          const next = [...history, line];
          setHistory(next);
          setPos(next.length);
          setValue('');
          run(line, strings.done.typed);
        }}
      >
        <span>{strings.prompt}</span>
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && pos > 0) {
              e.preventDefault();
              browse(pos - 1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              browse(Math.min(history.length, pos + 1));
            }
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="commit"
          aria-label={strings.promptLabel}
        />
        <button type="submit">{strings.enter}</button>
      </form>
      <p className="help">
        {strings.tryThese}
        {lines[station.line - 1].suggestions.map((c) => (
          <code
            key={c}
            role="button"
            tabIndex={0}
            onClick={() => suggest(c)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), suggest(c))}
          >
            {c}
          </code>
        ))}
      </p>
      {hintShown && <p className="hint">{fr(station.hint)}</p>}
    </section>
  );
}

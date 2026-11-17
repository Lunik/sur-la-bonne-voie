import { useEffect, useRef, useState } from 'react';
import {
  allowedTools, buttonStep, isButtonTool, isDragTool, isTapTool, lines,
  type BoardTool, type Session, type Step, type Toast,
} from '../game/index.ts';
import { Icon } from './Icon.tsx';
import { strings } from './strings.ts';
import { fr } from './typography.ts';

interface PostProps {
  session: Session;
  tool: BoardTool | null;
  onTool: (tool: BoardTool) => void;
  keyboardMode: boolean;
  onKeyboardMode: (on: boolean) => void;
  gesturesOff: boolean;
  hintShown: boolean;
  onHint: () => void;
  onUndo: () => void;
  onRestart: () => void;
  run: (step: Step, message: string) => void;
  toast: Toast;
}

export function Post(p: PostProps) {
  const { session, tool } = p;
  const { station, repo } = session;
  if (station.type === 'predict') return null;
  const tools = allowedTools(station.line);
  const isNew = (t: string) => (station.newTools as string[] | undefined)?.includes(t);
  const boardTools = tools.filter((t): t is BoardTool => isDragTool(t) || isTapTool(t));
  const buttons = tools.filter(isButtonTool);
  const help = tool === 'squash' ? strings.helpSquash : tool === 'revert' ? strings.helpRevert : isDragTool(tool) ? strings.helpDrag : strings.helpSigns;
  const pending = repo.pending.map((id) => repo.commits[id].label);

  return (
    <section className="post">
      <div className="panel">
        <h3>
          {strings.post}
          <label className="switch-lbl">
            <input type="checkbox" checked={p.keyboardMode} disabled={station.keyboardOnly} onChange={(e) => p.onKeyboardMode(e.target.checked)} />
            {strings.keyboardMode}
          </label>
        </h3>
        {!p.gesturesOff && (
          <div className="gestures">
            {boardTools.length > 0 && (
              <div className="tools" role="group" aria-label={strings.toolGroup}>
                {boardTools.map((t) => (
                  <button key={t} type="button" className={`tool${t === tool ? ' on' : ''}`} aria-pressed={t === tool} onClick={() => p.onTool(t)}>
                    <Icon name={t} />
                    <b>{strings.tools[t][0]}</b>
                    <small>{strings.tools[t][1]}</small>
                    {isNew(t) && <span className="nv">{strings.newTool}</span>}
                  </button>
                ))}
              </div>
            )}
            <p className="small">{fr(help)}</p>
            <div className="row">
              {buttons.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="btn"
                  onClick={() => {
                    const step = buttonStep(repo, t);
                    p.run(step, t === 'branch' ? strings.done.branch(String(step).slice('switch -c '.length)) : strings.done[t]);
                  }}
                >
                  <Icon name={t} />
                  {strings.tools[t][0]}
                  <small>{strings.tools[t][1]}</small>
                  {isNew(t) && <span className="nv">{strings.newTool}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {pending.length > 0 && (
          <p className="quai">
            {strings.platform}<b>{pending.join(', ')}</b>{strings.platformAfter[0]}<code>{strings.platformAfter[1]}</code>{strings.platformAfter[2]}
          </p>
        )}
        <div className="row">
          <button className="btn quiet" type="button" onClick={p.onUndo}>{strings.undo}</button>
          <button className="btn quiet" type="button" onClick={p.onRestart}>{strings.restart}</button>
          <button className="btn quiet" type="button" aria-expanded={p.hintShown} onClick={p.onHint}>{strings.hint}</button>
        </div>
        {p.hintShown && <p className="hint">{fr(station.hint)}</p>}
        <p className={`toast ${p.toast.tone}`} aria-live="polite">{fr(p.toast.text)}</p>
      </div>
      <Terminal session={session} run={p.run} />
    </section>
  );
}

function Terminal({ session, run }: { session: Session; run: (step: Step, message: string) => void }) {
  const { station, log } = session;
  const term = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [value, setValue] = useState('');
  const budget = station.type === 'predict' ? undefined : station.budget;

  useEffect(() => {
    if (term.current) term.current.scrollTop = term.current.scrollHeight;
  }, [log]);

  const suggest = (c: string) => {
    setValue(c);
    input.current?.focus();
  };
  const browse = (to: number) => {
    setPos(to);
    setValue(history[to] ?? '');
  };

  return (
    <div className="panel">
      <h3>{strings.terminal} <span className="small">{strings.moves(session.moves, budget)}</span></h3>
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
    </div>
  );
}

import { useReducer } from 'react';
import { newSession, reduce, stations } from '../game/index.ts';
import { strings } from './strings.ts';

export function App() {
  const [session, dispatch] = useReducer(reduce, undefined, () => newSession(stations[0]));
  return (
    <main>
      <h1>{strings.appTitle}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('cmd') as HTMLInputElement;
          dispatch({ type: 'step', step: input.value, message: '' });
          input.value = '';
        }}
      >
        <label>
          {strings.prompt} <input name="cmd" autoComplete="off" spellCheck={false} />
        </label>
      </form>
      <p>{strings.moves} : {session.moves}</p>
      <pre>{session.log.join('\n')}</pre>
    </main>
  );
}

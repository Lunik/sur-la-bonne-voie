import { useEffect } from 'react';
import { startGame } from './game.js';

// ponytail: React rend le squelette, game.js pilote le DOM en impératif. Portage en composants si l'UI doit évoluer.
let started = false;

export default function App() {
  useEffect(() => {
    if (started) return; // StrictMode lance l'effet deux fois en dev
    started = true;
    startGame();
  }, []);

  return (
    <>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <svg className="logo" viewBox="0 0 40 40" aria-hidden="true"><rect className="lb" width="40" height="40" rx="10" /><path className="lr" d="M8 28h24" /><path className="lr" d="M8 28c11 0 12-13 24-13" /><circle className="ld" cx="32" cy="15" r="3.4" /></svg>
            <span className="brand-name">Gare de triage</span><span className="brand-sub">Apprendre Git en jouant</span>
          </div>
          <div className="hero">
            <div className="hero-txt">
              <h1>Apprenez Git en <em>composant des trains</em>.</h1>
              <p>Chaque voiture est un commit, chaque voie une branche, et la motrice, c’est HEAD. Du premier commit au grand départ du vendredi, avec des pronostics, des pannes, des budgets serrés et des départs contre la montre.</p>
              <ul className="facts"><li><b>5</b>lignes</li><li><b>21</b>stations</li><li><b>7</b>types de défis</li></ul>
            </div>
            <div className="yard deco" id="hero-art" aria-hidden="true"></div>
          </div>
        </header>

        <nav className="net" aria-label="Plan du réseau">
          <div className="net-head"><h2>Plan du réseau</h2><span className="tot" id="tot"></span>
            <label className="unlock"><input type="checkbox" id="unlock" /> Tout débloquer (pour tester)</label></div>
          <div className="lines" id="net"></div>
        </nav>

        <section className="board" aria-label="Tableau des départs">
          <div style={{ display: 'grid', gap: 9, alignContent: 'start', minWidth: 0 }}>
            <p className="lbl" id="lv-where"></p>
            <h2 id="lv-name"></h2>
            <div className="tags" id="lv-tags"></div>
            <p className="brief" id="lv-brief"></p>
            <div className="chips" id="lv-chips"></div>
          </div>
          <div className="goal" id="goal"></div>
        </section>

        <div className="yard" id="yard" aria-label="Plateau des voies"></div>
        <div className="casse" id="casse" hidden></div>
        <div className="legend" id="legend"></div>

        <section className="prono" id="prono" hidden>
          <h3>Votre pronostic&nbsp;: quel plateau après ces ordres&nbsp;?</h3>
          <div className="opts" id="opts"></div>
          <p className="toast" id="prono-toast" aria-live="polite"></p>
        </section>

        <section className="post" id="post">
          <div className="panel">
            <h3>Poste d’aiguillage <label className="switch-lbl" id="expert-wrap"><input type="checkbox" id="expert" /> Mode clavier seul</label></h3>
            <div id="gestures" style={{ display: 'grid', gap: 12 }}>
              <div className="tools" id="tools" role="group" aria-label="Outil de manœuvre"></div>
              <p className="small" id="tool-help"></p>
              <div className="row" id="buttons"></div>
            </div>
            <p className="quai" id="quai" hidden></p>
            <div className="row">
              <button className="btn quiet" type="button" id="b-undo">Annuler</button>
              <button className="btn quiet" type="button" id="b-reset">Recommencer</button>
              <button className="btn quiet" type="button" id="b-hint">Indice</button>
            </div>
            <p className="hint" id="hint" hidden></p>
            <p className="toast" id="toast" aria-live="polite"></p>
          </div>
          <div className="panel">
            <h3>Terminal <span className="small" id="moves">0 manœuvre</span></h3>
            <div className="term" id="term" aria-live="polite"></div>
            <form className="cli" id="cli"><span>$ git</span><input id="cmd" autoComplete="off" autoCapitalize="off" spellCheck="false" placeholder="commit" aria-label="Commande git" /><button type="submit">Entrée</button></form>
            <p className="help" id="cli-help"></p>
          </div>
        </section>
      </div>
      <div className="win" id="win" hidden></div>
    </>
  );
}

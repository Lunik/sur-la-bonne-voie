# Gare de triage

Jeu pour apprendre Git en composant des trains. Chaque commit est une voiture, chaque branche une voie, HEAD la motrice au nez jaune. Le joueur tape de vraies commandes Git dans un terminal pour recomposer la rame demandée.

**Jouer : <https://lunik.github.io/sur-la-bonne-voie/>**

## Le jeu

- **5 lignes, 40 stations**, de `commit` à `reflog` :
  1. Le dépôt : `commit`, `branch`, `switch`
  2. Les jonctions : `merge`, `rebase`
  3. Le tri : `cherry-pick`, `reset`
  4. Les grandes lignes : `push`, `pull`, `revert`
  5. Les accidents : `reflog` et réparations
- **Plusieurs types de stations** : composition (atteindre un plateau cible), règlement (respecter des règles), pronostic (deviner le résultat d’une commande), enquête (`log A..B`, `show`), recherche de l’avarie (bisect), revue de quai, `rebase -i`, gitflow…
- **Étoiles** selon le nombre de manœuvres ; certaines stations ajoutent un budget, un chrono ou le clavier seul.
- Progression gardée dans le navigateur. Interface en français, mode sombre, jouable sur mobile.

## Développer

Node (version dans `.nvmrc`), puis :

```sh
npm install
npm run dev      # serveur de développement
npm run lint     # oxlint + tsc (types)
npm test         # node:test
npm run build    # site statique dans dist/
```

React 19 + TypeScript + Vite. Aucune autre dépendance d’exécution : plateau en SVG, animations en Web Animations.

- `src/engine/` : moteur Git pur, sans React ni DOM, testé avec `node:test`.
- `src/levels/` : lignes et stations, décrites comme des données (`stations.ts`). Un test joue chaque station avec sa solution.
- `src/game/` : session de jeu (coups, étoiles, budget, chrono, annulation).
- `src/ui/`, `src/theme/` : composants React, jetons CSS.
- `static/` : fichiers copiés tels quels dans `dist/` (favicon…).
- `reference/` : prototype initial (`artifact.html`) et sa description (`handoff.md`), gardés comme référence. Non construits.

Détails : `docs/architecture.md`. Avancement : `ROADMAP.md`.

Chaque push sur `main` lance lint, tests et build, puis publie `dist/` sur GitHub Pages (`.github/workflows/ci.yml`).

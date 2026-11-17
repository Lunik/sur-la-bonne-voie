# Gare de triage

Jeu pour apprendre Git en composant des trains. Réécriture en cours : voir `ROADMAP.md`.

```sh
npm install
npm run dev      # serveur de développement
npm run lint     # oxlint + tsc (types)
npm test         # node:test
npm run build    # site statique dans dist/
```

- `src/index.html` : page d’entrée (Vite `root: src`), montée par `src/main.tsx`.
- `src/engine/`, `src/levels/`, `src/game/`, `src/ui/`, `src/theme/` : couches du jeu, voir `docs/architecture.md`.
- `static/` : fichiers copiés tels quels dans `dist/` (images, favicon…).
- `reference/artifact.html` : prototype initial (artifact, un seul fichier), gardé comme référence. Non construit.
- `reference/handoff.md` : architecture, contenu et identité visuelle du prototype.
- `reference/sncf/` : visuels de trains SNCF servant de modèle aux silhouettes de `src/ui/trains.tsx`. Ignoré par git, non redistribuable.

Chaque push sur `main` lance lint, tests et build, puis publie `dist/` sur GitHub Pages (`.github/workflows/ci.yml`).

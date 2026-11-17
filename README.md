# Gare de triage

Jeu pour apprendre Git en composant des trains. Voir `handoff.md` pour l’architecture et le contenu.

```sh
npm install
npm run dev      # serveur de développement
npm test         # les 21 stations se résolvent (node:test)
npm run build    # site statique dans dist/
```

- `src/engine.js` : moteur Git miniature, pur.
- `src/levels.js` : lignes, stations, outils.
- `src/index.html` : page d’entrée (Vite `root: src`).
- `src/game.js` : interface (DOM impératif), montée par `src/App.jsx`.
- `static/` : fichiers copiés tels quels dans `dist/` (images, favicon…).

Chaque push sur `main` lance tests + build, puis publie `dist/` sur GitHub Pages (`.github/workflows/ci.yml`).

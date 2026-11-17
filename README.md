# Gare de triage

Jeu pour apprendre Git en composant des trains. Réécriture en cours : voir `ROADMAP.md`.

```sh
npm install
npm run dev      # serveur de développement
npm test         # node:test
npm run build    # site statique dans dist/
```

- `src/index.html` : page d’entrée (Vite `root: src`), montée par `src/main.jsx`.
- `static/` : fichiers copiés tels quels dans `dist/` (images, favicon…).
- `reference/artifact.html` : prototype initial (artifact, un seul fichier), gardé comme référence. Non construit.
- `reference/handoff.md` : architecture, contenu et identité visuelle du prototype.

Chaque push sur `main` lance tests + build, puis publie `dist/` sur GitHub Pages (`.github/workflows/ci.yml`).

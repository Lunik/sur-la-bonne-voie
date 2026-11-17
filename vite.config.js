import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relative : fonctionne sur https://<user>.github.io/<repo>/ quel que soit le nom du dépôt.
// static/ : fichiers copiés tels quels dans dist/ (remplace public/).
export default defineConfig({ base: './', publicDir: 'static', plugins: [react()] });

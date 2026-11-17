import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// root src/ : index.html vit dans src/. Les autres chemins sont relatifs à root.
// base relative : fonctionne sur https://<user>.github.io/<repo>/ quel que soit le nom du dépôt.
// static/ : fichiers copiés tels quels dans dist/ (remplace public/).
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../static',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [react()],
});

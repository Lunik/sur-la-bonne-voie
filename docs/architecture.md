# Architecture

Statut : **proposé au jalon 0, en attente de validation par le propriétaire.**

## Découpage

| Dossier | Rôle | Peut importer |
| --- | --- | --- |
| `src/engine/` | Moteur Git pur : état, commandes, signatures, voie de garage | rien |
| `src/levels/` | Stations (données), lignes, outils autorisés, règles de victoire | `engine` |
| `src/game/` | Session de jeu : coups, étoiles, budget, chrono, annulation | `engine`, `levels` |
| `src/ui/` | Composants React : plateau, terminal, plan du réseau, fenêtres | `game` uniquement (qui ré-exporte ce dont l’interface a besoin du moteur et des stations), `theme` |
| `src/theme/` | Jetons CSS, typographie, mode sombre | rien |

`src/main.tsx` monte `ui/App.tsx` et charge `theme/theme.css`.

Les dépendances interdites sont vérifiées par `oxlint` (`no-restricted-imports` dans `.oxlintrc.json`) : `engine`, `levels` et `game` n’importent ni React ni `ui/` ni `theme/` ; `engine` n’importe rien d’autre ; `levels` n’importe que `engine` ; `ui` n’importe ni `engine` ni `levels` directement.

## Modèle d’état

- **Moteur** : `exec(state, line)` renvoie `{ ok: true, state, output, move }` ou `{ ok: false, error }`. Il travaille sur un clone (`structuredClone`) et ne modifie jamais `state` : une commande ratée laisse l’état intact, sans restauration. `move` vaut `null` pour une commande sans effet (`switch`, `log`, push à jour…), qui ne compte pas comme manœuvre. Seules les `EngineError` deviennent `{ ok: false }` ; toute autre exception est un bogue et remonte.
- **Étape** : `levels.runStep(state, step)` exécute une commande ou un geste (liste de commandes) de façon atomique ; un geste compte pour une manœuvre au plus. Le test de contenu (`play`) et la session l’utilisent tous deux : par et budget comptent pareil partout.
- **Session** : `game/` expose un réducteur pur `reduce(session, action)` (étape, annuler, chrono, pronostic). Les gestes (`game/gestures.ts`) et le terminal produisent tous deux des commandes Git, jamais des mutations directes. Le hasard (ordre des pronostics) est tiré par l’appelant, pas par le réducteur.
- **React** : `useReducer` dans `ui/App.tsx`, état passé par props. Pas de contexte : l’arbre est peu profond.
- **Persistance** : `localStorage` en try/catch, clé versionnée `gare3.progress`, étoiles indexées par `id` de station.
- **Rendu du plateau** : SVG pur (`ui/Yard.tsx`), pancartes en HTML dans une colonne fixe pour qu’elles restent visibles quand les voies défilent. Les voitures forment une liste plate indexée par commit, animée en Web Animations sans jamais quitter les rails : une voiture qui reste sur sa voie roule, une voiture nouvelle ou passée sur une autre voie est attelée sur place. `ui/layout.ts` (pur, testé) place les voitures ; l’échelle vient de la variable CSS `--k`.
- **Fenêtres** : `<dialog>` natif ; Échap est ignoré, chaque fenêtre a sa propre sortie.

## Langage et outillage

- **TypeScript**, exécuté sans compilation par Node (suppression des types) pour les tests, et par Vite pour le site. Conséquences :
  - syntaxe effaçable seulement (`erasableSyntaxOnly`) : pas d’`enum`, de `namespace` ni de propriétés de paramètre ;
  - imports relatifs avec extension explicite (`./index.ts`).
- **Vérification des types** : `tsc` (sans émission) dans `npm run lint`. Vite ne vérifie pas les types.
- **Lint** : `oxlint`, la configuration par défaut du modèle Vite React (règles des hooks et de Fast Refresh), avertissements traités comme des erreurs.
- **Tests** : `node:test`, fichiers `*.test.ts` à côté du code testé.
- **CI** : `npm run lint`, `npm test`, `npm run build`, puis publication sur GitHub Pages depuis `main`.

## Conventions

- **Langue** : code, identifiants, commentaires et messages de commit en anglais ; contenu du jeu (stations, libellés) et documentation en français.
- **Libellés** : tous les textes d’interface dans `src/ui/strings.ts`. Les textes des stations restent dans leurs données (`src/levels/`).
  Exception : la sortie du terminal (messages du moteur) vit dans `src/engine/messages.ts`, car `engine` n’importe rien.
- **Nommage** : `camelCase` pour les variables et fonctions, `PascalCase` pour les types et composants, fichiers de composants en `PascalCase.tsx`, autres fichiers en `kebab-case.ts`. Noms explicites : les abréviations du prototype (`ch`, `noM`, `diff`…) disparaissent.
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/) en anglais, à l’impératif (`feat(engine): add rebase`, `chore: …`), comme le dernier commit du propriétaire. Les commits plus anciens, sans préfixe, ne sont pas réécrits.

## Décisions ouvertes

- **TypeScript** : retenu ici sur recommandation de la roadmap. Revenir à JavaScript + JSDoc coûte peu tant que le moteur n’est pas écrit.
- **Lint** : la roadmap prévoyait ESLint ; le modèle Vite par défaut utilise désormais `oxlint`, retenu pour rester sur le défaut. ESLint reste possible si une règle manque.
- **Rendu du plateau** : SVG pur depuis la refonte visuelle (voir Modèle d’état).
- **Langue de l’interface** : français seul pour la 1.0 ; `strings.ts` prépare une traduction.
- **Nom du jeu** : non tranché.

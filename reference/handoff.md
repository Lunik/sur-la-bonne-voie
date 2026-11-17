# Handoff — Gare de triage (jeu pour apprendre Git)

> Nom de travail : **Gare de triage**. Nom de marque proposé, non tranché : **Aiguillage** (alternatives : Correspondance, TGit, Sur la bonne voie, Terminus, Rail Git). Disponibilité des noms de domaine et des marques non vérifiée.

## 1. Objectif et contexte

Créer un jeu ludique pour apprendre Git, dans l’esprit de *learngitbranching*, avec une identité propre. Le propriétaire a retenu, parmi trois pitchs, le **jeu de composition de trains**, puis demandé :

1. une **difficulté croissante** et une **diversité de défis** ;
2. une **identité visuelle** épurée avec des **trains modernes** et des visuels qualitatifs ;
3. un **nom**, puis ce handoff.

Les deux pitchs écartés (conservés comme pistes) : *Commit Cuisine* (arcade, façon Overcooked) et *Moi, HEAD* (puzzle de voyage dans le temps). Un premier jeu de pitchs plus « document » avait été jugé « pas assez ludique ». Le troisième pitch, *Conflit !* (party game coopératif sur les conflits de fusion), est resté à l’état de concept.

Ce projet est **indépendant** des dépôts ÉtymoLogique visibles dans la session (App, Design, Content, Socials, Infra). Aucune de leurs règles (français obligatoire, ADR, etc.) ne s’applique au code, et rien n’a été commité ni poussé.

## 2. Livrables et emplacements

| Quoi | Où |
|---|---|
| Artifact publié (privé, version 4) | https://claude.ai/artifact/3vhQYZr5vypciuf3N1zJow |
| Source unique du jeu (HTML + CSS + JS, un seul fichier) | `reference/artifact.html` (dépôt `sur-la-bonne-voie`, restauré depuis l’artifact) |
| Test de bout en bout (Playwright, résout les 21 stations) | **perdu** : resté dans la session cloud (`/home/user/gare-de-triage/test-solutions.js`), à réécrire |
| Ce handoff | `reference/handoff.md` |

L’artifact est **privé** : seules les personnes à qui le propriétaire donne accès (menu Partager) peuvent l’ouvrir.

Pour republier : passer par l’outil Artifact avec le même `file_path` (conserve l’URL) ; pour une petite modification, utiliser `edits` (paires `old_str` / `new_str` exactes). Le fichier est enveloppé dans un squelette HTML au publish : **pas de `<html>`, `<head>` ni `<body>`** dans la source ; seuls `<title>`, `<meta name="claude:viewport-fit-sides">`, les liens de polices et `<style>` sont en tête.

## 3. Contraintes techniques de la plateforme (Artifact)

- Un seul fichier ; scripts externes uniquement depuis cdnjs, jsDelivr, unpkg, etc. **Ici, aucune bibliothèque** : tout est du JavaScript natif.
- Feuilles de style externes : Google Fonts seulement (Inter Tight, Inter, JetBrains Mono, avec piles de secours).
- Pas de `alert`, `confirm`, `prompt` ; pas de téléchargement par lien ; `localStorage` en try/catch.
- Thème : jetons de couleur sur `:root`, redéfinis pour `prefers-color-scheme: dark` (gardé par `:root:not([data-theme="light"])`) et `:root[data-theme="dark"]`, avec `body { background: var(--bg) }`.
- Gouttière horizontale : `max(16px, env(safe-area-inset-*))`, pas de défilement horizontal de la page (testé à 390 px et 400 px).
- `[hidden]{display:none!important}` est défini : indispensable pour les fenêtres modales.

## 4. Architecture du code

Tout est dans une IIFE à la fin du fichier. Trois couches.

### 4.1 Moteur Git miniature

- **État `S`** : `c` (commits par id `k0…`), `b` (voies → id de tête), `order` (ordre d’affichage, 3 voies max), `head` (voie courante), `remote` (voies d’`origin`), `rl` (reflog par voie), `pending` (voitures « dételées » après `reset --soft`), `cargo` (étiquette de commit → chargement, ex. `debug`), et les drapeaux `allow` (commandes autorisées), `noM` (merge non fast-forward interdit), `noForce`.
- **Commit** : `{id, parents, label, origin, kind, cargo}`. `kind` vaut `n` (normal), `m` (jonction) ou `r` (inverse, créé par `revert`). `origin` est la voie où le commit est né ; elle détermine la **livrée** (couleur).
- **Étiquettes** : lettres A, B, C…, `′` pour un commit recréé (rebase, cherry-pick), `M` pour une jonction, `↩X` pour un revert de X. Un `reset --soft` suivi de `commit` fusionne les étiquettes (ex. `CDE`).
- **Commandes gérées** (`exec`) : `commit`, `branch`, `switch` / `checkout` (`-c`, `-b`), `merge` (fast-forward ou jonction `M`), `rebase`, `cherry-pick`, `reset` (`--soft`, `--hard`, `--mixed`, avec `HEAD~n`, `X^`, `branche@{n}`, étiquette), `revert`, `push` (refus si non fast-forward, `--force` refusé si `noForce`), `pull` (`--rebase` accepté), `fetch` (sans effet), `reflog`, `log`, `status`, `help`. La commande interne `_coll` simule un push d’un collègue sur `origin/main`.
- **Porte `gate()`** : une commande absente de `allow` renvoie « pas encore au programme ».
- **Voie de garage** : `orphans(s)` = commits inaccessibles depuis une voie, un quai distant ou `pending`.
- Chaque exécution est **atomique** : en cas d’erreur, l’état est restauré depuis un clone et le message s’affiche en rouge dans le terminal.

### 4.2 Niveaux (`LEVELS`) et règles de victoire

Champs d’une station : `ch` (ligne), `nom`, `type` (`compo`, `regles`, `prono`), `diff` (1 à 5), `start` (commandes qui construisent le plateau initial), `target` (commandes qui construisent le plateau cible) ou `rules` (liste de `[texte, fonction]`), `par` (manœuvres pour 3 étoiles), `budget`, `time` (secondes), `keyboard`, `noM`, `noForce`, `cargo`, `match` (`shape` compare seulement origine + prime, `raw` ignore les primes, sinon étiquettes exactes), `tool` (outil par défaut), `nouveau` (outils marqués « NOUVEAU »), `hint`, `learn`. Pour un pronostic : `cmds` (bonne réponse) et `wrong` (deux fausses réponses avec leur explication).

Victoire d’une composition : `sig(S, noms, match) === sig(T, noms, match)`, c’est-à-dire même chaîne de commits pour chaque voie, locale ou distante. Les règlements combinent des prédicats (`contains`, `noCargo`, `noMerge`, `reverted`, `same`). Un niveau peut avoir une cible **et** des règles.

### 4.3 Interface

- **Rendu** : `yardHTML(s, live, deco)` génère le plateau (HTML + SVG). Il sert au plateau principal, à l’objectif miniature, aux trois plateaux du pronostic et à l’illustration d’en-tête (`deco`). Le layout (`layout`) place chaque voie sur une ligne ; une voie dérivée s’accroche par un aiguillage en courbe SVG au commit d’où elle part.
- **Gestes** : outils **glisser** (`rebase`, `merge`, `cherry`) et **toucher** (`souder`, `revert`). Pointer events avec seuil de 8 px, fantôme sous le doigt, repli « toucher la voiture puis la voie » (accessible au clavier et au tactile). Chaque geste est traduit en commandes Git réelles écrites dans le terminal (ex. déplacer la rame = `switch X` + `rebase Y`).
- **Terminal** : champ `$ git`, historique avec ↑ / ↓, suggestions cliquables propres à chaque ligne (`CH[].cli`).
- **Progression** : `localStorage` clés `gare2.stars`, `gare2.unlock`, `gare2.cur`. Une station s’ouvre quand la précédente a ≥ 1 étoile. La case « Tout débloquer (pour tester) » est à retirer ou à masquer en production.
- **Étoiles** : composition et règlement → 3 si `moves ≤ par`, 2 si `par+1`, 1 sinon. Pronostic → `max(1, 3 − erreurs)`. Budget dépassé ou chrono nul → échec avec fenêtre (annuler, indice, recommencer).
- **Fenêtres** : `modal()` ; `#m-next`, `#m-retry`, `#m-undo`, `#m-hint`, `#m-go` sont reliés par `bind`. Le chrono ne démarre qu’au clic sur « Prendre le poste ».

## 5. Contenu : 5 lignes, 21 stations

| Ligne | Station | Type | Diff. | Notion |
|---|---|---|---|---|
| **1 · Le dépôt** | 1 Première voiture | compo | 1 | `commit` |
| | 2 Voie de service | compo | 1 | `switch -c` |
| | 3 Aller-retour | compo | 2 | changer de voie |
| | 4 La bifurcation | prono | 2 | rôle de HEAD |
| **2 · Les jonctions** | 1 La jonction | compo | 2 | `merge` (jonction `M`) |
| | 2 Remise à niveau | compo | 2 | `rebase` |
| | 3 Le double filet | prono | 3 | rebase ≠ merge |
| | 4 Ligne directe | compo, budget 2 | 3 | rebase + fast-forward |
| | 5 La grue en panne | règlement, panne | 4 | jonctions interdites |
| **3 · Le tri** | 1 L’express du correctif | compo | 2 | `cherry-pick` |
| | 2 La soudure | compo | 3 | `reset --soft` + `commit` |
| | 3 La voiture suspecte | règlement | 3 | ne pas embarquer `debug` |
| | 4 La copie | prono | 3 | cherry-pick copie |
| | 5 La release | compo, clavier seul | 4 | gestes désactivés |
| **4 · Les grandes lignes** | 1 Premier départ | compo | 2 | `push` |
| | 2 Push rejeté | règlement | 3 | `pull --rebase` + `push` |
| | 3 La voiture fautive est partie | règlement | 4 | `revert`, pas de force push |
| | 4 Départ imminent | règlement, chrono 80 s | 4 | enchaînement complet |
| **5 · Les accidents** | 1 La casse | compo | 3 | voie de garage, `reflog` |
| | 2 Soft ou hard ? | prono | 3 | `reset --soft` vs `--hard` |
| | 3 La livraison du vendredi | règlement, budget 7, chrono 150 s | 5 | synthèse |

Sept types de défis : composition, règlement, pronostic, budget serré, panne, clavier seul, contre la montre. Les outils se débloquent par ligne (`ALLOW` / `TOOLSET`) et sont signalés « NOUVEAU ».

## 6. Identité visuelle

- **Principe** : signalétique ferroviaire contemporaine. Fond gris clair, cartes blanches, une **seule couleur de marque, le jaune signal**, réservé à HEAD (motrice, pancarte active, chrono, boutons d’action du terminal). Chaque voie a sa **livrée**.
- **Jetons clés** (`:root`) : `--brand #ffc21a`, `--ink #0f1b2a`, `--board #0d1726` (tableau des départs et terminal), livrées `--l-main #1f5fd6`, `--l-feat #f07a1a`, `--l-hot #0fa287`, `--l-coll #d23f7a`, `--l-merge #7a4fe0`, `--l-rev #8a95a3`, danger `#e0413a`. Couleurs de lignes du plan : `--n1` à `--n5`. Le mode sombre redéfinit tous les jetons.
- **Typographie** : Inter Tight (titres), Inter (texte), JetBrains Mono (code, bandeaux lumineux, terminal).
- **Trains** (vectoriel, sans image) : motrice SVG (nez profilé, pare-brise, pantographe, phare, bandeau jaune, texte HEAD) ; voiture en CSS (toit, vitre sombre avec reflet, étiquette jaune lumineuse façon girouette, filet de livrée, bogies, soufflets) ; voies à deux rails sur dalle, aiguillages en courbe de Bézier, butoirs.
- **Signes** : double filet = commit recréé ; losange rouge = chargement suspect ; pastille fléchée = partie sur origin ; livrée rose = collègue ; caisse sombre = voiture inverse ; `M` + lettre = jonction.
- **Vocabulaire** : voiture (= commit), motrice (= HEAD), voie (= branche), pancarte (= nom de voie), quai (= zone d’attente du `reset --soft` et quai distant), voie de garage (= commits perdus), tableau des départs (= énoncé).
- **Illustration d’en-tête** : plateau miniature généré par le moteur lui-même (`build(...)` puis `yardHTML(..., deco)`).

## 7. Vérifications effectuées

Avec Playwright (Chromium) sur le fichier chargé via `setContent` :

- les **21 stations** se résolvent avec leur solution au clavier (écran « Tchou tchou », « Ligne N terminée », « Réseau terminé ») ;
- gestes : glisser-déposer (rebase, cherry-pick), toucher puis toucher, souder, wagon inverse, récupération depuis la voie de garage ;
- échecs : budget épuisé, grue en panne, push forcé refusé, commande pas encore apprise ;
- aucune erreur de console ; pas de défilement horizontal à 390 et 400 px ;
- captures revues : bureau clair, bureau sombre, mobile.

Relancer : `cd /home/user/gare-de-triage && node test-solutions.js` (le script lit `gare-de-triage.html` dans le dossier courant ; adapter le chemin vers `index.html`). Il suppose que Playwright est installé et clique sur « Tout débloquer ».

## 8. Limites connues et dette

1. **Sur mobile**, un train long fait défiler le plateau horizontalement ; la motrice peut sortir de l’écran. Piste : réduire encore `--slot` ou recentrer automatiquement sur la motrice.
2. **Le plateau n’a que 3 voies** (`order.length >= 3`) et 8 positions de reflog affichées.
3. **Pas de vrais conflits de fusion** : une jonction réussit toujours (sauf panne `noM`). C’est volontaire pour le moment.
4. **Gestes sur le quai distant** : on ne peut ni glisser depuis `origin/*` ni y déposer, sauf via `push`. Message d’explication affiché.
5. **Pas d’audio**, pas d’animation de voie de garage ; l’animation de départ du train est coupée par `prefers-reduced-motion`.
6. **Accessibilité** : le plateau est utilisable au clavier via le terminal et via toucher-puis-toucher, mais les voitures ne sont pas focalisables une à une. Contraste et mode sombre ont été conçus, pas audités.
7. **Persistance** : seulement par navigateur (`localStorage`) ; rien n’est partagé ni lu par Claude.
8. **Accords grammaticaux** : le passage « wagon → voiture » avait cassé sept accords (« un nouvelle voiture », « le première voiture », « soudées en un seul »…) ; corrigés le 2026-11-17.
9. **Case « Tout débloquer »** : outil de test, à retirer avant diffusion.
10. **Nom** : non tranché ; l’en-tête affiche « Gare de triage » et le titre de page est `<title>Gare de triage</title>`.

## 9. Prochaines étapes suggérées

| Priorité | Idée | Détail |
|---|---|---|
| Haute | **Conflits** | Deux voitures qui touchent la même marchandise, à départager pendant un rebase ou un merge. |
| Haute | **Mobile** | Recentrage auto sur la motrice, plateau plus compact, tests sur appareils réels. |
| Moyenne | **Défi du jour** | Plateau tiré avec une graine (date), score partageable. |
| Moyenne | **Éditeur de stations** | Pour qu’un formateur écrive `start` / `target` / `rules` sans coder. |
| Moyenne | **Persistance et partage** | Capacité de stockage partagé (tableau des scores d’une classe), à voir avec la plateforme Artifact. |
| Basse | **Nouvelles notions** | `stash`, `tag`, `bisect`, `rebase -i` (réordonner, supprimer), sous-modules à éviter. |
| Basse | **Sons et animations** | Départ, aiguillage, soufflet ; coupés pour `prefers-reduced-motion`. |
| Basse | **Branding** | Choisir le nom, dessiner le logo final (le logo actuel est un aiguillage stylisé en SVG), page de présentation. |
| Hors scope actuel | **Version autonome** | Extraire HTML / CSS / JS en fichiers séparés, ajouter un build, des tests unitaires du moteur (il est pur et testable tel quel : `build`, `exec`, `sig`). |

## 10. Pour reprendre le travail

1. Ouvrir `/home/user/gare-de-triage/index.html` (ou l’artifact) et jouer les lignes 2 et 4 pour sentir le rythme.
2. Pour ajouter une station : ajouter un objet dans `LEVELS` à la bonne place (l’ordre des stations suit l’ordre du tableau, regroupées par `ch`), définir `start` et `target` ou `rules`, `par`, `hint`, `learn`. Pour un pronostic : `cmds` et deux entrées `wrong`.
3. Pour ajouter une commande Git : un `case` dans `exec`, un nom dans `ALLOW`, éventuellement un outil dans `TOOLS` / `TOOLSET` (geste) ou `BTNS` (bouton), une icône dans `ICON`, et la ligne de suggestion dans `CH[].cli`.
4. Pour changer l’apparence : modifier d’abord les jetons de `:root` ; les trains lisent `--l-*`, `--car`, `--glass`, `--led`, `--brand`.
5. Relancer le test des 21 stations, puis republier avec le même chemin de fichier.

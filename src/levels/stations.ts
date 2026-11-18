// The 21 stations of the network, in play order, grouped by line. Adding a station only touches this file.
// Prose uses plain spaces before « : ? ! » : French non-breaking spaces are the UI's job (jalon 3).
import { contains, noCargo, noMerge, reverted, same, validate, type Station } from './index.ts';

const A2 = ['commit', 'commit'];
const FORK = ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit'];
const TRI = ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main'];

export const stations: Station[] = [
  // ---- Ligne 1 · Le dépôt ----
  {
    id: 'premiere-voiture', line: 1, title: 'Première voiture', type: 'compo', difficulty: 1, train: 'francilien',
    start: A2, target: [...A2, 'commit'], par: 1,
    brief: 'La motrice (HEAD) attend sur la voie main. Accrochez-lui une nouvelle voiture.',
    hint: 'Tapez commit.',
    learn: 'git commit',
    solution: ['commit'],
  },
  {
    id: 'voie-de-service', line: 1, title: 'Voie de service', type: 'compo', difficulty: 1, train: 'francilien',
    start: A2, target: [...A2, 'switch -c feature', 'commit'], par: 2,
    brief: 'Posez une voie feature, conduisez-y la motrice et accrochez-y une voiture. La voie main ne doit pas bouger.',
    hint: 'switch -c feature pose la voie et y conduit la motrice. Puis commit.',
    learn: 'git switch -c feature\ngit commit',
    solution: ['switch -c feature', 'commit'],
  },
  {
    id: 'aller-retour', line: 1, title: 'Aller-retour', type: 'compo', difficulty: 2, train: 'regio2n', match: 'shape',
    start: A2, target: [...A2, 'switch -c feature', 'commit', 'commit', 'switch main', 'commit'], par: 4,
    brief: 'Deux voitures sur une voie feature, puis une voiture sur main. Pour changer de voie : switch suivi de son nom.',
    hint: 'switch -c feature, commit, commit, switch main, commit.',
    learn: 'git switch -c feature\ngit commit\ngit commit\ngit switch main\ngit commit',
    solution: ['switch -c feature', 'commit', 'commit', 'switch main', 'commit'],
  },
  {
    id: 'bifurcation', line: 1, title: 'La bifurcation', type: 'predict', difficulty: 2, train: 'regio2n',
    start: A2, answer: ['switch -c fix', 'commit', 'switch main', 'commit', 'commit'],
    wrong: [
      { commands: ['switch -c fix', 'commit', 'commit', 'commit'], why: 'Sans git switch main, la motrice reste sur fix : toutes les voitures y vont.' },
      { commands: ['commit', 'commit', 'commit'], why: 'git switch -c fix crée bien une nouvelle voie et y conduit la motrice : la première voiture part dessus.' },
    ],
    brief: 'Le chef de gare va lancer cet ordre de manœuvre. À quoi ressemblera le plateau ?',
    learn: 'C’est la motrice (HEAD) qui décide où s’accroche chaque nouvelle voiture.',
  },

  // ---- Ligne 2 · Les jonctions ----
  {
    id: 'jonction', line: 2, title: 'La jonction', type: 'compo', difficulty: 2, train: 'regiolis',
    start: FORK, target: [...FORK, 'merge feature'], par: 1,
    brief: 'Le panier (C, D) est prêt, mais main a reçu E entre-temps. Faites entrer feature dans main avec une voiture de jonction.',
    hint: 'La motrice est déjà sur main : merge feature.',
    learn: 'git switch main\ngit merge feature',
    solution: ['switch main', 'merge feature'],
  },
  {
    id: 'remise-a-niveau', line: 2, title: 'Remise à niveau', type: 'compo', difficulty: 2, train: 'regiolis',
    start: FORK, target: [...FORK, 'switch feature', 'rebase main'], par: 1,
    brief: 'Raccrochez toute la rame feature derrière E, comme si elle était partie de là. Les voitures déplacées reçoivent un double filet : ce sont de nouveaux commits.',
    hint: 'switch feature, puis rebase main.',
    learn: 'git switch feature\ngit rebase main',
    solution: ['switch feature', 'rebase main'],
  },
  {
    id: 'double-filet', line: 2, title: 'Le double filet', type: 'predict', difficulty: 3, train: 'agc',
    start: FORK, answer: ['switch feature', 'rebase main'],
    wrong: [
      { commands: ['merge feature'], why: 'Ça, c’est git merge : une voiture de jonction M apparaît sur main.' },
      { commands: ['rebase feature'], why: 'Ça, ce serait main raccrochée derrière feature : rebase déplace la voie où se trouve la motrice.' },
    ],
    brief: 'Ordre de manœuvre : switch feature, puis rebase main. Quel plateau obtient-on ?',
    learn: 'rebase déplace la voie de la motrice et recrée ses voitures (C′, D′).',
  },
  {
    id: 'ligne-directe', line: 2, title: 'Ligne directe', type: 'compo', difficulty: 3, train: 'agc', budget: 2,
    start: FORK, target: [...FORK, 'switch feature', 'rebase main', 'switch main', 'merge feature'], par: 2,
    brief: 'Livrez le panier sur main en ligne droite, sans voiture de jonction. Budget strict : 2 manœuvres, pas une de plus.',
    hint: 'D’abord rebase main depuis feature (feature derrière E), puis merge feature depuis main : main avance simplement. C’est un fast-forward.',
    learn: 'git switch feature\ngit rebase main\ngit switch main\ngit merge feature   # fast-forward',
    solution: ['switch feature', 'rebase main', 'switch main', 'merge feature'],
  },
  {
    id: 'grue-en-panne', line: 2, title: 'La grue en panne', type: 'rules', difficulty: 4, train: 'regiolis', fastForwardOnly: true, par: 4,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'switch main', 'switch -c hotfix', 'commit', 'switch main', 'commit'],
    rules: [
      { text: 'main contient le panier C', check: contains('main', 'C') },
      { text: 'main contient le correctif D', check: contains('main', 'D') },
      { text: 'Aucune voiture de jonction sur main', check: noMerge('main') },
    ],
    brief: 'Deux voies à livrer sur main, mais la grue de jonction est en panne : seuls les fast-forward passent.',
    hint: 'Pour chaque voie : rebase main depuis la voie, puis merge depuis main (fast-forward). Quatre manœuvres.',
    learn: 'git switch feature && git rebase main\ngit switch main && git merge feature\ngit switch hotfix && git rebase main\ngit switch main && git merge hotfix',
    solution: ['switch feature', 'rebase main', 'switch main', 'merge feature', 'switch hotfix', 'rebase main', 'switch main', 'merge hotfix'],
  },

  // ---- Ligne 3 · Le tri ----
  {
    id: 'express-du-correctif', line: 3, title: 'L’express du correctif', type: 'compo', difficulty: 2, train: 'corail',
    start: TRI, target: [...TRI, 'cherry-pick D'], par: 1,
    brief: 'La voiture D transporte le correctif de la TVA. Elle doit partir sur main tout de suite ; C et E ne sont pas prêtes.',
    hint: 'La motrice est sur main : cherry-pick D.',
    learn: 'git switch main\ngit cherry-pick D',
    solution: ['switch main', 'cherry-pick D'],
  },
  {
    id: 'soudure', line: 3, title: 'La soudure', type: 'compo', difficulty: 3, train: 'corail', match: 'raw', par: 3,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'commit'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'commit', 'switch feature', 'reset --soft HEAD~3', 'commit', 'rebase main'],
    brief: 'Trois voitures « en cours » (C, D, E) : le relecteur veut une seule voiture, posée derrière F.',
    hint: 'switch feature, reset --soft HEAD~3 (les trois voitures restent sur le quai), commit pour les souder, puis rebase main.',
    learn: 'git switch feature\ngit reset --soft HEAD~3\ngit commit\ngit rebase main',
    solution: ['switch feature', 'reset --soft HEAD~3', 'commit', 'rebase main'],
  },
  {
    id: 'voiture-suspecte', line: 3, title: 'La voiture suspecte', type: 'rules', difficulty: 3, train: 'corail', cargo: { D: 'debug' },
    start: TRI, par: 2,
    rules: [
      { text: 'main contient C', check: contains('main', 'C') },
      { text: 'main contient E', check: contains('main', 'E') },
      { text: 'Aucune voiture chargée de debug sur main', check: noCargo('main', 'debug') },
    ],
    brief: 'La voiture D (losange rouge) contient du code de débogage. C et E doivent rejoindre main, mais jamais D.',
    hint: 'Un merge ou un rebase emmènerait D. Copiez plutôt C, puis E, sur main.',
    learn: 'git switch main\ngit cherry-pick C\ngit cherry-pick E',
    solution: ['switch main', 'cherry-pick C', 'cherry-pick E'],
  },
  {
    id: 'copie', line: 3, title: 'La copie', type: 'predict', difficulty: 3, train: 'corail',
    start: TRI, answer: ['cherry-pick E'],
    wrong: [
      { commands: ['switch feature', 'reset --hard D', 'switch main', 'cherry-pick E'], why: 'cherry-pick copie : la voiture E reste aussi sur feature.' },
      { commands: ['merge feature'], why: 'Ça, c’est git merge : toute la rame arrive sur main, C et D compris.' },
    ],
    brief: 'La motrice est sur main. Ordre : cherry-pick E. Quel plateau ?',
    learn: 'cherry-pick copie une voiture : l’original ne bouge pas.',
  },
  {
    id: 'release', line: 3, title: 'La release', type: 'compo', difficulty: 4, train: 'corail',
    start: FORK, target: [...FORK, 'switch -c release', 'cherry-pick D'], par: 2,
    brief: 'Posez une voie release au bout de main et copiez-y la voiture D.',
    hint: 'switch -c release, puis cherry-pick D.',
    learn: 'git switch -c release\ngit cherry-pick D',
    solution: ['switch -c release', 'cherry-pick D'],
  },

  // ---- Ligne 4 · Les grandes lignes ----
  {
    id: 'premier-depart', line: 4, title: 'Premier départ', type: 'compo', difficulty: 2, train: 'tgv-m',
    start: ['commit', 'commit', 'push', 'commit'], target: ['commit', 'commit', 'push', 'commit', 'push'], par: 1,
    brief: 'En face, le quai distant origin : ce qui y est poussé est parti chez tous les voyageurs (pastille fléchée). Faites partir la voiture C.',
    hint: 'Tapez push.',
    learn: 'git push',
    solution: ['push'],
  },
  {
    id: 'push-rejete', line: 4, title: 'Push rejeté', type: 'rules', difficulty: 3, train: 'tgv',
    start: ['commit', 'commit', 'push', 'commit', '_coll'], par: 2,
    rules: [
      { text: 'origin/main contient votre voiture C', check: contains('origin/main', 'C') },
      { text: 'origin/main contient la voiture D du collègue', check: contains('origin/main', 'D') },
      { text: 'Ligne droite : aucune voiture de jonction', check: noMerge('origin/main') },
      { text: 'main et origin/main identiques', check: same('main') },
    ],
    brief: 'Un collègue a poussé la voiture D pendant que vous accrochiez C. Votre push sera refusé : intégrez son travail en ligne droite, puis poussez.',
    hint: 'pull --rebase raccroche C derrière D. Puis push.',
    learn: 'git pull --rebase\ngit push',
    solution: ['pull --rebase', 'push'],
  },
  {
    id: 'voiture-fautive', line: 4, title: 'La voiture fautive est partie', type: 'rules', difficulty: 4, train: 'tgv', forceForbidden: true, cargo: { C: 'bug' },
    start: ['commit', 'commit', 'commit', 'push'], par: 2,
    rules: [
      { text: 'origin/main annule l’effet de la voiture C', check: reverted('origin/main', 'C') },
      { text: 'L’histoire publiée reste intacte (C toujours là)', check: contains('origin/main', 'C') },
      { text: 'main et origin/main identiques', check: same('main') },
    ],
    brief: 'La voiture C (losange rouge) a cassé la prod, et elle est déjà partie. Impossible de la retirer du train : des voyageurs sont à bord. Annulez son effet proprement.',
    hint: 'revert C, puis push. Reculer la voie puis forcer le push est interdit ici.',
    learn: 'git revert C\ngit push',
    solution: ['revert C', 'push'],
  },
  {
    id: 'depart-imminent', line: 4, title: 'Départ imminent', type: 'rules', difficulty: 4, train: 'tgv-m', timeLimit: 80, par: 4,
    start: ['commit', 'commit', 'push', 'switch -c feature', 'commit', 'commit', 'switch main', '_coll'],
    rules: [
      { text: 'origin/main contient le panier C et D', check: contains('origin/main', 'C', 'D') },
      { text: 'origin/main contient la voiture E du collègue', check: contains('origin/main', 'E') },
      { text: 'Aucune voiture de jonction', check: noMerge('origin/main') },
      { text: 'main et origin/main identiques', check: same('main') },
    ],
    brief: 'Le train part dans 80 secondes. Livrez le panier (C, D) avec la voiture E du collègue, en ligne droite, et faites partir le tout.',
    hint: 'Sur main : pull. Puis switch feature et rebase main, switch main et merge feature (fast-forward), et push.',
    learn: 'git pull\ngit switch feature && git rebase main\ngit switch main && git merge feature\ngit push',
    solution: ['pull', 'switch feature', 'rebase main', 'switch main', 'merge feature', 'push'],
  },

  // ---- Ligne 5 · Les accidents ----
  {
    id: 'casse', line: 5, title: 'La casse', type: 'compo', difficulty: 3, train: 'infra',
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'reset --hard C'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'reset --hard C', 'reset --hard E'], par: 1,
    brief: 'Un collègue a lancé reset --hard C sur feature : D et E sont parties sur la voie de garage. Récupérez-les.',
    hint: 'reflog montre où était feature. reset --hard feature@{1} la ramène, ou reset --hard E.',
    learn: 'git reflog\ngit reset --hard feature@{1}',
    solution: ['reflog', 'reset --hard feature@{1}'],
  },
  {
    id: 'soft-ou-hard', line: 5, title: 'Soft ou hard ?', type: 'predict', difficulty: 3, train: 'infra',
    start: ['commit', 'commit', 'commit', 'commit'], answer: ['reset --soft HEAD~2', 'commit'],
    wrong: [
      { commands: ['reset --hard HEAD~2'], why: '--hard jette les voitures. --soft les garde sur le quai, prêtes à être soudées par le commit suivant.' },
      { commands: ['commit'], why: 'reset --soft recule d’abord la voie de deux voitures.' },
    ],
    brief: 'Ordre : reset --soft HEAD~2, puis commit. Quel plateau ?',
    learn: 'reset --soft recule la voie mais garde les changements : le commit suivant les soude.',
  },
  {
    id: 'livraison-du-vendredi', line: 5, title: 'La livraison du vendredi', type: 'rules', difficulty: 5, train: 'infra',
    budget: 7, timeLimit: 150, forceForbidden: true, cargo: { D: 'debug' }, par: 5,
    start: ['commit', 'commit', 'push', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'switch -c hotfix', 'commit', 'switch main', '_coll'],
    rules: [
      { text: 'origin/main contient la voiture G du collègue', check: contains('origin/main', 'G') },
      { text: 'origin/main contient le correctif F', check: contains('origin/main', 'F') },
      { text: 'origin/main contient C et E', check: contains('origin/main', 'C', 'E') },
      { text: 'Aucune voiture debug sur origin/main', check: noCargo('origin/main', 'debug') },
      { text: 'Aucune voiture de jonction sur origin/main', check: noMerge('origin/main') },
      { text: 'main et origin/main identiques', check: same('main') },
    ],
    brief: 'Vendredi, 17 h. Le collègue a poussé G, le correctif F attend sur hotfix, le panier C-D-E sur feature (D contient du debug). Tout doit partir proprement : 7 manœuvres maximum, 150 secondes.',
    hint: 'pull sur main, puis cherry-pick F, C et E, puis push. Cinq manœuvres.',
    learn: 'git pull\ngit cherry-pick F\ngit cherry-pick C\ngit cherry-pick E\ngit push',
    solution: ['pull', 'cherry-pick F', 'cherry-pick C', 'cherry-pick E', 'push'],
  },
];

// Fail loudly in development: a broken station is a content bug. `npm test` runs the same check in CI.
if (import.meta.env?.DEV) {
  const errors = validate(stations);
  if (errors.length) throw new Error(`Stations invalides :\n${errors.join('\n')}`);
}

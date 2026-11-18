// Every UI label lives here, so a translation means one more object, not a hunt.
// Station texts stay in the level data; engine output stays in engine/messages.ts.
import { fr } from './typography.ts';

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
/** 75 → « 1:15 ». */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const starRow = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export type Tag = 'compo' | 'rules' | 'predict' | 'budget' | 'timed' | 'breakdown';

export const strings = {
  appTitle: 'Gare de triage',
  appSubtitle: 'Apprendre Git en jouant',
  heroTitle: 'Apprenez Git en composant des trains.',
  heroText: (lines: number, stations: number) =>
    fr(`Chaque voiture est un commit, chaque voie une branche, et la motrice, c’est HEAD. ${lines} lignes et ${stations} stations, du premier commit au départ du vendredi.`),

  network: 'Plan du réseau',
  starTotal: (n: number, max: number) => `${n} / ${max} étoiles`,
  unlockAll: 'Tout débloquer (pour tester)',
  stationLabel: (j: number, title: string, open: boolean) => `Station ${j}, ${title}${open ? '' : ', verrouillée'}`,
  stars: starRow,
  clock,
  closed: 'fermée',
  tagShort: { compo: 'compo', rules: 'règles', predict: 'prono', budget: 'budget', timed: 'chrono', breakdown: 'panne' } satisfies Record<Tag, string>,
  tag: { compo: 'Composition', rules: 'Règlement', predict: 'Pronostic', budget: 'Budget serré', timed: 'Contre la montre', breakdown: 'Panne' } satisfies Record<Tag, string>,

  departures: 'Tableau des départs',
  lineBadge: (line: number) => `Ligne ${line}`,
  where: (title: string, j: number) => `${title}, station ${j}`,
  difficulty: (n: number) => `Difficulté ${n} sur 5`,
  factDifficulty: 'Difficulté',
  factStars: 'Trois étoiles',
  factFirstTry: 'du premier coup',
  factPar: (par: number) => `en ${plural(par, 'manœuvre')}`,
  factBudget: 'Budget',
  factBudgetValue: (moves: number, budget: number) => `${moves} sur ${budget}`,
  factClock: 'Départ dans',
  goalOrders: 'Ordre de manœuvre',
  goalRules: 'Règlement à respecter',
  goalTarget: 'Train attendu',
  ruleOk: 'respectée',
  ruleTodo: 'pas encore',

  yard: 'Plateau des voies',
  signHead: 'HEAD',
  signHeadHere: 'motrice ici',
  signRemote: 'quai distant',
  carTitle: (label: string, cargo: string | null, gone: boolean) =>
    `Voiture ${label}${cargo ? ` · chargement ${cargo}` : ''}${gone ? ' · partie sur origin' : ''}`,
  siding: 'Voie de garage',
  sidingCar: (label: string) => `Voiture ${label} sur la voie de garage`,
  legend: {
    head: fr('motrice jaune : HEAD'),
    fresh: fr('double filet : commit recréé'),
    merge: fr('M : voiture de jonction'),
    cargo: fr('losange rouge : chargement suspect'),
    gone: fr('pastille : partie sur origin'),
    colleague: fr('livrée rose : collègue'),
    revert: fr('caisse sombre : voiture inverse'),
  },

  predictTitle: fr('Votre pronostic : quel plateau après ces ordres ?'),
  predictBoard: (i: number) => `Plateau ${'ABC'[i]}`,
  predictRight: fr('Exact ! Regardez le plateau.'),
  predictWrong: (wrongs: number) => `Raté. Il reste ${plural(Math.max(1, 3 - wrongs), 'étoile')} à gagner.`,

  undo: 'Annuler',
  restart: 'Recommencer',
  hint: 'Indice',
  platform: fr('Sur le quai, dételées : '),
  platformAfter: ['. Un ', 'commit', ' les soude en une seule voiture.'] as const,

  terminal: 'Terminal',
  moves: (n: number, budget?: number) => `${n} ${n > 1 ? 'manœuvres' : 'manœuvre'}${budget ? ` / ${budget}` : ''}`,
  logTitle: (line: number, title: string) => `# Ligne ${line} · ${title}`,
  logUndo: '# manœuvre annulée',
  prompt: '$ git',
  promptLabel: 'Commande git',
  enter: 'Entrée',
  tryThese: fr('Essayez : '),

  toastReady: 'Tapez vos ordres dans le terminal.',
  toastWon: fr('Tchou tchou ! Le train est conforme.'),
  toastUndone: 'Dernière manœuvre annulée.',
  toastNothingToUndo: 'Rien à annuler.',
  done: {
    typed: 'Manœuvre effectuée.',
  },

  wonTitle: fr('Tchou tchou !'),
  lineDoneTitle: (line: number) => fr(`Ligne ${line} terminée !`),
  networkDoneTitle: fr('Réseau terminé !'),
  starsLabel: (n: number) => `${n} étoiles sur 3`,
  wonPredict: (wrongs: number) => (wrongs ? `Trouvé après ${plural(wrongs, 'erreur')}.` : 'Du premier coup.'),
  wonPlayed: (moves: number, par: number) => `${plural(moves, 'manœuvre')}, objectif ${par}.`,
  wonTimeLeft: (seconds: number) => ` Il restait ${clock(seconds)}.`,
  nextLine: fr('Prochaine ligne : '),
  nextLineAfter: ', avec de nouvelles commandes.',
  networkTotal: (n: number, max: number) => `${n} étoiles sur ${max}.`,
  learn: fr('Ce qu’il fallait retenir :'),
  aimThree: 'Viser 3 étoiles',
  nextStation: 'Station suivante',
  backToStart: 'Revoir le réseau',
  failBudget: ['Budget épuisé', 'Toutes les manœuvres autorisées sont utilisées et le train n’est pas conforme.'] as const,
  failTimeout: ['Le train est parti sans vous', 'Le chrono est arrivé à zéro avant que le train soit conforme.'] as const,
  undoLast: 'Annuler la dernière manœuvre',
  showHint: 'Voir l’indice',
  tutorialPage: (page: number, pages: number) => `Avant de partir · ${page} sur ${pages}`,
  tutorialBefore: 'Avant',
  tutorialAfter: 'Après ',
  tutorialPrevious: 'Précédent',
  tutorialNext: 'Suivant',
  tutorialSkip: 'Passer',
  tutorialGo: 'En voiture !',
  tutorialAgain: 'Revoir le tutoriel',
  readyTitle: (seconds: number) => `Départ dans ${seconds} s`,
  readyText: 'Le chrono démarre quand vous prenez le poste.',
  takePost: 'Prendre le poste',
};

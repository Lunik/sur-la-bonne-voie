// The 41 stations of the network, in play order, grouped by line. Adding a station only touches this file.
// Prose uses plain spaces before « : ? ! » : French non-breaking spaces are the UI's job (jalon 3).
import { contains, fromColleague, noCargo, noMerge, reverted, same, validate, type Station } from './index.ts';

const A2 = ['commit', 'commit'];
const FORK = ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit'];
const TRI = ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main'];

export const stations: Station[] = [
  // ---- Ligne 1 · Le dépôt ----
  {
    id: 'premiere-voiture', line: 1, title: 'Première voiture', type: 'compo', difficulty: 1, train: 'francilien',
    start: A2, target: [...A2, 'commit'], par: 1,
    brief: 'La motrice (HEAD) attend sur la voie main. Accrochez-lui une nouvelle voiture.',
    tutorial: [
      { title: 'Le plateau', text: 'Chaque voiture est un commit : une photo de votre projet à un instant donné. Les voitures s’attellent les unes derrière les autres sur une voie, qui est une branche. La première voie s’appelle main.', example: A2 },
      { title: 'La motrice, c’est HEAD', text: 'La motrice jaune marque l’endroit où vous travaillez. `git commit` accroche une nouvelle voiture juste devant elle, puis la motrice avance avec la voie.', example: ['commit'], run: ['commit'] },
      { title: 'Le poste d’aiguillage', text: 'Vos ordres se tapent dans le terminal, après `$ git` : écrivez `commit` puis Entrée. Les flèches ↑ et ↓ rappellent les ordres précédents, Annuler défait la dernière manœuvre. Le train part dès qu’il ressemble au train attendu ; en peu de manœuvres, il gagne trois étoiles.' },
    ],
    hint: 'Tapez commit.',
    learn: 'git commit',
    solution: ['commit'],
  },
  {
    id: 'voie-de-service', line: 1, title: 'Voie de service', type: 'compo', difficulty: 1, train: 'francilien',
    start: A2, target: [...A2, 'switch -c feature', 'commit'], par: 2,
    brief: 'Posez une voie feature, conduisez-y la motrice et accrochez-y une voiture. La voie main ne doit pas bouger.',
    tutorial: [
      { title: 'Poser une voie', text: 'Une branche est une voie parallèle : on y travaille sans toucher à main. `git switch -c fix` pose une voie fix à l’endroit de la motrice et y conduit la motrice.', example: ['commit'], run: ['switch -c fix'] },
      { title: 'Seule la voie de la motrice avance', text: '`git commit` accroche la voiture sur la voie où se trouve la motrice. Les autres voies ne bougent pas.', example: ['commit', 'switch -c fix'], run: ['commit'] },
    ],
    hint: 'switch -c feature pose la voie et y conduit la motrice. Puis commit.',
    learn: 'git switch -c feature\ngit commit',
    solution: ['switch -c feature', 'commit'],
  },
  {
    id: 'voie-d-attente', line: 1, title: 'Voie d’attente', type: 'compo', difficulty: 2, train: 'mi09',
    start: A2, target: [...A2, 'branch release', 'commit', 'commit'], par: 3,
    brief: 'Posez une voie release sur B pour la mise en service de demain, sans quitter main. Puis accrochez deux voitures sur main.',
    tutorial: [
      { title: 'Poser sans partir', text: '`git branch v1` pose une voie v1 à l’endroit de la motrice, mais la motrice reste où elle est. C’est `git switch -c` sans le déplacement.', example: ['commit'], run: ['branch v1'] },
      { title: 'Une voie immobile', text: 'Une voie n’avance que si la motrice s’y trouve au moment du commit. Une voie posée puis laissée de côté garde sa place.' },
    ],
    hint: 'branch release, puis commit deux fois.',
    learn: 'git branch release\ngit commit\ngit commit',
    solution: ['branch release', 'commit', 'commit'],
  },
  {
    id: 'aller-retour', line: 1, title: 'Aller-retour', type: 'compo', difficulty: 2, train: 'regio2n', match: 'shape',
    start: A2, target: [...A2, 'switch -c feature', 'commit', 'commit', 'switch main', 'commit'], par: 4,
    brief: 'Deux voitures sur une voie feature, puis une voiture sur main. Pour changer de voie : switch suivi de son nom.',
    tutorial: [
      { title: 'Changer de voie', text: '`git switch main` ramène la motrice sur une voie qui existe déjà. Sans `-c`, on ne pose rien : on se déplace.', example: ['commit', 'switch -c fix', 'commit'], run: ['switch main'] },
      { title: 'Deux histoires', text: 'Une voiture accrochée sur main après ce retour part dans une autre direction : les deux voies partagent leurs premières voitures, puis chacune suit son histoire. `log` liste les voitures de la voie courante.', example: ['commit', 'switch -c fix', 'commit', 'switch main'], run: ['commit'] },
    ],
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
    tutorial: [
      { title: 'Le pronostic', text: 'Ici, pas de terminal. Le chef de gare affiche une suite d’ordres, et vous choisissez, parmi trois plateaux, celui qu’ils produisent. Chaque erreur coûte une étoile et s’explique sur le plateau écarté.' },
      { title: 'Suivre la motrice', text: 'Lisez les ordres un par un en suivant la motrice : chaque commit s’accroche là où elle se trouve à cet instant, et chaque switch la change de voie.', example: ['commit', 'switch -c essai'], run: ['commit', 'switch main'] },
    ],
    learn: 'C’est la motrice (HEAD) qui décide où s’accroche chaque nouvelle voiture.',
  },
  {
    id: 'controle-des-billets', line: 1, title: 'Le contrôle des billets', type: 'enquete', difficulty: 2, train: 'mi09',
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch -c hotfix', 'commit', 'switch main', 'commit'],
    question: 'Quelles voitures de la voie hotfix ne sont pas encore sur main ?',
    answer: ['C', 'D', 'E'],
    brief: 'Le contrôleur prépare la mise en service de hotfix. Avant de signer, il veut savoir quelles voitures arriveront sur main. Enquêtez, sans rien déplacer.',
    tutorial: [
      { title: 'L’enquête', text: 'Ici, on ne manœuvre pas : on répond à une question en touchant les voitures de la réponse, puis on valide. Chaque mauvaise réponse coûte une étoile. Le terminal reste ouvert pour enquêter.' },
      { title: 'Comparer deux voies', text: '`git log main..fix` liste les voitures de fix qui ne sont pas sur main. `git show B` décrit une voiture : sa voie d’origine, son auteur, la voiture derrière elle.', example: ['commit', 'switch -c fix', 'commit', 'commit', 'switch main'] },
      { title: 'Une voie hérite', text: 'Une voie posée depuis une autre voie emporte toutes les voitures qui sont derrière elle, pas seulement les siennes.' },
    ],
    hint: 'log main..hotfix. hotfix part de feature : elle hérite de ses voitures.',
    learn: 'git log main..hotfix   # les voitures de hotfix absentes de main',
  },
  {
    id: 'trois-voies', line: 1, title: 'Trois voies', type: 'compo', difficulty: 3, train: 'mi09', match: 'shape',
    start: A2, target: [...A2, 'switch -c feature', 'commit', 'switch main', 'switch -c hotfix', 'commit'], par: 4,
    brief: 'Deux équipes partent de B : posez une voie feature et une voie hotfix, toutes deux au départ de B, avec une voiture chacune. main ne bouge pas.',
    tutorial: [
      { title: 'D’où part une voie ?', text: 'Une nouvelle voie part toujours de la voiture où se trouve la motrice. Ici, doc part de B, sur fix, parce que la motrice y était.', example: ['commit', 'switch -c fix', 'commit'], run: ['switch -c doc'] },
      { title: 'Trois voies au plus', text: 'Le dépôt compte trois voies au maximum, main comprise. Choisissez bien où poser chacune.' },
    ],
    hint: 'switch -c feature, commit, switch main, puis switch -c hotfix, commit.',
    learn: 'git switch -c feature\ngit commit\ngit switch main\ngit switch -c hotfix\ngit commit',
    solution: ['switch -c feature', 'commit', 'switch main', 'switch -c hotfix', 'commit'],
  },

  // ---- Ligne 2 · Les jonctions ----
  {
    id: 'jonction', line: 2, title: 'La jonction', type: 'compo', difficulty: 2, train: 'regiolis',
    start: FORK, target: [...FORK, 'merge feature'], par: 1,
    brief: 'Le panier (C, D) est prêt, mais main a reçu E entre-temps. Faites entrer feature dans main avec une voiture de jonction.',
    tutorial: [
      { title: 'La voiture de jonction', text: '`git merge fix` fait entrer le travail de fix dans la voie de la motrice. Si les deux voies ont divergé, Git attelle une voiture de jonction M, reliée à la dernière voiture de chaque voie.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit'], run: ['merge fix'] },
      { title: 'Qui reçoit ?', text: 'Seule la voie de la motrice avance jusqu’à M ; la voie fusionnée ne bouge pas. Placez donc d’abord la motrice sur la voie qui reçoit le travail.' },
    ],
    hint: 'La motrice est déjà sur main : merge feature.',
    learn: 'git switch main\ngit merge feature',
    solution: ['switch main', 'merge feature'],
  },
  {
    id: 'contre-courant', line: 2, title: 'À contre-courant', type: 'compo', difficulty: 2, train: 'x73500',
    start: FORK, target: [...FORK, 'switch feature', 'merge main'], par: 1,
    brief: 'feature a besoin de la voiture E, arrivée sur main. Faites entrer main dans feature, sans toucher à main.',
    tutorial: [
      { title: 'Dans l’autre sens', text: 'merge fait toujours avancer la voie de la motrice. Pour que fix reçoive le travail de main, la motrice doit être sur fix avant le `git merge main`.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit'] },
      { title: 'Rester à jour', text: 'Faire entrer main dans sa voie de temps en temps évite les mauvaises surprises au moment de livrer : les deux histoires restent proches.' },
    ],
    hint: 'switch feature, puis merge main.',
    learn: 'git switch feature\ngit merge main',
    solution: ['switch feature', 'merge main'],
  },
  {
    id: 'remise-a-niveau', line: 2, title: 'Remise à niveau', type: 'compo', difficulty: 2, train: 'regiolis',
    start: FORK, target: [...FORK, 'switch feature', 'rebase main'], par: 1,
    brief: 'Raccrochez toute la rame feature derrière E, comme si elle était partie de là. Les voitures déplacées reçoivent un double filet : ce sont de nouveaux commits.',
    tutorial: [
      { title: 'Raccrocher une rame', text: '`git rebase main` décroche les voitures propres à la voie de la motrice et les raccroche au bout de main, comme si le travail était parti de là. main ne bouge pas.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit', 'switch fix'], run: ['rebase main'] },
      { title: 'Le double filet', text: 'Les voitures raccrochées sont des copies : B devient B′, un nouveau commit. Les originales ne sont plus sur aucune voie : elles attendent sur la voie de garage.' },
      { title: 'Merge ou rebase ?', text: 'merge garde l’histoire telle qu’elle s’est passée, avec une jonction. rebase la réécrit en ligne droite : réservez-le à votre propre voie.' },
    ],
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
    tutorial: [
      { title: 'Quelle voie se déplace ?', text: 'rebase déplace toujours la voie de la motrice, jamais celle nommée dans l’ordre. Ici, la motrice est sur main : `git rebase fix` raccroche main derrière fix.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit'], run: ['rebase fix'] },
      { title: 'Lire un plateau', text: 'Une voiture M trahit un merge. Des voitures à double filet (C′) trahissent une copie : rebase ou cherry-pick.' },
    ],
    learn: 'rebase déplace la voie de la motrice et recrée ses voitures (C′, D′).',
  },
  {
    id: 'ligne-directe', line: 2, title: 'Ligne directe', type: 'compo', difficulty: 3, train: 'agc', budget: 2,
    start: FORK, target: [...FORK, 'switch feature', 'rebase main', 'switch main', 'merge feature'], par: 2,
    brief: 'Livrez le panier sur main en ligne droite, sans voiture de jonction. Budget strict : 2 manœuvres, pas une de plus.',
    tutorial: [
      { title: 'L’avance rapide', text: 'Si la voie de la motrice n’a aucune voiture à elle, `git merge` n’a rien à joindre : la voie avance simplement jusqu’au bout de l’autre. C’est un fast-forward, sans voiture M.', example: ['commit', 'switch -c fix', 'commit', 'commit', 'switch main'], run: ['merge fix'] },
      { title: 'Budget serré', text: 'Le nombre de manœuvres est limité : au-delà, la station échoue. Un switch ne compte pas comme une manœuvre. Préparez votre plan avant de taper.' },
    ],
    hint: 'D’abord rebase main depuis feature (feature derrière E), puis merge feature depuis main : main avance simplement. C’est un fast-forward.',
    learn: 'git switch feature\ngit rebase main\ngit switch main\ngit merge feature   # fast-forward',
    solution: ['switch feature', 'rebase main', 'switch main', 'merge feature'],
  },
  {
    id: 'avance-rapide', line: 2, title: 'L’avance rapide', type: 'predict', difficulty: 2, train: 'x73500',
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main'], answer: ['merge feature'],
    wrong: [
      { commands: ['cherry-pick C', 'cherry-pick D'], why: 'merge ne recopie rien : pas de double filet, main avance jusqu’à la voiture D elle-même.' },
      { commands: [], why: 'main bouge bien : merge fait avancer la voie de la motrice jusqu’au bout de feature, sans rien créer.' },
    ],
    brief: 'La motrice est sur main, qui n’a aucune voiture à elle. Ordre : merge feature. Quel plateau ?',
    tutorial: [
      { title: 'Qui a des voitures à soi ?', text: 'Avant un merge, regardez si la voie de la motrice porte des voitures que l’autre voie n’a pas. Si oui, il faut une voiture de jonction. Sinon, il n’y a rien à joindre.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit'] },
    ],
    learn: 'Sans voiture propre à la voie de la motrice, merge avance simplement : c’est un fast-forward.',
  },
  {
    id: 'double-voie', line: 2, title: 'Correctif en double voie', type: 'rules', difficulty: 3, train: 'agc', workflow: 'gitflow', par: 4,
    start: ['commit', 'commit', 'switch -c develop', 'commit', 'switch main'],
    rules: [
      { text: 'main contient le correctif D', check: contains('main', 'D') },
      { text: 'develop contient le correctif D', check: contains('develop', 'D') },
    ],
    brief: 'Le réseau suit le plan de circulation Gitflow : main ne reçoit que des voies terminées, develop prépare la suite. Un correctif urgent D doit partir sur les deux.',
    tutorial: [
      { title: 'Le plan Gitflow', text: 'Deux voies longues : main, ce qui roule chez les voyageurs, et develop, la prochaine version. On n’accroche jamais de voiture directement sur main : on y fait entrer des voies terminées.' },
      { title: 'La voie hotfix/', text: 'Un correctif urgent part de main sur une voie nommée hotfix/…, puis entre dans main et dans develop, pour que la prochaine version ne le perde pas. `git switch -c hotfix/x` pose une telle voie.', example: ['commit'], run: ['switch -c hotfix/x'] },
    ],
    hint: 'switch -c hotfix/tva depuis main, commit, puis merge hotfix/tva depuis main et depuis develop.',
    learn: 'git switch -c hotfix/tva\ngit commit\ngit switch main && git merge hotfix/tva\ngit switch develop && git merge hotfix/tva',
    solution: ['switch -c hotfix/tva', 'commit', 'switch main', 'merge hotfix/tva', 'switch develop', 'merge hotfix/tva'],
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
    tutorial: [
      { title: 'Le règlement', text: 'Pas de train modèle ici, mais une liste de règles. Chacune se coche dès que le plateau la respecte ; toutes cochées, le train part.' },
      { title: 'La panne', text: 'La grue de jonction est en panne : tout merge qui créerait une voiture M est refusé. Seuls les fast-forward passent. Pour qu’une voie puisse avancer en ligne droite, l’autre doit d’abord se trouver au bout d’elle.' },
    ],
    hint: 'Pour chaque voie : rebase main depuis la voie, puis merge depuis main (fast-forward). Quatre manœuvres.',
    learn: 'git switch feature && git rebase main\ngit switch main && git merge feature\ngit switch hotfix && git rebase main\ngit switch main && git merge hotfix',
    solution: ['switch feature', 'rebase main', 'switch main', 'merge feature', 'switch hotfix', 'rebase main', 'switch main', 'merge hotfix'],
  },

  // ---- Ligne 3 · Le tri ----
  {
    id: 'express-du-correctif', line: 3, title: 'L’express du correctif', type: 'compo', difficulty: 2, train: 'corail',
    start: TRI, target: [...TRI, 'cherry-pick D'], par: 1,
    brief: 'La voiture D transporte le correctif de la TVA. Elle doit partir sur main tout de suite ; C et E ne sont pas prêtes.',
    tutorial: [
      { title: 'Copier une seule voiture', text: '`git cherry-pick B` copie la voiture B au bout de la voie de la motrice. La copie reçoit un double filet ; l’originale reste à sa place.', example: ['commit', 'switch -c fix', 'commit', 'commit', 'switch main'], run: ['cherry-pick B'] },
      { title: 'Pourquoi pas merge ?', text: 'Un merge ou un rebase emmène toute la rame. cherry-pick ne prend que les voitures que vous nommez, par leur lettre.' },
    ],
    hint: 'La motrice est sur main : cherry-pick D.',
    learn: 'git switch main\ngit cherry-pick D',
    solution: ['switch main', 'cherry-pick D'],
  },
  {
    id: 'soudure', line: 3, title: 'La soudure', type: 'compo', difficulty: 3, train: 'corail', match: 'raw', par: 3,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'commit'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'switch main', 'commit', 'switch feature', 'reset --soft HEAD~3', 'commit', 'rebase main'],
    brief: 'Trois voitures « en cours » (C, D, E) : le relecteur veut une seule voiture, posée derrière F.',
    tutorial: [
      { title: 'Reculer la voie', text: '`git reset --soft HEAD~2` recule la voie de la motrice de deux voitures. HEAD~2 désigne la voiture située deux crans derrière la motrice. Avec --soft, rien n’est perdu : les voitures retirées restent dételées sur le quai.' },
      { title: 'Souder', text: 'Le commit suivant soude toutes les voitures du quai en une seule, qui porte leurs lettres.', example: ['commit', 'commit', 'commit'], run: ['reset --soft HEAD~2', 'commit'] },
      { title: 'La forme compte', text: 'Ici, seule la forme du train est comparée : peu importe le double filet des voitures recréées.' },
    ],
    hint: 'switch feature, reset --soft HEAD~3 (les trois voitures restent sur le quai), commit pour les souder, puis rebase main.',
    learn: 'git switch feature\ngit reset --soft HEAD~3\ngit commit\ngit rebase main',
    solution: ['switch feature', 'reset --soft HEAD~3', 'commit', 'rebase main'],
  },
  {
    id: 'erreur-d-aiguillage', line: 3, title: 'Erreur d’aiguillage', type: 'compo', difficulty: 3, train: 'coradia',
    start: ['commit', 'commit', 'commit', 'commit'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main'], par: 2,
    brief: 'C et D devaient partir sur une voie feature, mais elles ont été accrochées sur main. Rangez-les sur feature et ramenez main à B.',
    tutorial: [
      { title: 'Reculer pour de bon', text: '`git reset --hard A` recule la voie de la motrice jusqu’à A. Les voitures retirées partent sur la voie de garage, sauf si une autre voie les porte encore : elles restent alors sur cette voie.', example: ['commit', 'commit', 'commit'], run: ['reset --hard A'] },
      { title: 'Rappel', text: '`git branch` pose une voie à l’endroit de la motrice, sans la déplacer.' },
    ],
    hint: 'branch feature garde C et D, puis reset --hard B ramène main.',
    learn: 'git branch feature\ngit reset --hard B',
    solution: ['branch feature', 'reset --hard B'],
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
    tutorial: [
      { title: 'Les chargements', text: 'Un losange rouge signale un chargement suspect, ici du code de débogage. Une règle peut l’interdire sur une voie.' },
      { title: 'Trier voiture par voiture', text: 'merge et rebase emmènent toute la rame, voiture suspecte comprise. Pour choisir, copiez les voitures une à une avec cherry-pick, dans l’ordre où elles doivent arriver.' },
    ],
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
    tutorial: [
      { title: 'Copier n’est pas déplacer', text: 'Après un cherry-pick, la voiture existe deux fois : l’originale sur sa voie, et la copie à double filet au bout de la voie de la motrice. La voie d’origine ne bouge pas.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit'], run: ['cherry-pick B'] },
    ],
    learn: 'cherry-pick copie une voiture : l’original ne bouge pas.',
  },
  {
    id: 'release', line: 3, title: 'La release', type: 'compo', difficulty: 4, train: 'corail',
    start: FORK, target: [...FORK, 'switch -c release', 'cherry-pick D'], par: 2,
    brief: 'Posez une voie release au bout de main et copiez-y la voiture D.',
    tutorial: [
      { title: 'Poser une voie au bon endroit', text: '`git switch -c` pose la nouvelle voie là où se trouve la motrice, pas ailleurs. Placez la motrice avant de poser la voie.', example: ['commit', 'switch -c fix', 'commit', 'switch main'], run: ['switch -c v1'] },
      { title: 'Deux notions à la suite', text: 'Une station combine souvent ce que vous savez déjà : poser une voie, y conduire la motrice, puis y copier une voiture avec cherry-pick.' },
    ],
    hint: 'switch -c release, puis cherry-pick D.',
    learn: 'git switch -c release\ngit cherry-pick D',
    solution: ['switch -c release', 'cherry-pick D'],
  },
  {
    id: 'recomposer-la-rame', line: 3, title: 'Recomposer la rame', type: 'compo', difficulty: 3, train: 'coradia', todo: 'main', cargo: { E: 'debug' },
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'commit'],
    target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'commit', 'rebase -i main pick:C squash:D drop:E pick:F'], par: 1,
    brief: 'Le relecteur veut une rame propre : D complète C (soudez-les), E ne transporte que du débogage (jetez-la), F reste. Une seule manœuvre.',
    tutorial: [
      { title: 'La feuille de route', text: '`git rebase -i main` ouvre la liste des voitures de la voie après main, de la plus ancienne à la plus récente. Chaque ligne dit quoi faire : pick garde la voiture, squash la soude à celle du dessus, drop la jette. On peut aussi changer l’ordre des lignes.' },
      { title: 'Souder et jeter', text: 'Les voitures soudées n’en font plus qu’une, qui porte leurs lettres. Les voitures jetées ou recréées partent sur la voie de garage.', example: ['commit', 'commit', 'commit'], run: ['rebase -i A pick:B squash:C'] },
      { title: 'Ici', text: 'Le panneau Feuille de route remplit la liste pour vous : choisissez l’action de chaque voiture, puis lancez. La commande s’écrit dans le terminal.' },
    ],
    hint: 'Dans la feuille de route : pick C, squash D, drop E, pick F, puis Lancer.',
    learn: 'git rebase -i main\n  pick C\n  squash D\n  drop E\n  pick F',
    solution: ['rebase -i main pick:C squash:D drop:E pick:F'],
  },
  {
    id: 'revue-de-quai', line: 3, title: 'Revue de quai', type: 'review', difficulty: 3, train: 'corail', par: 3,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'switch feature'],
    phases: [
      {
        remark: 'Votre panier part d’une vieille version de main. Raccrochez feature derrière E, en ligne droite.',
        rules: [
          { text: 'feature part de E', check: contains('feature', 'E') },
          { text: 'Aucune voiture de jonction sur feature', check: noMerge('feature') },
        ],
      },
      {
        remark: 'Bien. Dernière remarque : une seule voiture pour le panier, soudez C et D.',
        target: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'switch feature', 'rebase main', 'reset --soft HEAD~2', 'commit'],
        match: 'raw',
      },
    ],
    brief: 'Votre demande de fusion passe en revue. Le contrôleur fait ses remarques une à une : chaque remarque traitée, il passe à la suivante.',
    tutorial: [
      { title: 'La revue de quai', text: 'Avant d’entrer dans main, une voie passe en revue (une pull request). Le contrôleur ne donne qu’une remarque à la fois : traitez-la, la suivante s’affiche. Le train part après la dernière.' },
      { title: 'Rappel', text: '`git rebase main` raccroche la voie de la motrice au bout de main. `git reset --soft HEAD~2` puis `git commit` soudent les deux dernières voitures.' },
    ],
    hint: 'rebase main, puis reset --soft HEAD~2 et commit.',
    learn: 'git rebase main\ngit reset --soft HEAD~2\ngit commit',
    solution: ['rebase main', 'reset --soft HEAD~2', 'commit'],
  },
  {
    id: 'voiture-du-milieu', line: 3, title: 'La voiture du milieu', type: 'rules', difficulty: 4, train: 'coradia', cargo: { D: 'debug' },
    start: TRI, par: 2,
    rules: [
      { text: 'feature contient C et E', check: contains('feature', 'C', 'E') },
      { text: 'Aucune voiture chargée de debug sur feature', check: noCargo('feature', 'debug') },
    ],
    brief: 'Sur feature, la voiture D (losange rouge) contient du débogage, coincée entre C et E. Retirez-la de feature en gardant C et E.',
    tutorial: [
      { title: 'Repêcher une voiture', text: 'cherry-pick copie aussi une voiture de la voie de garage : il suffit de la nommer par sa lettre.', example: ['commit', 'commit', 'commit', 'reset --hard A'], run: ['cherry-pick C'] },
      { title: 'Seule feature compte', text: 'Le règlement ne regarde que la voie feature : main peut rester où elle est.' },
    ],
    hint: 'switch feature, reset --hard C (D et E partent sur la voie de garage), puis cherry-pick E.',
    learn: 'git switch feature\ngit reset --hard C\ngit cherry-pick E',
    solution: ['switch feature', 'reset --hard C', 'cherry-pick E'],
  },

  // ---- Ligne 4 · Les grandes lignes ----
  {
    id: 'premier-depart', line: 4, title: 'Premier départ', type: 'compo', difficulty: 2, train: 'tgv-m',
    start: ['commit', 'commit', 'push', 'commit'], target: ['commit', 'commit', 'push', 'commit', 'push'], par: 1,
    brief: 'En face, le quai distant origin : ce qui y est poussé est parti chez tous les voyageurs (pastille fléchée). Faites partir la voiture C.',
    tutorial: [
      { title: 'Le quai distant', text: 'Le quai distant origin est le dépôt partagé avec l’équipe. L’étiquette origin/main, posée sur une voiture, montre où en était main au dernier échange avec lui.', example: ['commit', 'push', 'commit'] },
      { title: 'Faire partir', text: '`git push` envoie les nouvelles voitures de votre voie vers origin. Une pastille fléchée marque chaque voiture partie : toute l’équipe la voit désormais.', example: ['commit', 'push', 'commit'], run: ['push'] },
    ],
    hint: 'Tapez push.',
    learn: 'git push',
    solution: ['push'],
  },
  {
    id: 'a-la-traine', line: 4, title: 'À la traîne', type: 'compo', difficulty: 2, train: 'tgv-duplex',
    start: ['commit', 'commit', 'push', '_coll', '_coll'], target: ['commit', 'commit', 'push', '_coll', '_coll', 'pull', 'commit', 'push'], par: 3,
    brief: 'Pendant votre pause, le collègue a poussé C et D. Rattrapez origin, accrochez votre voiture E derrière les siennes et faites-la partir.',
    tutorial: [
      { title: 'Le collègue', text: 'Un collègue pousse lui aussi ses voitures sur origin, en livrée rose. Votre main ne les voit pas tant que vous ne les avez pas récupérées.', example: ['commit', 'push', '_coll'] },
      { title: 'Rattraper origin', text: 'Si votre main n’a rien de nouveau, `git pull` la fait simplement avancer jusqu’à origin/main.', example: ['commit', 'push', '_coll'], run: ['pull'] },
      { title: 'Dans l’ordre', text: 'Récupérez d’abord, travaillez ensuite : une voiture accrochée avant le pull ferait diverger main et origin/main.' },
    ],
    hint: 'pull, commit, push.',
    learn: 'git pull\ngit commit\ngit push',
    solution: ['pull', 'commit', 'push'],
  },
  {
    id: 'pull-par-defaut', line: 4, title: 'Le pull par défaut', type: 'predict', difficulty: 3, train: 'tgv-duplex',
    start: ['commit', 'commit', 'push', 'commit', '_coll'], answer: ['pull'],
    wrong: [
      { commands: ['pull --rebase'], why: 'Ça, c’est pull --rebase : C est recréée derrière D, en ligne droite. Sans option, pull joint les deux histoires.' },
      { commands: ['push --force'], why: 'pull ne pousse rien. Ce plateau-là vient d’un push forcé, qui a jeté la voiture D du collègue.' },
    ],
    brief: 'Votre main porte C, origin/main la voiture D du collègue. Ordre : pull, sans option. Quel plateau ?',
    tutorial: [
      { title: 'Récupérer, puis joindre', text: '`git pull` fait deux choses : il rapatrie les voitures d’origin, puis les fait entrer dans votre voie, exactement comme un merge.', example: ['commit', 'push', 'commit', '_coll'] },
      { title: 'Rappel du merge', text: 'Quand deux voies ont chacune des voitures à elles, `git merge` attelle une voiture de jonction M.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit'], run: ['merge fix'] },
    ],
    learn: 'git pull = récupérer puis merge : une voiture de jonction si les deux histoires ont divergé.',
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
    tutorial: [
      { title: 'Le collègue', text: 'Un collègue peut pousser ses voitures, en livrée rose, pendant que vous travaillez. main et origin/main divergent alors, et push est refusé pour ne pas écraser son travail.', example: ['commit', 'push', 'commit', '_coll'] },
      { title: 'Récupérer avant de partir', text: '`git pull` rapatrie les voitures d’origin et les joint aux vôtres avec une voiture M. `git pull --rebase` raccroche plutôt vos voitures derrière les siennes, en ligne droite.', example: ['commit', 'push', 'commit', '_coll'], run: ['pull'] },
    ],
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
    tutorial: [
      { title: 'Ce qui est parti ne revient pas', text: 'Une voiture poussée est chez toute l’équipe. Reculer la voie puis forcer le push réécrirait leur histoire : c’est interdit ici.' },
      { title: 'La voiture inverse', text: '`git revert B` accroche une nouvelle voiture, à caisse sombre, qui défait exactement les changements de B. L’histoire reste intacte, et l’annulation part avec un push comme n’importe quelle voiture.', example: ['commit', 'commit', 'push'], run: ['revert B'] },
    ],
    hint: 'revert C, puis push. Reculer la voie puis forcer le push est interdit ici.',
    learn: 'git revert C\ngit push',
    solution: ['revert C', 'push'],
  },
  {
    id: 'train-supplementaire', line: 4, title: 'Train supplémentaire', type: 'rules', difficulty: 3, train: 'tgv-duplex', forceForbidden: true, par: 3,
    start: ['commit', 'commit', 'push', 'switch -c feature', 'commit', 'commit', 'switch main'],
    events: [{ after: 1, run: ['_coll'], say: 'Train supplémentaire : le collègue vient de pousser une voiture sur origin/main.' }],
    rules: [
      { text: 'origin/main contient le panier C et D', check: contains('origin/main', 'C', 'D') },
      { text: 'origin/main contient la voiture du collègue', check: fromColleague('origin/main') },
      { text: 'Aucune voiture de jonction', check: noMerge('origin/main') },
      { text: 'main et origin/main identiques', check: same('main') },
    ],
    brief: 'Livrez le panier (C, D) sur origin. L’horaire annonce un train supplémentaire : le collègue va pousser pendant votre manœuvre.',
    tutorial: [
      { title: 'L’horaire', text: 'Sur cette ligne, le réseau vit pendant que vous manœuvrez : après un certain nombre de manœuvres, un événement survient. Le tableau des départs annonce le prochain ; le terminal le raconte quand il arrive.' },
      { title: 'Rappel', text: '`git pull --rebase` raccroche vos voitures derrière celles d’origin, en ligne droite.', example: ['commit', 'push', 'commit', '_coll'], run: ['pull --rebase'] },
    ],
    hint: 'merge feature (fast-forward), puis le collègue pousse : pull --rebase, puis push. Forcer le push est interdit.',
    learn: 'git merge feature\n# le collègue pousse E\ngit pull --rebase\ngit push',
    solution: ['merge feature', 'pull --rebase', 'push'],
  },
  {
    id: 'regle-d-or', line: 4, title: 'La règle d’or', type: 'rules', difficulty: 4, train: 'tgv', publicLocked: true, par: 2,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'push', 'commit', 'switch main', 'commit', 'switch feature'],
    rules: [
      { text: 'origin/feature contient la voiture E de main', check: contains('origin/feature', 'E') },
      { text: 'origin/feature contient toujours C et D', check: contains('origin/feature', 'C', 'D') },
      { text: 'feature et origin/feature identiques', check: same('feature') },
    ],
    brief: 'La voie feature est partagée : C est déjà sur origin/feature, des collègues travaillent dessus. Mettez feature à jour avec la voiture E de main, puis publiez.',
    tutorial: [
      { title: 'La règle d’or du rebase', text: 'Ne réécrivez jamais des voitures déjà publiées. Un rebase recrée les voitures : les collègues qui avaient les originales se retrouveraient avec deux histoires.' },
      { title: 'Voie publique', text: 'Sur cette station, toute voiture marquée de la pastille fléchée est plombée : rebase, reset et push forcé qui la retireraient d’une voie sont refusés. Pour intégrer main, il reste merge.', example: ['commit', 'switch -c fix', 'commit', 'switch main', 'commit', 'switch fix'], run: ['merge main'] },
    ],
    hint: 'rebase est refusé : merge main depuis feature, puis push.',
    learn: 'git switch feature\ngit merge main   # pas de rebase sur une voie publique\ngit push',
    solution: ['merge main', 'push'],
  },
  {
    id: 'le-fork', line: 4, title: 'Le fork', type: 'rules', difficulty: 4, train: 'tgv-duplex', forceForbidden: true, par: 4,
    start: ['commit', 'commit', 'push upstream', 'push', 'switch -c feature', 'commit', 'switch main', '_coll upstream', '_coll upstream'],
    rules: [
      { text: 'origin/main à jour avec upstream/main', check: same('origin/main', 'upstream/main') },
      { text: 'origin/feature contient votre voiture C', check: contains('origin/feature', 'C') },
      { text: 'origin/feature contient D et E, les voitures du projet d’origine', check: contains('origin/feature', 'D', 'E') },
      { text: 'Ligne droite : aucune voiture de jonction', check: noMerge('origin/feature') },
      { text: 'feature et origin/feature identiques', check: same('feature') },
    ],
    brief: 'Vous contribuez à un projet qui n’est pas le vôtre, depuis votre fork. Les mainteneurs ont poussé D et E sur upstream. Remettez votre fork à jour, raccrochez feature derrière leur travail et publiez-la sur votre fork pour la pull request.',
    tutorial: [
      { title: 'Deux quais distants', text: 'Un fork est votre copie d’un projet. Votre dépôt a alors deux quais distants : origin, votre fork, où vous poussez, et upstream, le projet d’origine, que vous ne faites que lire. Les voitures des mainteneurs arrivent sur upstream/main.', example: ['commit', 'push upstream', 'push', '_coll upstream'] },
      { title: 'Nommer le quai', text: '`git pull upstream main` récupère upstream/main et le fait entrer dans votre voie. `git push origin feature` envoie la voie feature sur votre fork ; sans nom, push et pull visent origin et la voie de la motrice.', example: ['commit', 'push upstream', 'push', '_coll upstream'], run: ['pull upstream main'] },
      { title: 'Lecture seule', text: 'Vous n’avez pas les droits sur upstream : push upstream est refusé. Votre travail y entre par une pull request, depuis votre fork. Le push forcé est interdit ici.' },
    ],
    hint: 'Sur main : pull upstream main, puis push. Ensuite switch feature, rebase main et push.',
    learn: 'git pull upstream main\ngit push origin main\ngit switch feature\ngit rebase main\ngit push origin feature',
    solution: ['pull upstream main', 'push', 'switch feature', 'rebase main', 'push origin feature'],
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
    tutorial: [
      { title: 'Contre la montre', text: 'Le chrono démarre seulement quand vous prenez le poste. Relisez le règlement et préparez vos ordres avant : une fois lancé, le temps file, même pendant un Annuler.' },
      { title: 'Un pull en ligne droite', text: 'Si votre main n’a aucune voiture à elle, `git pull` avance simplement jusqu’à origin/main : un fast-forward, sans voiture M.', example: ['commit', 'push', '_coll'], run: ['pull'] },
    ],
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
    tutorial: [
      { title: 'La voie de garage', text: '`git reset --hard A` recule la voie jusqu’à A. Les voitures qui suivaient ne sont plus sur aucune voie : elles attendent sur la voie de garage, sous le plateau.', example: ['commit', 'commit', 'commit'], run: ['reset --hard A'] },
      { title: 'Le registre', text: '`git reflog` liste les positions passées des voies. feature@{1} désigne la position de feature juste avant son dernier mouvement ; une voie peut aussi revenir sur une voiture nommée par sa lettre.' },
    ],
    hint: 'reflog montre où était feature. reset --hard feature@{1} la ramène, ou reset --hard E.',
    learn: 'git reflog\ngit reset --hard feature@{1}',
    solution: ['reflog', 'reset --hard feature@{1}'],
  },
  {
    id: 'le-registre', line: 5, title: 'Le registre', type: 'predict', difficulty: 3, train: 'fret',
    start: ['commit', 'commit', 'commit', 'reset --hard A'], answer: ['reset --hard main@{1}'],
    wrong: [
      { commands: ['reset --hard main@{2}'], why: 'main@{2} remonte deux mouvements : main était alors sur B. La position juste avant le reset, c’est main@{1}.' },
      { commands: ['reset --hard main@{3}'], why: 'main@{3} remonte trois mouvements, quand main n’avait que A : rien ne bouge.' },
    ],
    brief: 'main a été reculée jusqu’à A ; B et C attendent sur la voie de garage. Ordre : reset --hard main@{1}. Quel plateau ?',
    tutorial: [
      { title: 'Lire le registre', text: 'Le registre numérote les positions passées d’une voie, de la plus récente à la plus ancienne : main@{0} est la position actuelle, main@{1} celle d’avant le dernier mouvement, et ainsi de suite.' },
      { title: 'Chaque mouvement compte', text: 'Un commit, un reset, un merge : tout ce qui déplace la voie ajoute une ligne au registre. `git reflog` les affiche.', example: ['commit'], run: ['commit'] },
    ],
    learn: 'voie@{n} désigne la position de la voie n mouvements plus tôt : git reflog les liste.',
  },
  {
    id: 'soft-ou-hard', line: 5, title: 'Soft ou hard ?', type: 'predict', difficulty: 3, train: 'infra',
    start: ['commit', 'commit', 'commit', 'commit'], answer: ['reset --soft HEAD~2', 'commit'],
    wrong: [
      { commands: ['reset --hard HEAD~2'], why: '--hard jette les voitures. --soft les garde sur le quai, prêtes à être soudées par le commit suivant.' },
      { commands: ['commit'], why: 'reset --soft recule d’abord la voie de deux voitures.' },
    ],
    brief: 'Ordre : reset --soft HEAD~2, puis commit. Quel plateau ?',
    tutorial: [
      { title: 'Deux façons de reculer', text: '--hard recule la voie et envoie les voitures retirées sur la voie de garage. --soft recule la voie mais laisse les voitures dételées sur le quai, prêtes à être soudées.', example: ['commit', 'commit', 'commit'], run: ['reset --hard HEAD~2'] },
    ],
    learn: 'reset --soft recule la voie mais garde les changements : le commit suivant les soude.',
  },
  {
    id: 'qui-a-decroche', line: 5, title: 'Qui a décroché ?', type: 'retro', difficulty: 3, train: 'fret',
    start: ['commit', 'commit', 'commit'], answer: ['branch sauvegarde', 'reset --hard B'],
    wrong: [
      { commands: ['switch -c sauvegarde', 'reset --hard B'], why: 'switch -c emmène la motrice sur sauvegarde : c’est sauvegarde qui reculerait, et main garderait C.' },
      { commands: ['reset --hard B', 'branch sauvegarde'], why: 'Dans cet ordre, la voie sauvegarde est posée après le recul : elle s’arrête sur B, et C reste sur la voie de garage.' },
    ],
    brief: 'Quelqu’un a manœuvré pendant la nuit : main est revenue sur B, et une voie sauvegarde garde C. Quels ordres ont produit ce plateau ?',
    tutorial: [
      { title: 'Le pronostic inversé', text: 'Le plateau de départ est sur les voies, le plateau d’arrivée dans l’objectif. Parmi trois suites d’ordres, choisissez celle qui fait passer de l’un à l’autre. Chaque erreur coûte une étoile et s’explique.' },
      { title: 'Rappel', text: '`git branch` pose une voie sans déplacer la motrice ; `git switch -c` la pose et y conduit la motrice. `git reset --hard` recule la voie de la motrice.', example: ['commit', 'commit'], run: ['branch v1'] },
    ],
    learn: 'git branch sauvegarde   # garde C\ngit reset --hard B      # puis recule main. L’ordre compte.',
  },
  {
    id: 'push-force', line: 5, title: 'Le push forcé', type: 'rules', difficulty: 4, train: 'fret', forceForbidden: true,
    start: ['commit', 'commit', 'push', 'commit', '_coll', 'push --force'], par: 2,
    rules: [
      { text: 'origin/main contient de nouveau la voiture D du collègue', check: contains('origin/main', 'D') },
      { text: 'origin/main contient toujours votre voiture C', check: contains('origin/main', 'C') },
      { text: 'Aucune voiture de jonction', check: noMerge('origin/main') },
      { text: 'main et origin/main identiques', check: same('main') },
    ],
    brief: 'Vous avez forcé le push : la voiture D du collègue a quitté origin et attend sur la voie de garage. Rendez-la-lui, sans forcer cette fois.',
    tutorial: [
      { title: 'Ce que le push forcé efface', text: '`git push --force` remplace origin/main par votre main, même si des voitures du collègue s’y trouvaient : elles partent sur la voie de garage. Ici, forcer est désormais interdit.', example: ['commit', 'push', 'commit', '_coll'], run: ['push --force'] },
      { title: 'Rien n’est perdu', text: 'Une voiture de la voie de garage peut toujours être recopiée sur une voie : il suffit de la nommer par sa lettre.' },
    ],
    hint: 'cherry-pick D recopie la voiture du collègue derrière C, puis push.',
    learn: 'git cherry-pick D\ngit push',
    solution: ['cherry-pick D', 'push'],
  },
  {
    id: 'recherche-de-l-avarie', line: 5, title: 'Recherche de l’avarie', type: 'bisect', difficulty: 3, train: 'infra',
    start: ['commit', 'commit', 'commit', 'commit', 'commit', 'commit', 'commit', 'commit'], culprit: 'E', par: 3,
    brief: 'Le train de huit voitures déraille. A roulait, H déraille : une voiture entre les deux a introduit l’avarie. Trouvez-la en sondant le moins de voitures possible.',
    tutorial: [
      { title: 'Couper en deux', text: 'Sonder les voitures une à une prend du temps. Sondez plutôt celle du milieu : si elle déraille, la fautive est avant elle ; si elle roule, après. Chaque sondage divise la recherche par deux.' },
      { title: 'git bisect', text: '`git bisect start`, `git bisect bad` sur la tête et `git bisect good A` : Git conduit la motrice sur la voiture du milieu. Vous testez, vous répondez `git bisect good` ou `git bisect bad`, et Git recommence jusqu’à la fautive.', example: ['commit', 'commit', 'commit', 'commit'] },
    ],
    hint: 'Six voitures à départager : sondez D ou E, puis le milieu de ce qui reste. Trois sondages suffisent.',
    learn: 'git bisect start\ngit bisect bad\ngit bisect good A\n# puis git bisect good ou bad à chaque voiture proposée',
  },
  {
    id: 'avant-le-ramassage', line: 5, title: 'Avant le ramassage', type: 'rules', difficulty: 4, train: 'fret', gcAfter: 1, par: 2,
    start: ['commit', 'commit', 'switch -c feature', 'commit', 'commit', 'commit', 'reset --hard C', 'switch main'],
    rules: [{ text: 'main contient C, D et E', check: contains('main', 'C', 'D', 'E') }],
    brief: 'D et E sont sur la voie de garage depuis un reset de trop sur feature. Livrez C, D et E sur main. Attention : le ramassage passe après votre première manœuvre.',
    tutorial: [
      { title: 'Le ramassage', text: 'La voie de garage n’est pas éternelle. `git reflog expire` puis `git gc --prune=now` détruisent les voitures qu’aucune voie ne porte : plus de reflog, plus de cherry-pick. Le tableau des départs annonce son passage.' },
      { title: 'Rappel', text: '`git reset --hard` peut ramener une voie sur une voiture de la voie de garage, nommée par sa lettre.', example: ['commit', 'commit', 'reset --hard A'], run: ['reset --hard B'] },
    ],
    hint: 'Sauvez d’abord : switch feature, reset --hard E. Puis switch main et merge feature.',
    learn: 'git switch feature && git reset --hard E   # avant le ramassage\ngit switch main && git merge feature',
    solution: ['switch feature', 'reset --hard E', 'switch main', 'merge feature'],
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
    tutorial: [
      { title: 'Le grand final', text: 'Tout le réseau se retrouve ici : collègue, correctif, chargement suspect, ligne droite, budget et chrono. Lisez chaque règle et repérez les voitures à livrer, et celle à laisser.' },
      { title: 'La boîte à outils', text: 'Récupérer le travail d’origin : pull. Livrer une voie entière : rebase puis merge. Choisir voiture par voiture : cherry-pick. Partir : push.' },
    ],
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

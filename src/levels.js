import { contains, noCargo, noMerge, reverted, same } from './engine.js';

/* ================= Réseau ================= */
const ALLOW=[['commit','branch'],['merge','rebase'],['cherry-pick','reset'],['push','pull','revert'],[]];
const TOOLSET=[['commit','branch'],['rebase','merge'],['cherry','souder'],['revert','push','pull','pullr'],['recover']];
const CH=[
  {nom:'Le dépôt',col:'var(--n1)',cli:['commit','switch -c feature','switch main','log']},
  {nom:'Les jonctions',col:'var(--n2)',cli:['merge feature','switch feature','rebase main','log']},
  {nom:'Le tri',col:'var(--n3)',cli:['cherry-pick D','reset --soft HEAD~3','commit','status']},
  {nom:'Les grandes lignes',col:'var(--n4)',cli:['push','pull --rebase','revert C','status']},
  {nom:'Les accidents',col:'var(--n5)',cli:['reflog','reset --hard feature@{1}','cherry-pick F','push']}
];
CH.forEach((c,i)=>{ c.allow=ALLOW.slice(0,i+1).flat(); c.tools=TOOLSET.slice(0,i+1).flat(); });
const TOOLS={rebase:{k:'drag',b:'Déplacer la rame',s:'git rebase'},merge:{k:'drag',b:'Atteler la voie',s:'git merge'},cherry:{k:'drag',b:'Copier une voiture',s:'git cherry-pick'},
  souder:{k:'tap',b:'Souder des voitures',s:'reset --soft + commit'},revert:{k:'tap',b:'Voiture inverse',s:'git revert'}};
const BTNS={commit:['Ajouter une voiture','commit'],branch:['Nouvelle voie','switch -c'],push:['Pousser','push'],pull:['Tirer','pull'],pullr:['Tirer en rebasant','pull --rebase']};
const TAG={compo:'Composition',regles:'Règlement',prono:'Pronostic',budget:'Budget serré',clavier:'Clavier seul',chrono:'Contre la montre',panne:'Panne'};
const SHORT={compo:'compo',regles:'règles',prono:'prono',budget:'budget',clavier:'clavier',chrono:'chrono',panne:'panne'};

const A2=['commit','commit'];
const FORK=['commit','commit','switch -c feature','commit','commit','switch main','commit'];
const TRI=['commit','commit','switch -c feature','commit','commit','commit','switch main'];
const LEVELS=[
  /* ---- Ligne 1 · Le dépôt ---- */
  {ch:0,nom:'Première voiture',type:'compo',diff:1,start:A2,target:[...A2,'commit'],par:1,nouveau:['commit'],
   brief:'La motrice (HEAD) attend sur la voie main. Accrochez-lui une nouvelle voiture.',
   hint:'Bouton « Ajouter une voiture », ou tapez commit.',learn:'git commit'},
  {ch:0,nom:'Voie de service',type:'compo',diff:1,start:A2,target:[...A2,'switch -c feature','commit'],par:2,nouveau:['branch'],
   brief:'Posez une voie feature, conduisez-y la motrice et accrochez-y une voiture. La voie main ne doit pas bouger.',
   hint:'« Nouvelle voie », puis « Ajouter une voiture ». Au clavier : switch -c feature, puis commit.',learn:'git switch -c feature\ngit commit'},
  {ch:0,nom:'Aller-retour',type:'compo',diff:2,match:'shape',start:A2,target:[...A2,'switch -c feature','commit','commit','switch main','commit'],par:4,
   brief:'Deux voitures sur une voie feature, puis une voiture sur main. Pour changer de voie, touchez sa pancarte&nbsp;: la motrice y va.',
   hint:'Nouvelle voie, deux voitures, touchez la pancarte main, une voiture. Au clavier : switch -c feature, commit, commit, switch main, commit.',learn:'git switch -c feature\ngit commit\ngit commit\ngit switch main\ngit commit'},
  {ch:0,nom:'La bifurcation',type:'prono',diff:2,start:A2,cmds:['switch -c fix','commit','switch main','commit','commit'],
   wrong:[{cmds:['switch -c fix','commit','commit','commit'],why:'Sans git switch main, la motrice reste sur fix : toutes les voitures y vont.'},
          {cmds:['commit','commit','commit'],why:'git switch -c fix crée bien une nouvelle voie et y conduit la motrice : la première voiture part dessus.'}],
   brief:'Le chef de gare va lancer cet ordre de manœuvre. À quoi ressemblera le plateau&nbsp;?',learn:'C’est la motrice (HEAD) qui décide où s’accroche chaque nouvelle voiture.'},
  /* ---- Ligne 2 · Les jonctions ---- */
  {ch:1,nom:'La jonction',type:'compo',diff:2,start:FORK,target:[...FORK,'merge feature'],par:1,tool:'merge',nouveau:['merge','rebase'],
   brief:'Le panier (C, D) est prêt, mais main a reçu E entre-temps. Faites entrer feature dans main avec une voiture de jonction.',
   hint:'Outil « Atteler la voie », glissez une voiture de feature sur main. Au clavier : merge feature (la motrice est déjà sur main).',learn:'git switch main\ngit merge feature'},
  {ch:1,nom:'Remise à niveau',type:'compo',diff:2,start:FORK,target:[...FORK,'switch feature','rebase main'],par:1,tool:'rebase',
   brief:'Raccrochez toute la rame feature derrière E, comme si elle était partie de là. Les voitures déplacées reçoivent un double filet&nbsp;: ce sont de nouveaux commits.',
   hint:'Outil « Déplacer la rame », glissez une voiture de feature sur main. Au clavier : switch feature, puis rebase main.',learn:'git switch feature\ngit rebase main'},
  {ch:1,nom:'Le double filet',type:'prono',diff:3,start:FORK,cmds:['switch feature','rebase main'],
   wrong:[{cmds:['merge feature'],why:'Ça, c’est git merge : une voiture de jonction M apparaît sur main.'},
          {cmds:['rebase feature'],why:'Ça, ce serait main raccrochée derrière feature : rebase déplace la voie où se trouve la motrice.'}],
   brief:'Ordre de manœuvre&nbsp;: switch feature, puis rebase main. Quel plateau obtient-on&nbsp;?',learn:'rebase déplace la voie de la motrice et recrée ses voitures (C′, D′).'},
  {ch:1,nom:'Ligne directe',type:'compo',budget:2,diff:3,start:FORK,target:[...FORK,'switch feature','rebase main','switch main','merge feature'],par:2,
   brief:'Livrez le panier sur main en ligne droite, sans voiture de jonction. Budget strict&nbsp;: 2 manœuvres, pas une de plus.',
   hint:'D’abord « Déplacer la rame » (feature derrière E), puis « Atteler la voie » : main avance simplement. C’est un fast-forward.',
   learn:'git switch feature\ngit rebase main\ngit switch main\ngit merge feature   # fast-forward'},
  {ch:1,nom:'La grue en panne',type:'regles',panne:true,noM:true,diff:4,par:4,
   start:['commit','commit','switch -c feature','commit','switch main','switch -c hotfix','commit','switch main','commit'],
   rules:[['main contient le panier C',s=>contains(s,'main','C')],['main contient le correctif D',s=>contains(s,'main','D')],['Aucune voiture de jonction sur main',s=>noMerge(s,'main')]],
   brief:'Deux voies à livrer sur main, mais la grue de jonction est en panne&nbsp;: seuls les fast-forward passent.',
   hint:'Pour chaque voie : « Déplacer la rame » derrière main, puis « Atteler la voie » (fast-forward). Quatre manœuvres.',
   learn:'git switch feature && git rebase main\ngit switch main && git merge feature\ngit switch hotfix && git rebase main\ngit switch main && git merge hotfix'},
  /* ---- Ligne 3 · Le tri ---- */
  {ch:2,nom:'L’express du correctif',type:'compo',diff:2,start:TRI,target:[...TRI,'cherry-pick D'],par:1,tool:'cherry',nouveau:['cherry','souder'],
   brief:'La voiture D transporte le correctif de la TVA. Elle doit partir sur main tout de suite&nbsp;; C et E ne sont pas prêtes.',
   hint:'Outil « Copier une voiture », glissez D sur main. Au clavier : cherry-pick D.',learn:'git switch main\ngit cherry-pick D'},
  {ch:2,nom:'La soudure',type:'compo',match:'raw',diff:3,tool:'souder',par:2,
   start:['commit','commit','switch -c feature','commit','commit','commit','switch main','commit'],
   target:['commit','commit','switch -c feature','commit','commit','commit','switch main','commit','switch feature','reset --soft HEAD~3','commit','rebase main'],
   brief:'Trois voitures «&nbsp;en cours&nbsp;» (C, D, E)&nbsp;: le relecteur veut une seule voiture, posée derrière F.',
   hint:'Outil « Souder », touchez C : de C au bout, tout est soudé. Puis « Déplacer la rame » sur main. Au clavier : switch feature, reset --soft HEAD~3, commit, rebase main.',
   learn:'git switch feature\ngit reset --soft HEAD~3\ngit commit\ngit rebase main'},
  {ch:2,nom:'La voiture suspecte',type:'regles',diff:3,cargo:{D:'debug'},start:TRI,par:2,
   rules:[['main contient C',s=>contains(s,'main','C')],['main contient E',s=>contains(s,'main','E')],['Aucune voiture chargée de debug sur main',s=>noCargo(s,'main','debug')]],
   brief:'La voiture D (losange rouge) contient du code de débogage. C et E doivent rejoindre main, mais jamais D.',
   hint:'Un merge ou un rebase emmènerait D. Copiez plutôt C, puis E, sur main.',learn:'git switch main\ngit cherry-pick C\ngit cherry-pick E'},
  {ch:2,nom:'La copie',type:'prono',diff:3,start:TRI,cmds:['cherry-pick E'],
   wrong:[{cmds:['switch feature','reset --hard D','switch main','cherry-pick E'],why:'cherry-pick copie : la voiture E reste aussi sur feature.'},
          {cmds:['merge feature'],why:'Ça, c’est git merge : toute la rame arrive sur main, C et D compris.'}],
   brief:'La motrice est sur main. Ordre&nbsp;: cherry-pick E. Quel plateau&nbsp;?',learn:'cherry-pick copie une voiture : l’original ne bouge pas.'},
  {ch:2,nom:'La release',type:'compo',keyboard:true,diff:4,start:FORK,target:[...FORK,'switch -c release','cherry-pick D'],par:2,
   brief:'Les gestes sont hors service. Au clavier seulement&nbsp;: posez une voie release au bout de main et copiez-y la voiture D.',
   hint:'switch -c release, puis cherry-pick D.',learn:'git switch -c release\ngit cherry-pick D'},
  /* ---- Ligne 4 · Les grandes lignes ---- */
  {ch:3,nom:'Premier départ',type:'compo',diff:2,start:['commit','commit','push','commit'],target:['commit','commit','push','commit','push'],par:1,nouveau:['push','pull','pullr','revert'],
   brief:'En face, le quai distant origin&nbsp;: ce qui y est poussé est parti chez tous les voyageurs (pastille fléchée). Faites partir la voiture C.',
   hint:'Bouton « Pousser », ou push.',learn:'git push'},
  {ch:3,nom:'Push rejeté',type:'regles',diff:3,start:['commit','commit','push','commit','_coll'],par:2,
   rules:[['origin/main contient votre voiture C',s=>contains(s,'origin/main','C')],['origin/main contient la voiture D du collègue',s=>contains(s,'origin/main','D')],
          ['Ligne droite : aucune voiture de jonction',s=>noMerge(s,'origin/main')],['main et origin/main identiques',same]],
   brief:'Un collègue a poussé la voiture D pendant que vous accrochiez C. Votre push sera refusé&nbsp;: intégrez son travail en ligne droite, puis poussez.',
   hint:'« Tirer en rebasant » (pull --rebase) raccroche C derrière D. Puis « Pousser ».',learn:'git pull --rebase\ngit push'},
  {ch:3,nom:'La voiture fautive est partie',type:'regles',diff:4,noForce:true,cargo:{C:'bug'},start:['commit','commit','commit','push'],par:2,tool:'revert',
   rules:[['origin/main annule l’effet de la voiture C',s=>reverted(s,'origin/main','C')],['L’histoire publiée reste intacte (C toujours là)',s=>contains(s,'origin/main','C')],['main et origin/main identiques',same]],
   brief:'La voiture C (losange rouge) a cassé la prod, et elle est déjà partie. Impossible de la retirer du train&nbsp;: des voyageurs sont à bord. Annulez son effet proprement.',
   hint:'Outil « Voiture inverse », touchez C (git revert C), puis « Pousser ». Reculer la voie puis forcer le push est interdit ici.',learn:'git revert C\ngit push'},
  {ch:3,nom:'Départ imminent',type:'regles',time:80,diff:4,par:4,start:['commit','commit','push','switch -c feature','commit','commit','switch main','_coll'],
   rules:[['origin/main contient le panier C et D',s=>contains(s,'origin/main','C')&&contains(s,'origin/main','D')],['origin/main contient la voiture E du collègue',s=>contains(s,'origin/main','E')],
          ['Aucune voiture de jonction',s=>noMerge(s,'origin/main')],['main et origin/main identiques',same]],
   brief:'Le train part dans 80 secondes. Livrez le panier (C, D) avec la voiture E du collègue, en ligne droite, et faites partir le tout.',
   hint:'Sur main : « Tirer ». Puis « Déplacer la rame » feature sur main, « Atteler la voie » (fast-forward) et « Pousser ».',
   learn:'git pull\ngit switch feature && git rebase main\ngit switch main && git merge feature\ngit push'},
  /* ---- Ligne 5 · Les accidents ---- */
  {ch:4,nom:'La casse',type:'compo',diff:3,start:['commit','commit','switch -c feature','commit','commit','commit','reset --hard C'],
   target:['commit','commit','switch -c feature','commit','commit','commit','reset --hard C','reset --hard E'],par:1,nouveau:['recover'],
   brief:'Un collègue a lancé reset --hard C sur feature&nbsp;: D et E sont parties sur la voie de garage. Récupérez-les.',
   hint:'Touchez E sur la voie de garage, sous le plateau (reset --hard E). Au clavier : reflog, puis reset --hard feature@{1}.',learn:'git reflog\ngit reset --hard feature@{1}'},
  {ch:4,nom:'Soft ou hard&nbsp;?',type:'prono',diff:3,start:['commit','commit','commit','commit'],cmds:['reset --soft HEAD~2','commit'],
   wrong:[{cmds:['reset --hard HEAD~2'],why:'--hard jette les voitures. --soft les garde sur le quai, prêtes à être soudées par le commit suivant.'},
          {cmds:['commit'],why:'reset --soft recule d’abord la voie de deux voitures.'}],
   brief:'Ordre&nbsp;: reset --soft HEAD~2, puis commit. Quel plateau&nbsp;?',learn:'reset --soft recule la voie mais garde les changements : le commit suivant les soude.'},
  {ch:4,nom:'La livraison du vendredi',type:'regles',budget:7,time:150,diff:5,noForce:true,cargo:{D:'debug'},par:5,
   start:['commit','commit','push','switch -c feature','commit','commit','commit','switch main','switch -c hotfix','commit','switch main','_coll'],
   rules:[['origin/main contient la voiture G du collègue',s=>contains(s,'origin/main','G')],['origin/main contient le correctif F',s=>contains(s,'origin/main','F')],
          ['origin/main contient C et E',s=>contains(s,'origin/main','C')&&contains(s,'origin/main','E')],['Aucune voiture debug sur origin/main',s=>noCargo(s,'origin/main','debug')],
          ['Aucune voiture de jonction sur origin/main',s=>noMerge(s,'origin/main')],['main et origin/main identiques',same]],
   brief:'Vendredi, 17&nbsp;h. Le collègue a poussé G, le correctif F attend sur hotfix, le panier C-D-E sur feature (D contient du debug). Tout doit partir proprement&nbsp;: 7 manœuvres maximum, 150 secondes.',
   hint:'« Tirer » sur main, puis copiez F, C et E sur main, puis « Pousser ». Cinq manœuvres.',learn:'git pull\ngit cherry-pick F\ngit cherry-pick C\ngit cherry-pick E\ngit push'}
];
LEVELS.forEach(L=>{ L.tags=[L.type]; if(L.budget) L.tags.push('budget'); if(L.keyboard) L.tags.push('clavier'); if(L.time) L.tags.push('chrono'); if(L.panne) L.tags.push('panne'); });

export { ALLOW, TOOLSET, CH, TOOLS, BTNS, TAG, SHORT, LEVELS };

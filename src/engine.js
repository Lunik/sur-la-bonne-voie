/* Moteur Git miniature : pur, sans DOM. */
const LET='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const raw=l=>l.replace(/′/g,'');

function fresh(){ return {c:{},b:{},order:[],head:'main',next:0,n:0,remote:{},rl:{},pending:null,cargo:{},allow:null,noM:false,noForce:false}; }
const clone=s=>JSON.parse(JSON.stringify(s));
function mk(s,parents,label,origin,kind,cargo){ const id='k'+(s.n++); s.c[id]={id,parents,label,origin,kind:kind||'n',cargo:cargo||null}; return id; }
function setTip(s,b,id){ s.b[b]=id; (s.rl[b]=s.rl[b]||[]).unshift(id); }
function anc(s,id){ const set=new Set(),st=[id]; while(st.length){ const x=st.pop(); if(!x||set.has(x)) continue; set.add(x); st.push(...s.c[x].parents);} return set; }
function fp(s,id){ const out=[]; let x=id; while(x){ out.push(x); x=s.c[x].parents[0]; } return out; }
function reach(s){ const r=new Set(); [...Object.values(s.b),...Object.values(s.remote)].forEach(t=>{ if(t) anc(s,t).forEach(x=>r.add(x)); }); return r; }
function orphans(s){ const r=reach(s), p=new Set(s.pending||[]); return Object.keys(s.c).filter(id=>!r.has(id)&&!p.has(id)); }
function normLabel(l){ return l.toUpperCase().replace(/['’`]/g,'′'); }
function findLabel(s,l){ const L=normLabel(l), r=reach(s); const c=Object.values(s.c).filter(c=>c.label===L); return (c.find(x=>r.has(x.id))||c[c.length-1])?.id; }
function refTip(s,x){
  if(!x) throw new Error('fatal: précisez une voie.');
  if(x in s.b) return s.b[x];
  if(x.startsWith('origin/') && s.remote[x.slice(7)]) return s.remote[x.slice(7)];
  throw new Error(`fatal: voie inconnue « ${x} ».`);
}
function resolve(s,ref){
  let m;
  if((m=ref.match(/^(.+)~(\d+)$/))){ let x=resolve(s,m[1]); for(let i=0;i<+m[2];i++) x=x&&s.c[x].parents[0]; return x; }
  if((m=ref.match(/^(.+)\^$/))){ const x=resolve(s,m[1]); return x&&s.c[x].parents[0]; }
  if((m=ref.match(/^(.+)@\{(\d+)\}$/))){ const b=m[1]==='HEAD'?s.head:m[1]; return (s.rl[b]||[])[+m[2]]; }
  if(ref==='HEAD') return s.b[s.head];
  if(ref in s.b) return s.b[ref];
  if(ref.startsWith('origin/')) return s.remote[ref.slice(7)];
  return findLabel(s,ref);
}
function doMerge(s,tX,name,out){
  const H=s.head,tH=s.b[H];
  if(anc(s,tH).has(tX)){ out.push('Already up to date.'); return null; }
  if(anc(s,tX).has(tH)){ setTip(s,H,tX); out.push(`Fast-forward · ${H} avance jusqu’à ${s.c[tX].label}, sans voiture de jonction`); return 'merge'; }
  if(s.noM) throw new Error('Panne de la grue de jonction : seuls les fast-forward passent. Raccrochez d’abord la voie (rebase).');
  const id=mk(s,[tH,tX],'M',H,'m'); setTip(s,H,id);
  out.push(`Merge made by the 'ort' strategy · voiture de jonction M (relie ${s.c[tX].label})`); return 'merge';
}
function doRebase(s,tX,name,out){
  const H=s.head,tH=s.b[H],aX=anc(s,tX);
  if(anc(s,tH).has(tX)){ out.push(`Current branch ${H} is up to date.`); return null; }
  const list=fp(s,tH).filter(id=>!aX.has(id)).reverse().filter(id=>s.c[id].kind!=='m');
  if(!list.length){ setTip(s,H,tX); out.push(`Fast-forward · ${H} rejoint ${name}`); return 'rebase'; }
  let base=tX; const made=[];
  for(const id of list){ const o=s.c[id]; base=mk(s,[base],o.label+'′',o.origin,o.kind==='r'?'r':'n',o.cargo); made.push(s.c[base].label); }
  setTip(s,H,base);
  out.push(`Successfully rebased refs/heads/${H} · voitures recréées : ${made.join(', ')}`);
  out.push(`  (les anciennes ${list.map(i=>s.c[i].label).join(', ')} partent sur la voie de garage)`);
  return 'rebase';
}
function exec(s,line){
  const t=line.trim().replace(/^git\s+/,'').split(/\s+/).filter(Boolean);
  let cmd=t[0]; const out=[]; let kind=null;
  if(!cmd) return {out,kind};
  if(cmd==='checkout') cmd='switch';
  const gate=c=>{ if(s.allow && !s.allow.includes(c)) throw new Error(`git ${c} n’est pas encore au programme : il s’apprend plus loin sur le réseau.`); };
  const H=s.head, tH=s.b[H];
  switch(cmd){
    case 'commit':{
      gate('commit'); let label,origin=H,cargo;
      if(s.pending&&s.pending.length){ label=s.pending.map(id=>raw(s.c[id].label)).join(''); cargo=s.pending.map(id=>s.c[id].cargo).find(Boolean); origin=s.c[s.pending[0]].origin;
        out.push(`[${H} ${label}] ${s.pending.length} voitures soudées en une seule`); s.pending=null; }
      else { label=LET[s.next++]; cargo=s.cargo[label]; out.push(`[${H} ${label}] nouvelle voiture accrochée`); }
      const id=mk(s,tH?[tH]:[],label,origin,'n',cargo); setTip(s,H,id); if(!s.order.includes(H)) s.order.push(H); kind='commit'; break; }
    case 'branch':{
      gate('branch'); const x=t[1]; if(!x) throw new Error('fatal: donnez un nom à la nouvelle voie.');
      if(x in s.b) throw new Error(`fatal: la voie « ${x} » existe déjà.`);
      if(!/^[a-z0-9][a-z0-9_-]{0,14}$/i.test(x)) throw new Error('fatal: nom de voie invalide (lettres, chiffres, tirets).');
      if(s.order.length>=3) throw new Error('Le plateau n’a que trois voies.');
      s.b[x]=tH; s.rl[x]=[tH]; s.order.push(x); out.push(`Voie « ${x} » posée au niveau de la voiture ${s.c[tH].label}.`); kind='branch'; break; }
    case 'switch':{
      if(t[1]==='-c'||t[1]==='-b'){ const r=exec(s,'branch '+(t[2]||'')); out.push(...r.out); s.head=t[2]; out.push(`Switched to a new branch '${t[2]}'`); kind='branch'; break; }
      if(t[1]&&t[1].startsWith('origin/')) throw new Error('Le quai distant se consulte, il ne se conduit pas.');
      if(!t[1]||!(t[1] in s.b)) throw new Error(`fatal: voie inconnue « ${t[1]||''} ». Pour en créer une : switch -c nom.`);
      if(t[1]===H){ out.push(`Already on '${H}'`); break; }
      s.head=t[1]; out.push(`Switched to branch '${t[1]}' · la motrice change de voie`); break; }
    case 'merge':{
      gate('merge'); const x=t[1]; const tX=refTip(s,x); if(x===H) throw new Error('fatal: impossible de fusionner une voie avec elle-même.');
      kind=doMerge(s,tX,x,out); break; }
    case 'rebase':{
      gate('rebase'); const x=t[1]; const tX=refTip(s,x); if(x===H) throw new Error('fatal: impossible de rebaser une voie sur elle-même.');
      kind=doRebase(s,tX,x,out); break; }
    case 'cherry-pick':{
      gate('cherry-pick'); const l=t[1]; if(!l) throw new Error('fatal: précisez la voiture à copier (ex. D).');
      const id=findLabel(s,l); if(!id) throw new Error(`fatal: voiture « ${normLabel(l)} » introuvable.`);
      if(anc(s,tH).has(id)) throw new Error(`La voiture ${s.c[id].label} est déjà sur la voie ${H}.`);
      if(s.c[id].kind==='m') throw new Error('Copier une voiture de jonction : pas sur ce réseau.');
      const o=s.c[id]; const n=mk(s,[tH],raw(o.label)+'′',o.origin,o.kind==='r'?'r':'n',o.cargo); setTip(s,H,n);
      out.push(`[${H} ${s.c[n].label}] copie de la voiture ${o.label}`); kind='cherry-pick'; break; }
    case 'reset':{
      gate('reset'); let mode='mixed', ref='HEAD';
      t.slice(1).forEach(a=>{ if(a==='--soft'||a==='--hard'||a==='--mixed') mode=a.slice(2); else ref=a; });
      const target=resolve(s,ref); if(!target) throw new Error(`fatal: référence « ${ref} » introuvable.`);
      if(target===tH){ out.push(`HEAD is now at ${s.c[tH].label}`); break; }
      const before=reach(s);
      if(mode==='hard') s.pending=null;
      else { const ch=fp(s,tH), i=ch.indexOf(target); s.pending = i>0 ? ch.slice(0,i).reverse().concat(s.pending||[]) : null; }
      setTip(s,H,target);
      const after=reach(s), pend=new Set(s.pending||[]);
      const lost=[...before].filter(x=>!after.has(x)&&!pend.has(x));
      out.push(`HEAD is now at ${s.c[target].label}`);
      if(s.pending&&s.pending.length) out.push(`  ${s.pending.map(id=>s.c[id].label).join(', ')} dételées, en attente sur le quai (commit pour les souder)`);
      if(lost.length) out.push(`  ${lost.map(id=>s.c[id].label).join(', ')} partent sur la voie de garage`);
      kind='reset'; break; }
    case 'revert':{
      gate('revert'); const l=t[1]; if(!l) throw new Error('fatal: précisez la voiture à inverser (ex. C).');
      const id=findLabel(s,l); if(!id) throw new Error(`fatal: voiture « ${normLabel(l)} » introuvable.`);
      if(!anc(s,tH).has(id)) throw new Error(`La voiture ${s.c[id].label} n’est pas sur la voie ${H}.`);
      if(s.c[id].kind!=='n') throw new Error('Cette voiture ne s’inverse pas sur ce réseau.');
      const n=mk(s,[tH],'↩'+raw(s.c[id].label),H,'r'); setTip(s,H,n);
      out.push(`[${H} ${s.c[n].label}] voiture inverse : annule l’effet de ${s.c[id].label}`); kind='revert'; break; }
    case 'push':{
      gate('push'); const force=t.includes('--force')||t.includes('-f'); const r=s.remote[H];
      if(r===tH){ out.push('Everything up-to-date'); break; }
      if(r && !anc(s,tH).has(r)){
        if(!force) throw new Error(`! [rejected] ${H} -> ${H} (fetch first) · origin/${H} a des voitures que vous n’avez pas. Intégrez-les (pull) avant de pousser.`);
        if(s.noForce) throw new Error('Refusé : des voyageurs sont à bord de ce train. Le push forcé est interdit sur ce réseau.');
        out.push('+ forced update · des voyageurs ont perdu leurs voitures !');
      }
      s.remote[H]=tH; out.push(`To origin · ${H} -> ${H} · le train part !`); kind='push'; break; }
    case 'pull':{
      gate('pull'); const r=s.remote[H]; if(!r) throw new Error(`Aucun quai distant pour la voie ${H}.`);
      out.push(`From origin · origin/${H} récupéré`);
      kind = (t.includes('--rebase') ? doRebase(s,r,'origin/'+H,out) : doMerge(s,r,'origin/'+H,out)) ? 'pull' : null; break; }
    case 'fetch': out.push('Le quai distant est déjà affiché sur le plateau : rien de nouveau.'); break;
    case 'reflog':{
      const b=t.slice(1).find(x=>x!=='show')||H;
      (s.rl[b]||[]).slice(0,8).forEach((id,i)=>out.push(`${b}@{${i}}: ${s.c[id].label}${i===0?'   (position actuelle)':''}`)); break; }
    case 'log':{
      fp(s,tH).forEach(id=>{ const c=s.c[id]; const n=Object.keys(s.b).filter(b=>s.b[b]===id).map(b=>b===H?'HEAD -> '+b:b).concat(Object.keys(s.remote).filter(b=>s.remote[b]===id).map(b=>'origin/'+b));
        out.push(`${c.label}${n.length?'  ('+n.join(', ')+')':''}`); }); break; }
    case 'status':{
      out.push(`On branch ${H}`); if(s.pending&&s.pending.length) out.push(`Voitures dételées sur le quai : ${s.pending.map(id=>s.c[id].label).join(', ')}`);
      const r=s.remote[H]; if(r){ const a=anc(s,tH), b=anc(s,r); const ahead=[...a].filter(x=>!b.has(x)).length, behind=[...b].filter(x=>!a.has(x)).length;
        out.push(ahead||behind?`Votre voie : ${ahead} voiture(s) d’avance, ${behind} de retard sur origin/${H}`:`À jour avec origin/${H}`); } break; }
    case 'help': out.push('Commandes : '+(s.allow||['commit','branch','merge','rebase','cherry-pick','reset','revert','push','pull']).join(' · ')+' · switch · log · status · reflog'); break;
    case '_coll':{ const label=LET[s.next++]; const id=mk(s,[s.remote.main],label,'collègue','n',s.cargo[label]); s.remote.main=id; break; }
    default: throw new Error(`git: « ${cmd} » n’est pas une commande de ce poste. Tapez help.`);
  }
  return {out,kind};
}
function build(cmds,cargo){ const s=fresh(); s.cargo=cargo||{}; cmds.forEach(c=>exec(s,c)); return s; }
function chainSig(s,tip,mode){ return fp(s,tip).reverse().map(id=>{ const c=s.c[id];
  if(c.kind==='m') return 'M('+raw(s.c[c.parents[1]].label)+')';
  if(mode==='shape') return c.origin+(c.label.includes('′')?'′':'');
  return mode==='raw'?raw(c.label):c.label; }).join('-'); }
function tipOf(s,n){ return n.startsWith('origin/')?s.remote[n.slice(7)]:s.b[n]; }
function sig(s,names,mode){ return names.map(n=>{ const t=tipOf(s,n); return n+':'+(t?chainSig(s,t,mode):'∅'); }).join(' | '); }

/* Règles */
const onRef=(s,r)=>{ const t=tipOf(s,r); return t?[...anc(s,t)]:[]; };
const contains=(s,r,L)=>onRef(s,r).some(id=>s.c[id].kind==='n' && raw(s.c[id].label).split('').includes(L));
const noCargo=(s,r,c)=>!onRef(s,r).some(id=>s.c[id].cargo===c);
const noMerge=(s,r)=>!onRef(s,r).some(id=>s.c[id].kind==='m');
const reverted=(s,r,L)=>onRef(s,r).some(id=>s.c[id].kind==='r' && raw(s.c[id].label)==='↩'+L);
const same=s=>!!s.remote.main && s.remote.main===s.b.main;

export { LET, raw, fresh, clone, mk, setTip, anc, fp, reach, orphans, normLabel, findLabel, refTip, resolve, doMerge, doRebase, exec, build, chainSig, tipOf, sig, onRef, contains, noCargo, noMerge, reverted, same };

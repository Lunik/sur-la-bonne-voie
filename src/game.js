import { LET, raw, fresh, clone, mk, setTip, anc, fp, reach, orphans, normLabel, findLabel, refTip, resolve, doMerge, doRebase, exec, build, chainSig, tipOf, sig, onRef, contains, noCargo, noMerge, reverted, same } from './engine.js';
import { ALLOW, TOOLSET, CH, TOOLS, BTNS, TAG, SHORT, LEVELS } from './levels.js';

/* Interface impérative : branchée sur le DOM rendu par App.jsx. */
export function startGame(){
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

/* ================= État ================= */
let cur=0,S,T,tNames,hist=[],moves=0,tool=null,sel=null,lines=[],newIds=new Set(),done=false,timer=null,tLeft=0,wrongs=0,cmdHist=[],cmdPos=0;
let stars={}, unlockAll=false;
try{ stars=JSON.parse(localStorage.getItem('gare2.stars')||'{}'); unlockAll=localStorage.getItem('gare2.unlock')==='1'; const c=+localStorage.getItem('gare2.cur'); if(c>=0&&c<LEVELS.length) cur=c; }catch(e){}
function save(){ try{ localStorage.setItem('gare2.stars',JSON.stringify(stars)); localStorage.setItem('gare2.unlock',unlockAll?'1':'0'); localStorage.setItem('gare2.cur',String(cur)); }catch(e){} }
const lvl=()=>LEVELS[cur];
const unlocked=i=>unlockAll||i===0||(stars[i-1]||0)>0;
if(!unlocked(cur)) cur=0;
const toolsOf=L=>CH[L.ch].tools;
const gesturesOff=()=>{ const L=lvl(); return L.type==='prono'||L.keyboard||$('expert').checked; };
function toast(m,k){ const t=$('toast'); t.textContent=m; t.className='toast '+(k||''); }

function load(i){
  stopTimer(); cur=i; save(); const L=lvl(), C=CH[L.ch];
  S=build(L.start,L.cargo); S.allow=C.allow; S.noM=!!L.noM; S.noForce=!!L.noForce;
  if(L.target){ T=build(L.target,L.cargo); tNames=Object.keys(T.b).concat(Object.keys(T.remote).map(b=>'origin/'+b)); } else { T=null; tNames=[]; }
  hist=[]; moves=0; sel=null; newIds=new Set(); done=false; wrongs=0;
  const dragTools=toolsOf(L).filter(t=>TOOLS[t]);
  tool = L.tool || (dragTools.length?dragTools[dragTools.length-1]:null);
  if(L.tool==null && dragTools.includes('rebase')) tool='rebase';
  lines=[`<span class="o"># Ligne ${L.ch+1} · ${esc(L.nom.replace(/&nbsp;/g,' '))}</span>`];
  $('hint').hidden=true; $('hint').textContent=L.hint||'';
  $('expert').checked=!!L.keyboard; $('expert').disabled=!!L.keyboard;
  $('expert-wrap').hidden = L.type==='prono';
  renderBoard(); renderNet(); renderTools(); render();
  $('post').hidden = L.type==='prono'; $('prono').hidden = L.type!=='prono';
  if(L.type==='prono') renderProno();
  toast(L.keyboard?'Gestes hors service : tapez vos commandes dans le terminal.':'La motrice attend vos ordres.','info');
  $('yard').classList.remove('leave');
  if(L.time) ready();
}

/* ---------- Plan du réseau ---------- */
function renderNet(){
  let h='', total=0;
  CH.forEach((c,ci)=>{
    const idx=LEVELS.map((L,i)=>[L,i]).filter(([L])=>L.ch===ci);
    h+=`<div class="line" style="--lc:${c.col}"><span class="lname"><b>L${ci+1}</b>${esc(c.nom)}</span><div class="stations">`+
      idx.map(([L,i],j)=>{ const open=unlocked(i), st=stars[i]||0; total+=st;
        const tg=L.tags.includes('chrono')?'chrono':L.tags.includes('clavier')?'clavier':L.tags.includes('budget')?'budget':L.tags.includes('panne')?'panne':L.type;
        return `<button type="button" class="station${i===cur?' cur':''}${st?' done':''}${open?'':' locked'}" data-lv="${i}" ${open?'':'disabled'} aria-label="Station ${j+1}, ${esc(L.nom.replace(/&nbsp;/g,' '))}${open?'':', verrouillée'}" title="${esc(L.nom.replace(/&nbsp;/g,' '))}">
          <span class="dot">${j+1}</span><span class="sn">${SHORT[tg]}</span><span class="ss">${open?('★'.repeat(st)+'☆'.repeat(3-st)):'fermée'}</span></button>`; }).join('')+`</div></div>`;
  });
  $('net').innerHTML=h; $('tot').textContent=`${total} / ${LEVELS.length*3} étoiles`; $('unlock').checked=unlockAll;
}

/* ---------- Tableau des départs ---------- */
function renderBoard(){
  const L=lvl(), C=CH[L.ch], j=LEVELS.filter(x=>x.ch===L.ch).indexOf(L);
  $('lv-where').innerHTML=`Ligne ${L.ch+1} · ${esc(C.nom)} · station ${j+1}`;
  $('lv-name').innerHTML=L.nom;
  $('lv-tags').innerHTML=L.tags.map((t,k)=>`<span class="tag${k?' alt':''}">${TAG[t]}</span>`).join('')+`<span class="lamps" aria-label="Difficulté ${L.diff} sur 5">${[1,2,3,4,5].map(n=>`<i class="${n<=L.diff?'on':''}"></i>`).join('')}</span>`;
  $('lv-brief').innerHTML=L.brief;
  let g='';
  if(L.type==='prono') g=`<p class="lbl">Ordre de manœuvre</p><ol class="orders">${L.cmds.map(c=>`<li>git ${esc(c)}</li>`).join('')}</ol>`;
  else if(L.rules) g=`<p class="lbl">Règlement à respecter</p><ul class="rules" id="rules"></ul>`;
  else g=`<p class="lbl">Train attendu</p><div class="yard mini">${yardHTML(T,false)}</div>`;
  $('goal').innerHTML=g;
  renderChips();
}
function renderChips(){
  const L=lvl(); let c=[];
  if(L.type==='prono') c.push(`<span class="chip">★★★ du premier coup</span>`);
  else c.push(`<span class="chip">★★★ en ${L.par} manœuvre${L.par>1?'s':''}</span>`);
  if(L.budget) c.push(`<span class="chip${moves>=L.budget-1?' hot':''}">Budget : ${moves} / ${L.budget}</span>`);
  if(L.time) c.push(`<span class="chip${tLeft<=15&&timer?' hot':''}" id="clock">Départ dans ${fmt(tLeft||L.time)}</span>`);
  $('lv-chips').innerHTML=c.join('');
}
const fmt=s=>{ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };

/* ---------- Plateau ---------- */
function layout(s){
  const rows=[], placed={};
  const add=(name,kind,tip)=>{
    const ch=[]; let x=tip; while(x && !(x in placed)){ ch.unshift(x); x=s.c[x].parents[0]; }
    const f=x?placed[x]:null, fork=f?f.col:-1, ri=rows.length;
    const cells=ch.map((id,j)=>({id,col:fork+1+j})); cells.forEach(c=>placed[c.id]={row:ri,col:c.col});
    rows.push({name,kind,fork,forkRow:f?f.row:-1,cells});
  };
  if(s.b.main) add('main','local',s.b.main);
  s.order.forEach(b=>{ if(b!=='main'&&s.b[b]) add(b,'local',s.b[b]); });
  Object.keys(s.remote).forEach(b=>{ const t=s.remote[b]; if(t&&!(t in placed)) add('origin/'+b,'remote',t); });
  return rows;
}
const ICON={
  rebase:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h7M3 7h18"/><path d="M10 18c4 0 5-11 9-11"/><path d="M16 4l3 3-3 3"/></svg>',
  merge:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v3c0 5 6 6 6 11v4M18 3v3c0 5-6 6-6 11"/></svg>',
  cherry:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 4H6a2 2 0 0 0-2 2v10"/></svg>',
  souder:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  revert:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  commit:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M12 9v6M9 12h6"/></svg>',
  branch:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18"/><path d="M3 18c8 0 9-11 18-11"/></svg>',
  push:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  pull:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7L7 17M15 17H7V9"/></svg>',
  pullr:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M7 9l5 5 5-5M4 20h16"/></svg>',
  dep:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M4.5 3H9v4.5"/></svg>'
};
const LOCO_PATH='M3,10 Q3,7 7,7 H58 C78,7 92,20 101,40 Q103,44 103,48 Q103,52 99,52 H5 Q3,52 3,50 Z';
function locoSVG(){ return `<svg viewBox="0 0 104 63" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="mclip"><path d="${LOCO_PATH}"/></clipPath></defs>
  <rect class="mgw" x="-8" y="19" width="9" height="20" rx="2"/><path class="mp" d="M18 7 L27 1 L36 7 M22 1 H32"/>
  <path class="mb" d="${LOCO_PATH}"/><g clip-path="url(#mclip)"><rect class="mr" x="0" y="0" width="110" height="13"/><path class="ml" d="M0,41 H56 C72,41 87,36 106,28 V35 C87,43 72,47 56,47 H0 Z"/></g>
  <rect class="mg" x="9" y="16" width="46" height="16" rx="3"/><text class="mt" x="32" y="27.2" text-anchor="middle">HEAD</text>
  <path class="mg" d="M61,16 H68 C78,17 86,24 91,32 H61 Z"/><ellipse class="mh" cx="99.5" cy="45" rx="2.2" ry="1.5"/>
  <rect class="mw" x="10" y="52" width="24" height="6" rx="2"/><rect class="mw" x="62" y="52" width="24" height="6" rx="2"/>
  <circle class="mwh" cx="16" cy="59" r="3.6"/><circle class="mwh" cx="28" cy="59" r="3.6"/><circle class="mwh" cx="68" cy="59" r="3.6"/><circle class="mwh" cx="80" cy="59" r="3.6"/></svg>`; }
function yardHTML(s,live,deco){
  const rows=layout(s);
  const colorOf=o=>{ if(o==='collègue') return 3; const i=s.order.indexOf(o); return i<=0?0:Math.min(i,2); };
  const flags={}; Object.keys(s.b).forEach(b=>(flags[s.b[b]]=flags[s.b[b]]||[]).push({n:b}));
  Object.keys(s.remote).forEach(b=>{ const t=s.remote[b]; if(t)(flags[t]=flags[t]||[]).push({n:'origin/'+b,r:true}); });
  const gone=new Set(); Object.values(s.remote).forEach(t=>{ if(t) anc(s,t).forEach(x=>gone.add(x)); });
  const withLoco=live||deco;
  let max=0; rows.forEach(r=>{ const end=(r.cells.length?r.cells[r.cells.length-1].col:r.fork)+(withLoco&&r.kind==='local'&&s.head===r.name?1:0); max=Math.max(max,end); });
  const W=`calc(var(--slot) * ${max+2} + ${withLoco?36:12}px)`;
  const dragOk=live&&!gesturesOff()&&tool;
  let h='';
  rows.forEach((r,ri)=>{
    const isHead=r.kind==='local'&&s.head===r.name, start=r.fork+1;
    h+=`<div class="voie${isHead?' go':''}${r.kind==='remote'?' remote':''}" ${r.kind==='local'?`data-row="${esc(r.name)}"`:''}>`;
    if(!deco){
      if(live&&r.kind==='local') h+=`<button type="button" class="sign${isHead?' head':''}" data-sw="${esc(r.name)}">${esc(r.name)}<small>${isHead?'<em>HEAD</em>motrice ici':'conduire la motrice ici'}</small></button>`;
      else h+=`<span class="sign">${esc(r.name)}<small>${r.kind==='remote'?'quai distant':''}</small></span>`;
    }
    h+=`<div class="track" style="width:${W}"><span class="rail" style="left:calc(var(--slot) * ${Math.max(start,0)})"></span>`;
    if(r.fork>=0) h+=`<svg class="fork" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style="left:calc(var(--slot) * ${r.fork+1} - var(--slot) * .9);width:calc(var(--slot) * .9);height:calc(${ri-r.forkRow} * (var(--rowh) + var(--gap)))"><path class="r1" d="M0,0 C55,0 45,100 100,100"/><path class="r2" d="M0,0 C55,0 45,100 100,100"/></svg>`;
    r.cells.forEach((cell,j)=>{
      const c=s.c[cell.id]; const cls=c.kind==='m'?'cm':c.kind==='r'?'cr':'c'+colorOf(c.origin);
      const fl=(flags[cell.id]||[]).filter(f=>live||!rows.some(rr=>rr.name===f.n&&rr.cells.length));
      const lab=c.kind==='m'?`M<small>+${esc(raw(s.c[c.parents[1]].label))}</small>`:esc(c.label);
      h+=`<div class="wagon ${cls}${c.label.includes('′')?' fresh':''}${raw(c.label).length>2?' long':''}${j===0&&r.fork<0?' first':''}${live&&newIds.has(cell.id)?' new':''}${live&&sel&&sel.id===cell.id?' sel':''}${dragOk?' grab':''}"
        style="left:calc(var(--slot) * ${cell.col} + 4px)" data-id="${cell.id}" data-from="${esc(r.name)}" title="Voiture ${esc(c.label)}${c.cargo?' · chargement '+c.cargo:''}${gone.has(cell.id)?' · partie sur origin':''}">
        <span class="gl"><b>${lab}</b></span><span class="lv"></span><span class="bg l"></span><span class="bg r"></span>${c.cargo?'<span class="pl"></span>':''}${gone.has(cell.id)?`<span class="dep">${ICON.dep}</span>`:''}
        ${fl.length&&!deco?`<span class="flag">${fl.map(f=>`<span class="${f.r?'r':''}">${esc(f.n)}</span>`).join('')}</span>`:''}</div>`;
    });
    if(isHead&&withLoco){ const lc=(r.cells.length?r.cells[r.cells.length-1].col:r.fork)+1; h+=`<div class="loco" style="left:calc(var(--slot) * ${lc} + 4px)">${locoSVG()}</div>`; }
    if(live) h+=`<span class="bumper" style="left:calc(var(--slot) * ${max+1} + 34px)"></span>`;
    h+=`</div></div>`;
  });
  return h;
}
function renderTools(){
  const L=lvl(), ts=toolsOf(L), nv=L.nouveau||[];
  const drag=ts.filter(t=>TOOLS[t]);
  $('tools').innerHTML=drag.map(t=>`<button class="tool" type="button" data-tool="${t}">${ICON[t]}<b>${TOOLS[t].b}</b><small>${TOOLS[t].s}</small>${nv.includes(t)?'<span class="nv">NOUVEAU</span>':''}</button>`).join('');
  $('tools').hidden=!drag.length;
  $('buttons').innerHTML=ts.filter(t=>BTNS[t]).map(t=>`<button class="btn" type="button" data-btn="${t}">${ICON[t]}${BTNS[t][0]}<small>${BTNS[t][1]}</small>${nv.includes(t)?'<span class="nv">NOUVEAU</span>':''}</button>`).join('');
  $('cli-help').innerHTML='Essayez&nbsp;: '+CH[L.ch].cli.map(c=>`<code>${esc(c)}</code>`).join('');
}
function renderLegend(){
  const ch=lvl().ch, it=['<span><i class="sw hd"></i>motrice jaune&nbsp;: HEAD</span>'];
  if(ch>=1) it.push('<span><i class="sw fr"></i>double filet&nbsp;: commit recréé</span>','<span><i class="sw m"></i>M&nbsp;: voiture de jonction</span>');
  if(ch>=2) it.push('<span><i class="sw hz"></i>losange rouge&nbsp;: chargement suspect</span>');
  if(ch>=3) it.push('<span><i class="sw dp"></i>pastille&nbsp;: partie sur origin</span>','<span><i class="sw co"></i>livrée rose&nbsp;: collègue</span>','<span><i class="sw rv"></i>caisse sombre&nbsp;: voiture inverse</span>');
  $('legend').innerHTML=it.join('');
}
function render(){
  const L=lvl();
  $('yard').innerHTML=yardHTML(S,true);
  document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('on',b.dataset.tool===tool));
  $('gestures').hidden=gesturesOff();
  const tk=tool&&TOOLS[tool]?TOOLS[tool].k:null;
  $('tool-help').textContent= tk==='tap' ? (tool==='souder'?'Touchez la première voiture de la série : de cette voiture au bout de la voie, tout est soudé en une seule voiture.':'Touchez la voiture dont il faut annuler l’effet.')
    : tk==='drag' ? 'Glissez une voiture sur une autre voie, ou touchez la voiture puis la voie. Touchez une pancarte pour y conduire la motrice.'
    : 'Touchez une pancarte pour y conduire la motrice.';
  $('moves').textContent=moves+(moves>1?' manœuvres':' manœuvre')+(L.budget?` / ${L.budget}`:'');
  $('term').innerHTML=lines.join('\n'); $('term').scrollTop=1e9;
  const pend=S.pending&&S.pending.length; $('quai').hidden=!pend;
  if(pend) $('quai').innerHTML=`Sur le quai, dételées&nbsp;: <b>${S.pending.map(id=>esc(S.c[id].label)).join(', ')}</b>. Un <code>commit</code> les soude en une seule voiture.`;
  const orph=orphans(S), can=toolsOf(L).includes('recover')&&L.type!=='prono';
  $('casse').hidden=!orph.length;
  if(orph.length) $('casse').innerHTML=`<p>Voie de garage${can?' · touchez une voiture pour la récupérer':''}</p>`+orph.map(id=>`<button type="button" class="gw${can?' can':''}" data-orphan="${id}" aria-label="Voiture ${esc(S.c[id].label)} sur la voie de garage"><b>${esc(S.c[id].label)}</b></button>`).join('');
  if(L.rules&&$('rules')) $('rules').innerHTML=L.rules.map(([t,f])=>{ const ok=f(S); return `<li class="${ok?'ok':''}"><span class="ck" aria-label="${ok?'respectée':'pas encore'}">${ok?'✓':''}</span>${esc(t)}</li>`; }).join('');
  renderChips(); renderLegend();
  newIds=new Set();
}

/* ---------- Exécution ---------- */
function solved(){
  const L=lvl(); if(L.type==='prono') return false;
  let ok=true; if(T) ok=sig(S,tNames,L.match)===sig(T,tNames,L.match);
  if(L.rules) ok=ok&&L.rules.every(r=>r[1](S));
  return ok;
}
function run(cmds,msg,asOne){
  if(done) return false;
  const snap=clone(S), before=new Set(Object.keys(S.c)); let count=0;
  try{ for(const c of cmds){ lines.push(`<span class="p">$ git ${esc(c)}</span>`); const r=exec(S,c); r.out.forEach(o=>lines.push(esc(o))); if(r.kind) count++; } }
  catch(err){ S=snap; lines.push(`<span class="e">${esc(err.message)}</span>`); toast(err.message,'bad'); shake($('yard')); render(); return false; }
  if(asOne) count=Math.min(count,1);
  if(count) hist.push({S:snap,moves});
  moves+=count;
  Object.keys(S.c).forEach(k=>{ if(!before.has(k)) newIds.add(k); });
  sel=null;
  const L=lvl();
  if(solved()){ render(); victory(); return true; }
  if(L.budget&&moves>=L.budget){ render(); fail('Budget épuisé','Toutes les manœuvres autorisées sont utilisées et le train n’est pas conforme.',true); return true; }
  if(count) toast(msg||'Manœuvre effectuée.','info');
  render(); return true;
}
function shake(el){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
function starsFor(L){ if(L.type==='prono') return Math.max(1,3-wrongs); return moves<=L.par?3:moves<=L.par+1?2:1; }
function victory(){
  done=true; stopTimer(); const L=lvl(), st=starsFor(L);
  stars[cur]=Math.max(stars[cur]||0,st); save(); renderNet();
  toast('Tchou tchou ! Le train est conforme.','good');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(L.type!=='prono') $('yard').classList.add('leave');
  setTimeout(()=>{
    const last=cur===LEVELS.length-1, next=LEVELS[cur+1];
    const lineDone = !last && next.ch!==L.ch;
    const total=Object.values(stars).reduce((a,b)=>a+b,0);
    modal(`<h2 id="m-t">${last?'Réseau terminé&nbsp;!':lineDone?`Ligne ${L.ch+1} terminée&nbsp;!`:'Tchou tchou&nbsp;!'}</h2>
      <div class="stars" aria-label="${st} étoiles sur 3">${'★'.repeat(st)}${'☆'.repeat(3-st)}</div>
      <p>${L.type==='prono'?(wrongs?`Trouvé après ${wrongs} erreur${wrongs>1?'s':''}.`:'Du premier coup.'):`${moves} manœuvre${moves>1?'s':''}, objectif ${L.par}.`}${L.time?` Il restait ${fmt(tLeft)}.`:''}</p>
      ${lineDone?`<p class="small">Prochaine ligne&nbsp;: <b>${esc(CH[next.ch].nom)}</b>, avec de nouveaux outils.</p>`:''}
      ${last?`<p class="small">${total} étoiles sur ${LEVELS.length*3}.</p>`:''}
      <p class="small">Ce qu’il fallait retenir&nbsp;:</p><div class="learn">${esc(L.learn)}</div>
      <div class="row">${st<3?'<button class="btn quiet" type="button" id="m-retry">Viser 3 étoiles</button>':''}<button class="btn" type="button" id="m-next">${last?'Revoir le réseau':'Station suivante'}</button></div>`,
      {next:()=>load(last?0:cur+1), retry:()=>load(cur)});
  }, reduce||L.type==='prono'?300:1500);
}
function fail(title,txt,canUndo){
  done=true; stopTimer();
  modal(`<h2 class="ko" id="m-t">${esc(title)}</h2><p>${esc(txt)}</p>
    <div class="row">${canUndo&&hist.length?'<button class="btn quiet" type="button" id="m-undo">Annuler la dernière manœuvre</button>':''}<button class="btn quiet" type="button" id="m-hint">Voir l’indice</button><button class="btn" type="button" id="m-retry">Recommencer</button></div>`,
    {retry:()=>load(cur), undo:()=>{ done=false; undo(); }, hint:()=>{ load(cur); $('hint').hidden=false; }});
}
function modal(html,act){
  const w=$('win'); w.innerHTML=`<div class="card" role="dialog" aria-modal="true" aria-labelledby="m-t">${html}</div>`; w.hidden=false;
  const bind=(id,f)=>{ const b=$(id); if(b) b.onclick=()=>{ w.hidden=true; f(); }; };
  bind('m-next',act.next||(()=>{})); bind('m-retry',act.retry||(()=>{})); bind('m-undo',act.undo||(()=>{})); bind('m-hint',act.hint||(()=>{})); bind('m-go',act.go||(()=>{}));
  (w.querySelector('#m-next,#m-go,#m-retry')||w.querySelector('button')).focus();
}
function ready(){
  const L=lvl(); tLeft=L.time; renderChips();
  modal(`<h2 id="m-t">Départ dans ${L.time}&nbsp;s</h2><p>${L.brief}</p><p class="small">Le chrono démarre quand vous prenez le poste.</p><div class="row"><button class="btn" type="button" id="m-go">Prendre le poste</button></div>`,
    {go:()=>startTimer()});
}
function startTimer(){ stopTimer(); let last=performance.now(); timer=setInterval(()=>{ const n=performance.now(); tLeft-=(n-last)/1000; last=n; const c=$('clock'); if(c){ c.textContent='Départ dans '+fmt(tLeft); c.classList.toggle('hot',tLeft<=15); } if(tLeft<=0){ fail('Le train est parti sans vous','Le chrono est arrivé à zéro avant que le train soit conforme.',false); } },200); }
function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }
function undo(){ const h=hist.pop(); if(!h){ toast('Rien à annuler.','info'); return; } S=h.S; moves=h.moves; lines.push('<span class="o"># manœuvre annulée</span>'); sel=null; toast('Dernière manœuvre annulée.','info'); render(); if(lvl().time&&!timer&&tLeft>0) startTimer(); }

/* ---------- Pronostic ---------- */
let opts=[];
function renderProno(){
  const L=lvl();
  opts=[{cmds:L.cmds,ok:true},...L.wrong].map(o=>({...o})).sort(()=>Math.random()-.5);
  $('opts').innerHTML=opts.map((o,i)=>{ const s=build(L.start.concat(o.cmds),L.cargo);
    return `<button type="button" class="opt" data-opt="${i}"><span class="ol">Plateau ${'ABC'[i]}</span><div class="yard mini">${yardHTML(s,false)}</div><span class="why"></span></button>`; }).join('');
  $('prono-toast').textContent='';
}
$('opts').addEventListener('click',e=>{
  const b=e.target.closest('[data-opt]'); if(!b||done||b.disabled) return;
  const o=opts[+b.dataset.opt], L=lvl();
  if(o.ok){
    b.classList.add('yes'); done=true;
    $('prono-toast').textContent='Exact ! Regardez le plateau.'; $('prono-toast').className='toast good';
    const before=new Set(Object.keys(S.c)); L.cmds.forEach(c=>exec(S,c)); Object.keys(S.c).forEach(k=>{ if(!before.has(k)) newIds.add(k); });
    render(); setTimeout(()=>{ done=false; victory(); },1100);
  } else {
    wrongs++; b.classList.add('no'); b.disabled=true; b.querySelector('.why').textContent=o.why;
    $('prono-toast').textContent=`Raté. Il reste ${Math.max(1,3-wrongs)} étoile${3-wrongs>1?'s':''} à gagner.`; $('prono-toast').className='toast bad';
  }
});

/* ---------- Gestes ---------- */
function act(src,dst){
  if(done||src.from===dst) return;
  const w=S.c[src.id].label;
  if(tool==='rebase'){ if(src.from.startsWith('origin/')) return toast('Le quai distant ne se déplace pas : il se remplit avec push.','bad');
    run([`switch ${src.from}`,`rebase ${dst}`],`Rame ${src.from} raccrochée au bout de ${dst}.`,true); }
  else if(tool==='cherry') run([`switch ${dst}`,`cherry-pick ${w}`],`Voiture ${w} copiée sur ${dst}.`,true);
  else if(tool==='merge') run([`switch ${dst}`,`merge ${src.from}`],`${src.from} attelée à ${dst}.`,true);
}
function act1(src){
  if(done) return;
  if(src.from.startsWith('origin/')) return toast('Cette voiture est sur le quai distant : on n’y touche pas directement.','bad');
  const chain=fp(S,S.b[src.from]), k=chain.indexOf(src.id), w=S.c[src.id].label;
  if(tool==='souder'){
    if(k<1) return toast(k===0?'Touchez la première voiture de la série : il en faut au moins deux à souder.':'Cette voiture n’est pas sur cette voie.','bad');
    run([`switch ${src.from}`,`reset --soft HEAD~${k+1}`,'commit'],`${k+1} voitures soudées en une seule.`,true);
  } else if(tool==='revert') run([`switch ${src.from}`,`revert ${w}`],`Voiture inverse de ${w} accrochée.`,true);
}
let drag=null, ghost=null, clickGuard=0;
$('yard').addEventListener('pointerdown',e=>{
  const w=e.target.closest('.wagon'); if(!w||done||gesturesOff()||!tool) return;
  drag={id:w.dataset.id,from:w.dataset.from,x:e.clientX,y:e.clientY,moved:false,el:w};
});
document.addEventListener('pointermove',e=>{
  if(!drag||TOOLS[tool].k!=='drag') return;
  if(!drag.moved && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){
    drag.moved=true; ghost=document.createElement('div'); ghost.className='ghost'; ghost.innerHTML=drag.el.outerHTML; document.body.appendChild(ghost);
    ghost.firstElementChild.classList.remove('new','sel');
  }
  if(drag.moved){
    e.preventDefault(); ghost.style.left=e.clientX+'px'; ghost.style.top=e.clientY+'px';
    document.querySelectorAll('#yard .voie').forEach(v=>v.classList.remove('drop-ok'));
    const v=document.elementFromPoint(e.clientX,e.clientY)?.closest('#yard .voie[data-row]'); if(v&&v.dataset.row!==drag.from) v.classList.add('drop-ok');
  }
},{passive:false});
document.addEventListener('pointerup',e=>{
  if(!drag) return; const d=drag; drag=null; clickGuard=performance.now()+80;
  if(ghost){ ghost.remove(); ghost=null; }
  document.querySelectorAll('#yard .voie').forEach(v=>v.classList.remove('drop-ok'));
  if(TOOLS[tool].k==='tap'){ if(!d.moved) act1(d); return; }
  const v=document.elementFromPoint(e.clientX,e.clientY)?.closest('#yard .voie'); const row=v&&v.dataset.row;
  if(d.moved){
    if(row&&row!==d.from) act(d,row);
    else { toast(v&&v.classList.contains('remote')?'Le quai distant se remplit avec push.':'Déposez la voiture sur une autre voie.','info'); sel=null; render(); }
    return;
  }
  if(sel&&d.from!==sel.from&&!d.from.startsWith('origin/')){ act(sel,d.from); return; }
  sel=(sel&&sel.id===d.id)?null:{id:d.id,from:d.from};
  toast(sel?`Voiture ${S.c[d.id].label} choisie. Touchez maintenant la voie de destination.`:'','info'); render();
});
document.addEventListener('pointercancel',()=>{ drag=null; if(ghost){ ghost.remove(); ghost=null; } });
$('yard').addEventListener('click',e=>{
  const sw=e.target.closest('[data-sw]');
  if(sw){ if(lvl().type==='prono'||done) return; if(sel&&sw.dataset.sw!==sel.from&&!gesturesOff()){ act(sel,sw.dataset.sw); return; }
    if(gesturesOff()&&lvl().keyboard){ toast('Gestes hors service : tapez switch '+sw.dataset.sw+'.','bad'); return; }
    run([`switch ${sw.dataset.sw}`],`Motrice sur ${sw.dataset.sw}.`); return; }
  if(performance.now()<clickGuard) return;
  const v=e.target.closest('.voie[data-row]'); if(v&&sel&&v.dataset.row!==sel.from) act(sel,v.dataset.row);
});
$('casse').addEventListener('click',e=>{
  const b=e.target.closest('[data-orphan]'); if(!b||done) return; const L=lvl();
  if(!toolsOf(L).includes('recover')) return toast('Récupérer une voiture de la voie de garage s’apprend sur la ligne 5.','info');
  if(gesturesOff()&&L.keyboard) return toast('Gestes hors service : utilisez reset --hard.','bad');
  run([`reset --hard ${S.c[b.dataset.orphan].label}`],`Voie ${S.head} ramenée jusqu’à la voiture ${S.c[b.dataset.orphan].label}.`,true);
});

/* ---------- Boutons, terminal ---------- */
$('tools').addEventListener('click',e=>{ const b=e.target.closest('[data-tool]'); if(!b) return; tool=b.dataset.tool; sel=null; render(); });
$('buttons').addEventListener('click',e=>{
  const b=e.target.closest('[data-btn]'); if(!b||done) return; const k=b.dataset.btn;
  if(k==='commit') run(['commit'],'Voiture accrochée.');
  else if(k==='branch'){ const n=['feature','fix','release','hotfix'].find(x=>!(x in S.b)); run([`switch -c ${n}`],`Voie ${n} posée, la motrice y passe.`); }
  else if(k==='push') run(['push'],'Le train part vers origin !');
  else if(k==='pull') run(['pull'],'Travail du quai distant récupéré.');
  else if(k==='pullr') run(['pull --rebase'],'Votre voie est raccrochée derrière origin.');
});
$('b-undo').onclick=()=>{ if(!done) undo(); };
$('b-reset').onclick=()=>load(cur);
$('b-hint').onclick=()=>{ $('hint').hidden=!$('hint').hidden; };
$('expert').onchange=()=>{ sel=null; render(); toast($('expert').checked?'Mode clavier : tapez les commandes dans le terminal.':'Les gestes sont de retour.','info'); if($('expert').checked) $('cmd').focus(); };
$('net').addEventListener('click',e=>{ const b=e.target.closest('[data-lv]'); if(b&&!b.disabled) load(+b.dataset.lv); });
$('unlock').onchange=()=>{ unlockAll=$('unlock').checked; save(); renderNet(); };
$('cli').addEventListener('submit',e=>{ e.preventDefault(); const v=$('cmd').value.trim(); if(!v||done) return; cmdHist.push(v); cmdPos=cmdHist.length; $('cmd').value=''; run([v.replace(/^git\s+/,'')]); });
$('cmd').addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'&&cmdPos>0){ e.preventDefault(); $('cmd').value=cmdHist[--cmdPos]; }
  else if(e.key==='ArrowDown'){ e.preventDefault(); cmdPos=Math.min(cmdHist.length,cmdPos+1); $('cmd').value=cmdHist[cmdPos]||''; }
});
$('cli-help').addEventListener('click',e=>{ const c=e.target.closest('code'); if(c){ $('cmd').value=c.textContent; $('cmd').focus(); } });

$('hero-art').innerHTML=yardHTML(build(['commit','commit','switch -c feature','commit','commit','switch main','commit','switch feature','rebase main']),false,true);
load(cur);
}

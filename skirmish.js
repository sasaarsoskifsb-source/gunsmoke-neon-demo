/* AR Skirmish: your hero plays a rulebook match on the projected board.
   Moves, attacks, dodges, reactions, items, flag captures, match feed, HP and round results. */
(function(){
const {$,esc,toast}=GN;
const SQ=Math.sqrt(3),DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]],K=(q,r)=>q+','+r,MAXR=8;
const d6=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return 1+a[0]%6;},rollN=n=>Array.from({length:n},d6),hit=(v,t)=>v===6||(v!==1&&v>=t);
const pips=(a,t)=>a.map(v=>`<span class="pip ${t&&hit(v,t)?'h':''}">${v}</span>`).join('');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TC=['#32d6d0','#ff5d5b','#b7a6c2','#c6a15b'];
const BOTS=[{name:'Iron Jackal',cls:'brawler',w:'shotgun'},{name:'Dust Widow',cls:'sniper',w:'sniper'},{name:'Neon Kid',cls:'tech',w:'smg'},{name:'Copper Sentinel',cls:'brawler',w:'katana'},{name:'Rust Jack',cls:'gunslinger',w:'revolver'}];
/* ---------- state ---------- */
let M=null; // match
const ui={setup:$('#sk-setup'),play:$('#sk-play'),feed:$('#sk-feed'),units:$('#sk-units'),acts:$('#sk-acts'),prompt:$('#sk-prompt'),round:$('#sk-round'),banner:$('#sk-banner')};
/* ---------- weapon profiles (rulebook v1.2, chapter 8) ---------- */
function prof(u,d){
  const w=u.w,tal=u.tal||[],sniperCls=u.cls==='sniper';
  const P={
    revolver:()=>d>=1&&d<=6+(u.eyes?1:0)&&{n:'Revolver',dice:u.sprinted?(tal.includes('fan')?2:1):3,t:d<=4?4:5,dmg:1,fire:1},
    heavyrev:()=>d>=1&&d<=4+(u.eyes?1:0)&&{n:'Heavy Revolver',dice:u.sprinted?1:3,t:5,dmg:2,fire:1},
    shotgun:()=>!u.sprinted&&d>=1&&d<=3&&{n:'Shotgun',dice:3,t:d===3?5:4,dmg:d===1?2:1,fire:1,spread:d===1},
    smg:()=>!u.sprinted&&d>=1&&d<=4&&{n:'Viper SMG',dice:4,t:5,dmg:1,fire:1,suppress:1},
    sniper:()=>{const mx=(sniperCls?9:8)+(tal.includes('eagle')?2:0),aimed=!u.moved||(u.eyes&&u.steps<=1)||(sniperCls&&u.steps<=1);return !u.sprinted&&d>=4&&d<=mx&&{n:aimed?'Sniper, aimed':'Sniper',dice:2+(aimed&&tal.includes('steady')?1:0),t:aimed?3:4,dmg:2,fire:1};},
    emp:()=>{const aimed=!u.moved;return !u.sprinted&&d>=4&&d<=8&&{n:'EMP Rifle',dice:2,t:aimed?3:4,dmg:1,fire:1,emp:1};},
    katana:()=>d===1&&{n:'Katana',dice:2,t:3,dmg:2+(u.titan?1:0),fire:0},
    ekatana:()=>d===1&&{n:'Energy Katana',dice:2,t:3,dmg:2+(u.titan?1:0),fire:0},
    rocket:()=>!u.reload&&!u.sprinted&&d>=3&&d<=7&&{n:'Hellfire',dice:1,t:3,dmg:3,fire:1,blast:1}};
  const p=P[w]&&P[w]();if(p)return p;
  if(d===1&&(!u.sprinted||u.cls==='brawler'))return{n:'Strike',dice:u.titan?2:1,t:4,dmg:1+(u.titan?1:0),fire:0};
  return null;
}
/* ---------- board ---------- */
let G3=null; // three groups
function buildBoard(){
  const B=GN.ar.board(),cols=11,R=Math.min(B.w*.86/(cols*SQ),B.h*.86/(9*1.5+.5));
  const H=new Map();
  for(let r=-4;r<=4;r++)for(let q=-8;q<=8;q++){const x=R*SQ*(q+r/2),y=R*1.5*r;if(Math.abs(x)>B.w*.43||Math.abs(y)>B.h*.43)continue;H.set(K(q,r),{q,r,k:K(q,r),x,y});}
  const pick=(q,r)=>{let best=null,bd=1e9;for(const h of H.values()){const d=Math.hypot(h.q-q,h.r-r);if(d<bd){bd=d;best=h;}}return best;};
  const cps=[pick(0,0),pick(-4,-2),pick(4,2),pick(3,-3),pick(-3,3)].filter((h,i,a)=>h&&a.indexOf(h)===i);
  cps.forEach(h=>h.cp=true);
  const all=[...H.values()].filter(h=>!h.cp&&Math.abs(h.q+h.r/2)>1);
  for(let i=0;i<7&&all.length;i++){const h=all.splice(Math.floor(Math.random()*all.length),1)[0];h.crate=true;}
  for(let i=0;i<2&&all.length;i++){const h=all.splice(Math.floor(Math.random()*all.length),1)[0];h.supply=true;}
  return{R,H,cps:cps.map(h=>h.k)};
}
const dist=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
const T=u=>M.H.get(u.k),unitAt=k=>M.U.find(u=>u.k===k&&(u.st==='ok'||u.st==='down'));
const foes=u=>M.U.filter(o=>o!==u&&o.team!==u.team);
function reach(u,n){const seen=new Map([[u.k,0]]),q=[u.k];while(q.length){const k=q.shift(),c=seen.get(k);if(c>=n)continue;const h=M.H.get(k);
  for(const[dq,dr]of DIRS){const nk=K(h.q+dq,h.r+dr),nh=M.H.get(nk);if(!nh||seen.has(nk)||nh.crate||unitAt(nk))continue;seen.set(nk,c+1);q.push(nk);}}seen.delete(u.k);return seen;}
function cover(a,t){const th=T(t),ah=T(a);if(M.smoke.has(t.k))return{c:2,l:'smoke (heavy)'};
  for(const[dq,dr]of DIRS){const n=M.H.get(K(th.q+dq,th.r+dr));if(n&&n.crate&&dist(ah,n)<dist(ah,th))return{c:1,l:'light cover'};}return{c:0,l:'no cover'};}
/* ---------- 3D ---------- */
function hexShape(R){const s=new THREE.Shape();for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30),x=R*Math.cos(a),y=R*Math.sin(a);i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();return s;}
function build3D(){
  const paper=GN.ar.paper();if(G3)paper.remove(G3.root);
  const root=new THREE.Group();paper.add(root);const R=M.R;
  const pts=[];for(const h of M.H.values())for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30),b=Math.PI/180*(60*i+30);pts.push(new THREE.Vector3(h.x+R*Math.cos(a),h.y+R*Math.sin(a),.6),new THREE.Vector3(h.x+R*Math.cos(b),h.y+R*Math.sin(b),.6));}
  root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x32d6d0,transparent:true,opacity:.35})));
  const hexG=new THREE.ShapeGeometry(hexShape(R*.9));
  const mk=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false});
  const deco=new THREE.Group();root.add(deco);
  for(const h of M.H.values()){
    if(h.crate){const b=new THREE.Mesh(new THREE.BoxGeometry(R*.9,R*.9,R*.8),new THREE.MeshStandardMaterial({color:0x8a5a2b,roughness:.9}));b.position.set(h.x,h.y,R*.4);deco.add(b);}
    if(h.supply){const b=new THREE.Mesh(new THREE.BoxGeometry(R*.7,R*.7,R*.5),new THREE.MeshStandardMaterial({color:0x173a3d,emissive:0x32d6d0,emissiveIntensity:.6}));b.position.set(h.x,h.y,R*.25);b.userData.supply=h.k;deco.add(b);}
  }
  const flags={};for(const k of M.cps){const h=M.H.get(k);const g=new THREE.Group();g.position.set(h.x,h.y,0);
    const d=new THREE.Mesh(new THREE.CylinderGeometry(R*.45,R*.45,R*.15,4),new THREE.MeshStandardMaterial({color:0xc6a15b,emissive:0xc6a15b,emissiveIntensity:.5}));d.rotation.x=Math.PI/2;d.position.z=R*.1;g.add(d);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(R*.05,R*.05,R*2.2,8),new THREE.MeshStandardMaterial({color:0x8e7d90}));pole.rotation.x=Math.PI/2;pole.position.set(R*.35,0,R*1.1);g.add(pole);
    const cloth=new THREE.Mesh(new THREE.PlaneGeometry(R*.9,R*.55),new THREE.MeshBasicMaterial({color:0x9b8e9c,side:THREE.DoubleSide}));cloth.rotation.x=Math.PI/2;cloth.position.set(R*.82,0,R*1.9);g.add(cloth);g.userData.cloth=cloth;
    root.add(g);flags[k]=g;}
  const hl=new THREE.Group();root.add(hl);
  const toks={};
  for(const u of M.U){if(u.hero)continue;const g=new THREE.Group(),col=new THREE.Color(TC[u.team%4]);
    const body=new THREE.MeshStandardMaterial({color:col,roughness:.5,emissive:col,emissiveIntensity:.2});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(R*.62,R*.68,R*.15,24),new THREE.MeshStandardMaterial({color:0x241923}));base.rotation.x=Math.PI/2;base.position.z=R*.08;g.add(base);
    const b=new THREE.Mesh(new THREE.CylinderGeometry(R*.26,R*.36,R*1.5,16),body);b.rotation.x=Math.PI/2;b.position.z=R*.9;g.add(b);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(R*.26,16,12),body);hd.position.z=R*1.9;g.add(hd);
    root.add(g);toks[u.id]=g;}
  G3={root,hexG,mk,hl,flags,toks,deco};
}
function place(){
  for(const u of M.U){const h=T(u),dead=u.st==='dead'||u.st==='out';
    if(u.hero){const g=GN.ar.miniG();g.position.set(h.x,h.y,0);g.visible=!dead;g.rotation.x=u.st==='down'?0:0;continue;}
    const g=G3.toks[u.id];g.position.set(h.x,h.y,0);g.visible=!dead;g.rotation.y=u.st==='down'?Math.PI/2:0;}
  for(const k of M.cps){const o=M.flagOwner[k],c=o==null?0x9b8e9c:new THREE.Color(TC[M.U.find(u=>u.id===o).team%4]);G3.flags[k].userData.cloth.material.color.set(c);}
  G3.deco.children.forEach(m=>{if(m.userData.supply)m.visible=!M.used.has(m.userData.supply);});
  highlight();
}
function highlight(){const g=G3.hl;while(g.children.length)g.remove(g.children[0]);if(!M.sel)return;
  for(const[k,c]of M.sel){const h=M.H.get(k),m=new THREE.Mesh(G3.hexG,G3.mk(c,.45));m.position.set(h.x,h.y,.8);g.add(m);}
  for(const k of M.smoke){const h=M.H.get(k),m=new THREE.Mesh(G3.hexG,G3.mk(0xc3b4bd,.35));m.position.set(h.x,h.y,1);g.add(m);}}
/* ---------- feed, HP, results ---------- */
function feed(html,cls){const li=document.createElement('li');if(cls)li.className=cls;li.innerHTML=`<div class="sub" style="font-size:12px">${M.round?'Round '+M.round:'Setup'}</div>${html}`;ui.feed.prepend(li);while(ui.feed.children.length>60)ui.feed.lastChild.remove();}
function renderUnits(){
  ui.units.innerHTML=M.U.map(u=>{const fl=Object.values(M.flagOwner).filter(o=>o===u.id).length;
    return `<div class="sk-u ${M.cur===u?'cur':''} ${u.st!=='ok'?'out':''}"><div style="display:flex;justify-content:space-between;gap:6px"><b style="color:${TC[u.team%4]}">${esc(u.name)}${u.hero?' (you)':''}</b><span>${u.hp}/${u.max} HP</span></div>
    <div class="hp"><i style="width:${100*u.hp/u.max}%;background:${TC[u.team%4]}"></i></div>
    <div class="sub" style="font-size:12px">${GN.CLASSES[u.cls].n} · ${esc(u.wn)} · ${{ok:'in play',down:'DOWNED',dead:'executed',out:'extracted'}[u.st]} · reaction ${u.react?'ready':'used'} · flags ${fl} · score ${M.score[u.id]}</div></div>`;}).join('');
  ui.banner.hidden=false;ui.banner.innerHTML=M.over?'Match over':`Round ${M.round}/${MAXR} · ${M.cur?esc(M.cur.name)+(M.cur.hero?' — your turn':' acting'):''}`;
}
/* ---------- prompts (player decisions) ---------- */
function ask(html,buttons){return new Promise(res=>{ui.prompt.hidden=false;ui.prompt.innerHTML=`<div>${html}</div><div class="row">${buttons.map((b,i)=>`<button data-i="${i}" class="${b.cls||''}">${b.l}</button>`).join('')}</div>`;
  ui.prompt.onclick=e=>{const b=e.target.closest('[data-i]');if(!b)return;ui.prompt.hidden=true;ui.prompt.innerHTML='';ui.prompt.onclick=null;res(buttons[+b.dataset.i].v);};
  ui.prompt.scrollIntoView({block:'nearest',behavior:'smooth'});});}
async function rollFor(u,n,t,label){ // returns array of results (virtual) or synthetic (physical)
  if(!u.hero||M.dice==='virtual')return rollN(n);
  const k=await ask(`${label}: roll <b>${n}D6</b> with your real dice. How many show <b>${t}+</b>?`,Array.from({length:n+1},(_,i)=>({l:String(i),v:i})));
  return Array.from({length:n},(_,i)=>i<k?Math.max(t,2):1);
}
/* ---------- combat ---------- */
function damage(t,n,src,L){t.hp=Math.max(0,t.hp-n);if(src){src.dealt+=n;M.rd[src.id]=(M.rd[src.id]||0)+n;}
  if(t.hp===0&&t.st==='ok'){if(t.lastStand){t.lastStand=false;t.hp=1;L.push(`<b>${esc(t.name)}</b> refuses to fall (Last Stand): 1 HP.`);return;}t.st='down';t.downR=M.round;if(src)src.downs++;L.push(`<b style="color:var(--magl)">${esc(t.name)} is downed.</b>`);}}
async function attack(a,t){
  const d=dist(T(a),T(t)),p=prof(a,d),cv=cover(a,t),L=[`<b>${esc(a.name)}</b> → <b>${esc(t.name)}</b>: ${p.n}, ${d} hex, ${cv.l}`];
  // Fast Draw Counter (target is a gunslinger with a pistol, attacked from 1–4 hexes, or 1–6 with Quick Hands)
  if(t.cls==='gunslinger'&&t.react&&(t.w==='revolver'||t.w==='heavyrev')&&d<=((t.tal||[]).includes('quick')?6:4)&&t.st==='ok'){
    const use=t.hero?await ask(`<b>${esc(a.name)}</b> draws on you from ${d} hex${d>1?"es":""}. Use <b>Fast Draw Counter</b> and shoot first (2D6, hit 4+)?`,[{l:'Fast Draw!',v:1,cls:'b-gold'},{l:'No',v:0}]):1;
    if(use){t.react=false;const r=await rollFor(t,2,4,'Fast Draw');const h=r.filter(v=>hit(v,4)).length;L.push(`Fast Draw Counter: ${pips(r,4)} → ${h} hit${h===1?'':'s'}`);
      if(h){const dr=rollN(h).map(v=>v),thr=dr.filter(v=>!hit(v,5-cover(t,a).c)).length;L.push(`${esc(a.name)} dodges: ${pips(dr,5-cover(t,a).c)} → ${thr} through`);if(thr)damage(a,thr,t,L);}
      if(a.st!=='ok'){L.push(`${esc(a.name)} drops before firing.`);feed(L.join('<br>'));return;}}}
  let dice=await rollFor(a,p.dice,p.t,`${p.n} at ${esc(t.name)}`);
  if(a.cls==='gunslinger'&&/Revolver/.test(p.n)){const i=dice.findIndex(v=>!hit(v,p.t));if(i>=0&&M.dice==='virtual'){const o=dice[i];dice[i]=d6();L.push(`Dead Eye reroll: ${o} → ${dice[i]}`);}}
  if(a.hero&&a.aimR>0&&dice.some(v=>!hit(v,p.t))&&M.dice==='virtual'){
    const re=await ask(`Your roll: ${pips(dice,p.t)}. Spend an <b>Aim reroll</b> (${a.aimR} left) on one miss?`,[{l:'Reroll a miss',v:1,cls:'b-gold'},{l:'Keep',v:0}]);
    if(re){a.aimR--;const i=dice.findIndex(v=>!hit(v,p.t)),o=dice[i];dice[i]=d6();L.push(`Aim reroll: ${o} → ${dice[i]}`);}}
  let hits=dice.filter(v=>hit(v,p.t)).length;L.push(`Hit on ${p.t}+: ${pips(dice,p.t)} → <b>${hits}</b>`);
  if(p.blast){await blast(a,t,hits>0,L);a.reload=true;feed(L.join('<br>'));return;}
  if(hits)hits=await defend(a,t,hits,p,cv,L);
  if(hits){const dm=hits*p.dmg;L.push(`<b>${esc(t.name)} −${dm} HP</b>`);damage(t,dm,a,L);if(p.suppress)t.slow=1;if(p.emp){t.react=false;}}
  feed(L.join('<br>'));
}
async function blast(a,t,onTarget,L){const th=T(t),hit3=[t,...M.U.filter(u=>u!==t&&(u.st==='ok')&&dist(T(u),th)===1)];
  if(!onTarget){L.push('The rocket misses the target hex.');return;}
  for(const u of hit3){const main=u===t,dm=main?3:1;let h=1;h=await defend(a,u,1,{dmg:dm,fire:1},cover(a,u),L);if(h){L.push(`${esc(u.name)} −${dm} HP${main?'':' (blast)'}`);damage(u,dm,a,L);}}}
async function defend(a,t,hits,p,cv,L){
  // reactions first
  const R=[];if(t.react){if(t.cls==='brawler'||t.sub)R.push(['ricochet','Ricochet Shield (4+ cancels a hit)']);if(t.cls==='ghost'||t.decoy)R.push(['decoy','Holo-Decoy (first hit goes to a hologram)']);}
  if(t.plasma)R.push(['plasma','Plasma Shield (cancel 2 hits, once per mission)']);if(t.pack.includes('patch'))R.push(['patch','Armor Patch (ignore 1 damage)']);
  let choice=null;
  if(R.length){if(t.hero){choice=await ask(`<b>${esc(a.name)}</b> hits you <b>${hits}×</b> (${p.dmg} dmg each). React?`,R.map(([v,l])=>({l,v,cls:'b-out'})).concat([{l:'No reaction',v:null}]));}else choice=R[0][0];}
  if(choice==='ricochet'){t.react=false;const v=d6();if(hit(v,4)){hits--;L.push(`Ricochet Shield ${pips([v],4)}: one hit cancelled.`);}else L.push(`Ricochet Shield ${pips([v],4)} fails.`);}
  if(choice==='decoy'){t.react=false;hits--;L.push('Holo-Decoy takes the first hit.');}
  if(choice==='plasma'){t.plasma=false;const c=Math.min(2,hits);hits-=c;L.push(`Plasma Shield cancels ${c} hit${c>1?'s':''}.`);}
  if(choice==='patch'){t.pack.splice(t.pack.indexOf('patch'),1);t.patch=1;L.push('Armor Patch applied.');}
  if(hits<=0)return 0;
  const camo=t.camo&&cv.c>0?1:0,dt=Math.max(2,5-cv.c-camo-(t.shadow?1:0));
  let dr;
  if(t.hero){
    if(M.dice==='physical'){const k=await ask(`Dodge <b>${hits}</b> hit${hits>1?'s':''}: roll ${hits}D6${t.reflexDie?' (2 each, keep best: Cyber-Reflex)':''}. How many show <b>${dt}+</b>?`,Array.from({length:hits+1},(_,i)=>({l:String(i),v:i})));dr=Array.from({length:hits},(_,i)=>i<k?6:1);}
    else{await ask(`<b>${esc(a.name)}</b> lands <b>${hits}</b> hit${hits>1?'s':''} on you. Dodge on <b>${dt}+</b> (${cv.l}).`,[{l:'Roll dodge',v:1,cls:'b-gold'}]);
      dr=Array.from({length:hits},()=>t.reflexDie?Math.max(d6(),d6()):d6());
      if(t.dodgeR>0&&dr.some(v=>!hit(v,dt))){const re=await ask(`Dodge: ${pips(dr,dt)}. Spend a <b>Reflex reroll</b> (${t.dodgeR} left)?`,[{l:'Reroll a fail',v:1,cls:'b-gold'},{l:'Keep',v:0}]);
        if(re){t.dodgeR--;const i=dr.findIndex(v=>!hit(v,dt)),o=dr[i];dr[i]=d6();L.push(`Reflex reroll: ${o} → ${dr[i]}`);}}}}
  else dr=Array.from({length:hits},()=>t.reflexDie?Math.max(d6(),d6()):d6());
  let thr=dr.filter(v=>!hit(v,dt)).length,defl=dr.filter(v=>v===6).length;
  L.push(`${esc(t.name)} dodges on ${dt}+: ${pips(dr,dt)} → ${thr} through`);
  if(defl&&(t.w==='katana'||t.w==='ekatana')&&p.fire&&a.st==='ok'){L.push(`Katana deflects a bullet: ${esc(a.name)} −1 HP`);damage(a,1,t,L);}
  if(thr&&t.patch){t.patch=0;if(p.dmg<=1)thr--;L.push('Armor Patch absorbs 1 damage.');}
  return thr;
}
/* ---------- items & interactions ---------- */
const ITEM={nanoheal:'Nano Heal: +3 HP',stim:'Stim Shot: +2 movement',granate:'Granate: throw up to 3 hexes',smoke:'Smoke Grenade: heavy cover on 3 hexes',flash:'Flashbang: everyone within 1 hex of the target loses reaction',empnade:'EMP Grenade: cyberware within 1 hex of the target shuts down',knives:'Throwing Knife: 1D6, range 1–3',patch:'Armor Patch: kept for a reaction',spike:'Hack Spike: capture a flag from 1 hex'};
/* ---------- turns ---------- */
async function startRound(){
  M.round++;M.rd={};M.smoke.clear();
  if(M.round>MAXR){return end();}
  const live=M.U.filter(u=>u.st==='ok');live.forEach(u=>{u.init=d6()+Math.random()/10;u.react=true;});
  M.order=live.sort((a,b)=>b.init-a.init);
  feed(`<b>Round ${M.round}.</b> Initiative: ${M.order.map(u=>`${esc(u.name)} ${Math.floor(u.init)}`).join(' · ')}`);
  for(const u of M.order){if(M.over)return;if(u.st!=='ok')continue;M.cur=u;Object.assign(u,{moved:false,acted:false,sprinted:false,steps:0,bonusMv:0});renderUnits();renderActs();
    if(u.hero)await heroTurn(u);else{await sleep(500);await botTurn(u);await sleep(400);}
    u.slow=0;place();renderUnits();if(checkEnd())return;}
  roundResults();if(checkEnd())return;
  await sleep(300);return startRound();
}
function roundResults(){
  M.cps.forEach(k=>{const o=M.flagOwner[k];if(o!=null)M.score[o]++;});
  for(const u of M.U)if(u.st==='down'&&M.round>u.downR){u.st='out';feed(`${esc(u.name)} extracts from the board.`);}
  const h=M.U.find(u=>u.hero),rows=M.U.map(u=>`<tr><td style="color:${TC[u.team%4]}">${esc(u.name)}</td><td>${u.hp}/${u.max}</td><td>${M.rd[u.id]||0}</td><td>${Object.values(M.flagOwner).filter(o=>o===u.id).length}</td><td><b>${M.score[u.id]}</b></td></tr>`).join('');
  ui.round.hidden=false;ui.round.innerHTML=`<div class="cond" style="color:var(--gold)">Round ${M.round} results</div><table class="sk-t"><tr><th>Unit</th><th>HP</th><th>Dmg dealt</th><th>Flags</th><th>Score</th></tr>${rows}</table>`;
  feed(`<b style="color:var(--gold)">Round ${M.round} results:</b> flags score for their holders. You: ${M.score[h.id]} points, ${h.hp}/${h.max} HP, ${M.rd[h.id]||0} damage this round.`,'res');
  renderUnits();
}
function checkEnd(){const h=M.U.find(u=>u.hero);const others=M.U.filter(u=>!u.hero&&u.st==='ok');
  if(h.st==='dead'||h.st==='out'||(h.st==='down'&&!others.length)){end(false);return true;}
  if(!others.length&&!M.U.some(u=>!u.hero&&u.st==='down')){end(true);return true;}
  return false;}
function end(win){if(M.over)return;M.over=true;M.sel=null;highlight();
  const h=M.U.find(u=>u.hero);if(win===undefined){const best=Math.max(...M.U.map(u=>M.score[u.id]));win=M.score[h.id]===best&&h.st!=='dead';}
  const survived=h.st==='ok'||h.st==='down',flags=M.score[h.id]>0,xp=(survived?1:0)+(win?3:0)+(flags?2:0)+h.downs;
  const hero=GN.hero.active(),before=GN.hero.level(hero);hero.xp+=xp;GN.hero.save();GN.hero.refresh();const after=GN.hero.level(hero);
  feed(`<b style="color:var(--gold)">${win?'Victory':'Defeat'}.</b> XP: survived +${survived?1:0}, win +${win?3:0}, flags +${flags?2:0}, downs +${h.downs} = <b>+${xp} XP</b>${after>before?` · <b>Level ${after}!</b> Spend your points on the Hero screen.`:''}`,'res');
  renderUnits();renderActs();GN.modal(`<h2 id="md-t" class="disp" style="font-size:34px;color:var(--gold)">${win?'Victory':'Defeat'}</h2><p style="margin:0">${esc(h.name)} scored ${M.score[h.id]} points and dealt ${h.dealt} damage. <b>+${xp} XP</b>${after>before?` — level ${after}!`:''}</p><div class="g2"><a class="btn b-out" href="#hero" data-close>Hero</a><button class="b-gold" data-close>Close</button></div>`);
  if(GN.ar.onTap)GN.ar.onTap(null);
}
/* hero turn: wait for the player to finish */
let turnDone=null;
function heroTurn(u){return new Promise(res=>{turnDone=res;M.mode='move';selectMode();renderActs();});}
function finishTurn(){M.sel=null;M.mode=null;highlight();renderActs();const f=turnDone;turnDone=null;if(f)f();}
function mvAllow(u,sprint){return Math.max(1,u.mv+(u.bonusMv||0)-(u.slow?1:0))+(sprint?2:0);}
function selectMode(){const u=M.cur;if(!u||!u.hero){M.sel=null;highlight();return;}const S=new Map();
  if(M.mode==='move'&&!u.moved&&!u.acted)for(const k of reach(u,mvAllow(u,false)).keys())S.set(k,0x32d6d0);
  if(M.mode==='move'&&!u.moved&&u.acted)for(const k of reach(u,mvAllow(u,false)).keys())S.set(k,0x32d6d0);
  if(M.mode==='sprint'&&!u.moved&&!u.acted)for(const k of reach(u,mvAllow(u,true)).keys())S.set(k,0xc6a15b);
  if(M.mode==='attack'&&!u.acted)for(const t of foes(u))if(t.st==='ok'&&prof(u,dist(T(u),T(t))))S.set(t.k,0xff5d5b);
  if(M.mode==='exec'&&!u.acted)for(const t of foes(u))if(t.st==='down'&&dist(T(u),T(t))===1)S.set(t.k,0xff5d5b);
  if(M.mode&&M.mode.startsWith('throw:')&&!u.acted){const it=M.mode.slice(6),rng=it==='knives'?3:3;for(const h of M.H.values()){const dd=dist(T(u),h);if(dd>=(it==='knives'?1:0)&&dd<=rng&&(it!=='knives'||(unitAt(h.k)&&unitAt(h.k).team!==u.team&&unitAt(h.k).st==='ok')))S.set(h.k,0xff5d5b);}}
  M.sel=S;highlight();}
function renderActs(){
  const u=M&&M.cur;if(!M||M.over||!u||!u.hero){ui.acts.innerHTML=M&&M.over?'<button class="b-gold" id="sk-again">New match</button>':'<p class="sub" style="margin:0">Waiting for the other players…</p>';return;}
  const h=T(u),onFlag=M.cps.includes(u.k)&&M.flagOwner[u.k]!==u.id,nearSupply=[...M.H.values()].some(x=>x.supply&&!M.used.has(x.k)&&dist(h,x)<=1),downAdj=foes(u).some(t=>t.st==='down'&&dist(h,T(t))===1),canAtk=foes(u).some(t=>t.st==='ok'&&prof(u,dist(h,T(t))));
  const btn=(m,l,ok,cls)=>`<button data-m="${m}" class="${M.mode===m?'on-t':''} ${cls||''}" ${ok?'':'disabled'}>${l}</button>`;
  ui.acts.innerHTML=`<div class="sub" style="font-size:13px;margin-bottom:6px">${u.moved?'Moved':'Move '+mvAllow(u,false)+' hexes'} · ${u.acted?'action used':'1 action left'}${prof(u,0)===null&&u.w==='sniper'&&!u.moved?' · not moved: shots are aimed':''}</div>
   <div class="g3">${btn('move','Move',!u.moved)}${btn('sprint','Sprint',!u.moved&&!u.acted)}${btn('attack','Attack',!u.acted&&canAtk)}
   ${btn('item','Use item',!u.acted&&u.pack.length)}${btn('interact',onFlag?'Capture flag':nearSupply?'Open supply':'Interact',!u.acted&&(onFlag||nearSupply))}${btn('exec','Execute',!u.acted&&downAdj)}</div>
   <button class="b-gold" data-m="end" style="width:100%;margin-top:8px">End turn</button>`;
}
ui.acts.addEventListener('click',async e=>{
  if(e.target.closest('#sk-again')){startMatch();return;}
  const b=e.target.closest('[data-m]');if(!b||b.disabled||!M||!M.cur||!M.cur.hero)return;const u=M.cur,m=b.dataset.m;
  if(m==='end'){finishTurn();return;}
  if(m==='interact'){const h=T(u);
    if(M.cps.includes(u.k)&&M.flagOwner[u.k]!==u.id){M.flagOwner[u.k]=u.id;u.acted=true;feed(`<b>${esc(u.name)}</b> raises the flag at a control point.`);}
    else{const s=[...M.H.values()].find(x=>x.supply&&!M.used.has(x.k)&&dist(h,x)<=1);if(s){M.used.add(s.k);const it=['nanoheal','granate','smoke','stim','patch'][Math.floor(Math.random()*5)];u.pack.push(it);u.acted=true;feed(`<b>${esc(u.name)}</b> opens a supply crate: <b>${esc(ITEM[it].split(':')[0])}</b> added to the pack.`);}}
    place();renderUnits();autoEnd();return;}
  if(m==='item'){const it=await ask('Use which item from your pack?',u.pack.filter((x,i,a)=>a.indexOf(x)===i&&x!=='patch').map(x=>({l:ITEM[x],v:x,cls:'b-out'})).concat([{l:'Cancel',v:null}]));if(!it)return;
    if(it==='nanoheal'){u.pack.splice(u.pack.indexOf(it),1);const hv=Math.min(u.max-u.hp,3+((u.tal||[]).includes('patch')?2:0));u.hp+=hv;u.acted=true;feed(`<b>${esc(u.name)}</b> uses Nano Heal: +${hv} HP.`);}
    else if(it==='stim'){u.pack.splice(u.pack.indexOf(it),1);u.bonusMv=2;feed(`<b>${esc(u.name)}</b> injects a Stim Shot: +2 movement.`);if(!u.moved){M.mode='move';}}
    else if(it==='spike'){toast('Hack Spike: stand next to a flag and use Interact.');return;}
    else{M.mode='throw:'+it;selectMode();toast('Tap a highlighted hex to throw.');}
    renderUnits();renderActs();autoEnd();return;}
  M.mode=m;selectMode();renderActs();
  if(m==='attack')toast('Tap a highlighted enemy.');if(m==='exec')toast('Tap the downed enemy next to you.');
});
function autoEnd(){const u=M.cur;if(u&&u.hero&&u.moved&&u.acted){setTimeout(()=>{if(M.cur===u&&turnDone)finishTurn();},700);}else{M.mode=u&&!u.moved?'move':null;selectMode();renderActs();}}
async function onTap(p){
  if(!M||M.over)return false;const u=M.cur;if(!u||!u.hero||!M.sel)return true;
  let best=null,bd=1e9;for(const h of M.H.values()){const d=Math.hypot(h.x-p.x,h.y-p.y);if(d<bd){bd=d;best=h;}}
  if(!best||bd>M.R*1.2||!M.sel.has(best.k))return true;
  const mode=M.mode,k=best.k;M.sel=null;highlight();
  if(mode==='move'||mode==='sprint'){const steps=(mode==='sprint'?reach(u,mvAllow(u,true)):reach(u,mvAllow(u,false))).get(k);u.k=k;u.moved=true;u.steps=steps;
    if(mode==='sprint'){u.sprinted=true;if(!(u.cls==='brawler'||u.w==='revolver'||u.w==='heavyrev'))u.acted=true;}
    u.shadow=false;feed(`<b>${esc(u.name)}</b> ${mode==='sprint'?'sprints':'moves'} ${steps} hex${steps>1?'es':''}.`);place();renderUnits();autoEnd();return true;}
  if(mode==='attack'){const t=unitAt(k);u.acted=true;renderActs();await attack(u,t);place();renderUnits();if(!checkEnd())autoEnd();return true;}
  if(mode==='exec'){const t=unitAt(k);t.st='dead';u.acted=true;u.downs++;feed(`<b>${esc(u.name)}</b> executes <b>${esc(t.name)}</b>. Permadeath: 3 days.`);place();renderUnits();if(!checkEnd())autoEnd();return true;}
  if(mode&&mode.startsWith('throw:')){const it=mode.slice(6);u.pack.splice(u.pack.indexOf(it),1);u.acted=true;const L=[];
    if(it==='smoke'){M.smoke.add(k);const h=M.H.get(k);for(const[dq,dr]of DIRS){const n=K(h.q+dq,h.r+dr);if(M.H.has(n))M.smoke.add(n);}feed(`<b>${esc(u.name)}</b> throws smoke: heavy cover until the end of the round.`);}
    if(it==='flash'||it==='empnade'){const h=M.H.get(k),tg=M.U.filter(x=>x!==u&&x.st==='ok'&&dist(T(x),h)<=1);tg.forEach(t=>{t.react=false;if(it==='empnade'){t.reflexDie=false;t.plasma=false;t.decoy=false;t.sub=false;t.camo=false;}});feed(`<b>${esc(u.name)}</b> throws ${it==='flash'?'a Flashbang: '+(tg.length?tg.map(t=>esc(t.name)).join(', ')+' lose their reaction this round':'no one caught'):'an EMP Grenade: '+(tg.length?tg.map(t=>esc(t.name)).join(', ')+' lose reaction and cyberware':'no one caught')}.`);}
    if(it==='granate'){const h=M.H.get(k),tg=M.U.filter(x=>x.st==='ok'&&dist(T(x),h)<=1);L.push(`<b>${esc(u.name)}</b> throws a Granate.`);for(const x of tg){const v=d6();L.push(`${esc(x.name)}: ${pips([v],4)}${hit(v,4)?' −1 HP':''}`);if(hit(v,4))damage(x,1,u,L);}feed(L.join('<br>'));}
    if(it==='knives'){const t=unitAt(k);L.push(`<b>${esc(u.name)}</b> throws a knife at ${esc(t.name)}.`);const v=(await rollFor(u,1,4,'Throwing Knife'))[0];L.push(`${pips([v],4)}`);if(hit(v,4)){const th=await defend(u,t,1,{dmg:1,fire:0},cover(u,t),L);if(th){L.push(`${esc(t.name)} −1 HP`);damage(t,1,u,L);}}feed(L.join('<br>'));}
    place();renderUnits();if(!checkEnd())autoEnd();return true;}
  return true;
}
/* ---------- bots ---------- */
async function botTurn(u){
  const h=T(u),down=foes(u).find(t=>t.st==='down'&&dist(h,T(t))===1);
  if(down){down.st='dead';u.downs++;feed(`<b>${esc(u.name)}</b> executes <b>${esc(down.name)}</b>.`);place();return;}
  if(u.reload){u.reload=false;u.acted=true;feed(`${esc(u.name)} reloads the launcher.`);}
  const best=()=>{let b=null;for(const t of foes(u)){if(t.st!=='ok')continue;const p=prof(u,dist(T(u),T(t)));if(!p)continue;const v=p.dice*p.dmg*(7-p.t)+(t.hero?1.5:0)+(1-t.hp/t.max)*2;if(!b||v>b.v)b={t,v};}return b;};
  const want={sniper:5,emp:5,revolver:3,heavyrev:3,smg:3,shotgun:1,katana:1,ekatana:1,rocket:4}[u.w]||2;
  let shot=u.acted?null:best();
  const flagNear=M.cps.find(k=>M.flagOwner[k]!==u.id&&dist(h,M.H.get(k))<=mvAllow(u,false)&&!unitAt(k));
  if(!u.acted&&flagNear&&(!shot||Math.random()<.35)){u.k=flagNear;u.moved=true;M.flagOwner[flagNear]=u.id;u.acted=true;feed(`<b>${esc(u.name)}</b> runs to a control point and raises the flag.`);place();return;}
  if(!shot||dist(h,T(shot.t))>want+1){const R2=reach(u,mvAllow(u,false)),F=foes(u).filter(t=>t.st==='ok');let bk=u.k,bs=1e9;
    for(const[k,c]of R2){const x=M.H.get(k);let s=Math.abs(Math.min(...F.map(f=>dist(x,T(f))))-want)*2;s+=Math.min(...M.cps.map(cp=>dist(x,M.H.get(cp))))*.6;
      if(DIRS.some(([dq,dr])=>{const n=M.H.get(K(x.q+dq,x.r+dr));return n&&n.crate;}))s-=.8;s+=Math.random()*.6;if(s<bs){bs=s;bk=k;u.steps=c;}}
    if(bk!==u.k){u.k=bk;u.moved=true;feed(`${esc(u.name)} moves.`);place();await sleep(350);}
    if(!u.acted)shot=best();}
  if(shot&&!u.acted){u.acted=true;await attack(u,shot.t);}
}
/* ---------- setup ---------- */
function makeHero(){const h=GN.hero.active(),S=GN.hero.stats(h),g=h.gear||GN.gear.HG(),has=id=>g.cyber.includes(id);
  return{id:'me',hero:true,name:h.name,cls:h.cls,team:0,hp:S.hp,max:S.hp,mv:parseInt(S.mv,10),w:g.weapon,wn:(GN.gear.byId(g.weapon)||{n:'Unarmed'}).n,tal:h.talents.slice(),
    react:true,aimR:S.aim,dodgeR:S.reflex,reflexDie:has('cyberreflex'),sub:has('subdermal'),decoy:has('holodecoy'),plasma:has('plasma'),camo:has('camo'),eyes:has('cybereyes'),titan:has('titanium'),lastStand:h.talents.includes('stand'),
    pack:g.pack.slice(),st:'ok',dealt:0,downs:0};}
function makeBot(b,i,ffa){const C=GN.hero.CB[b.cls];return{id:'b'+i,name:b.name,cls:b.cls,team:ffa?i+1:1,hp:C.hp,max:C.hp,mv:C.mv,w:b.w,wn:GN.gear.byId(b.w).n,tal:[],react:true,aimR:0,dodgeR:0,reflexDie:b.cls==='gunslinger',sub:false,decoy:false,plasma:false,camo:false,pack:['nanoheal'],st:'ok',dealt:0,downs:0};}
function startMatch(){
  if(!GN.ar.ensure()){toast('3D is not available here.');return;}
  if(!GN.ar.hasPose())GN.ar.preview();
  const n=+$('#sk-n').value,ffa=$('#sk-mode').value==='ffa',dice=$('#sk-dice').value;
  const B=BOTS.slice().sort(()=>Math.random()-.5).slice(0,n);
  const bd=buildBoard();M={...bd,U:[makeHero(),...B.map((b,i)=>makeBot(b,i,ffa))],round:0,score:{},flagOwner:{},used:new Set(),smoke:new Set(),dice,over:false,cur:null,sel:null,mode:null,rd:{}};
  M.U.forEach(u=>M.score[u.id]=0);M.cps.forEach(k=>M.flagOwner[k]=null);
  const edge=[...M.H.values()].sort((a,b)=>a.x-b.x),left=edge.filter(h=>!h.crate&&!h.cp).slice(0,6),right=edge.filter(h=>!h.crate&&!h.cp).slice(-12);
  M.U[0].k=left[Math.floor(left.length/2)].k;M.U.slice(1).forEach((u,i)=>{u.k=right[(i*4+1)%right.length].k;});
  build3D();GN.ar.setHeight(Math.round(M.R*3.4));GN.ar.setModel(GN.hero.active().model);
  ui.setup.hidden=true;ui.play.hidden=false;ui.round.hidden=true;ui.feed.innerHTML='';
  feed(`<b>Skirmish on ${esc(GN.maps.get(GN.maps.selected()).n)}.</b> ${esc(M.U[0].name)} vs ${B.map(b=>esc(b.name)).join(', ')}${ffa?' (free-for-all)':''}. Hold the flags: every flag you hold scores 1 point at the end of a round. ${MAXR} rounds. Dice: ${dice==='virtual'?'virtual':'your real dice'}.`);
  GN.ar.onTap(p=>{onTap(p);return true;});
  place();renderUnits();startRound();
}
$('#sk-start').addEventListener('click',startMatch);
$('#sk-quit').addEventListener('click',()=>{if(!M)return;GN.modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Leave the match?</h2><p style="margin:0">The match ends without XP.</p><div class="g2"><button data-close>Stay</button><button class="b-gold" id="q-ok">Leave</button></div>`,(c,close)=>c.querySelector('#q-ok').addEventListener('click',()=>{close();M.over=true;if(turnDone){const f=turnDone;turnDone=null;f();}if(G3){GN.ar.paper().remove(G3.root);G3=null;}GN.ar.onTap(null);GN.ar.miniG().position.set(0,0,0);ui.setup.hidden=false;ui.play.hidden=true;ui.banner.hidden=true;ui.prompt.hidden=true;M=null;}));});
GN.skirmish={state:()=>M,tap:(x,y)=>onTap({x,y})};
})();

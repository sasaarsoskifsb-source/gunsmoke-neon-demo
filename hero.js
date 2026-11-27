/* Heroes: create a character, lock its class, build it through play (XP, levels, attributes, talents, specialization) */
(function(){
const {$,esc,toast,modal,store}=GN;
const ci=(k,s)=>GN.classIcon(k,s,false);
/* ---------- class book ---------- */
const CB={
 gunslinger:{role:'Mid-range duelist',hp:7,mv:3,nl:6,react:'Fast Draw Counter: when attacked from 1–4 hexes, shoot first with 2D6. If the attacker drops, their attack is cancelled.',
  passive:'Dead Eye: reroll one die on every pistol attack.',style:'Stays at 2–4 hexes, wins the first exchange and punishes anyone who rushes in.',
  plus:['Reliable damage at every range','Strong reaction that turns attacks around'],minus:['Low armour, 7 HP','Weak against heavy cover'],gear:'Revolver, Cyber-Reflex',
  A:{n:'Duelist',d:'Wins one-on-one fights.'},B:{n:'Outlaw',d:'Fights on the move and hunts bounties.'}},
 brawler:{role:'Front-line bruiser',hp:9,mv:3,nl:6,react:'Ricochet Shield: when hit, roll 1D6; on 4+ cancel that hit.',
  passive:'Charge: may sprint and still attack in melee. Breaks doors on 4+.',style:'Closes the distance through cover and holds control points.',
  plus:['Most HP, built-in armour','Strong melee and shotgun damage'],minus:['Slow to reach snipers','Few ranged options'],gear:'Katana, Subdermal Armor',
  A:{n:'Juggernaut',d:'Cannot be stopped or put down.'},B:{n:'Berserker',d:'Trades blood for damage.'}},
 tech:{role:'Hacker and support',hp:6,mv:3,nl:8,react:'EMP Shockwave: drones and cyberware within 2 hexes switch off until the end of the round; enemies there lose their reaction.',
  passive:'Hacker: +1 to hacking, hacks from 3 hexes. Neural Load 8 instead of 6.',style:'Turns the map against the enemy: doors, drones, terminals.',
  plus:['Most cyberware room','Controls drones and objectives'],minus:['Fragile, 6 HP','Needs terminals or drones to shine'],gear:'Viper SMG, Neural Prediction',
  A:{n:'Netrunner',d:'Hacks harder and from further away.'},B:{n:'Engineer',d:'Builds turrets and keeps allies alive.'}},
 ghost:{role:'Infiltrator',hp:6,mv:4,nl:6,react:'Holo-Decoy: the first hit of an attack goes to a hologram.',
  passive:'Shadow: ending a turn in cover without attacking gives +1 to dodge until you move.',style:'Moves fastest, strikes from cover and is never where the enemy aims.',
  plus:['Fastest class, movement 4','Very hard to hit in cover'],minus:['Low damage in the open','Punished when caught without cover'],gear:'Katana, Adaptive Camouflage',
  A:{n:'Shadow',d:'Unseen until it is too late.'},B:{n:'Trickster',d:'Decoys, smoke and misdirection.'}},
 sniper:{role:'Long-range marksman',hp:6,mv:3,nl:6,react:'Jet Boost Dash: when targeted, move 2 hexes before the roll; the attack resolves only if range and line of sight remain.',
  passive:'Steady Hand: aim still works after moving 1 hex. Sniper range 4–9.',style:'Holds a long lane from high ground and removes threats before they arrive.',
  plus:['Highest single-shot damage','Controls long sight lines'],minus:['Useless at 1–3 hexes','Low HP and slow'],gear:'Sniper Rifle, Cyber Eyes',
  A:{n:'Marksman',d:'Every shot counts.'},B:{n:'Recon',d:'Spots and controls the field for the team.'}}};
/* talents: [branch, tier, id, name, effect]; tier 1 from L2, tier 2 from L4, tier 3 needs the specialization (L5) and L6; legend at L10 */
const TL={
 gunslinger:[['A',1,'quick','Quick Hands','Fast Draw Counter also works at 5–6 hexes.'],['A',2,'noon','High Noon','Your first attack each mission rolls +1 die.'],['A',3,'duel','Last Man Standing','In a 1 v 1 situation (no other enemy within 6 hexes) your hits deal +1 damage.'],
  ['B',1,'fan','Fan the Hammer','Pistol attacks after a sprint roll 2D6 instead of 1D6.'],['B',2,'trick','Trick Shot','Your pistol hits ignore light cover.'],['B',3,'wanted','Wanted Dead','+1 attack die against targets with a bounty.'],
  ['L',4,'six','Six-Shooter','Once per mission, take two attack actions in one turn.']],
 brawler:[['A',1,'skin','Thick Skin','+2 maximum HP.'],['A',2,'unstop','Unstoppable','Ignore movement penalties from terrain and armour.'],['A',3,'stand','Last Stand','Once per mission, when you would be downed, stay at 1 HP.'],
  ['B',1,'haymaker','Haymaker','Melee natural 6s deal +1 damage.'],['B',2,'cleave','Cleave','A melee hit also deals 1 damage to another enemy next to you.'],['B',3,'blood','Bloodrush','Heal 1 HP whenever you down an enemy.'],
  ['L',4,'wreck','Wrecking Ball','Charge attacks roll +1 die and push the target 2 hexes.']],
 tech:[['A',1,'overclock','Overclock','+1 Neural Load.'],['A',2,'remote','Remote Hack','Hack from up to 5 hexes.'],['A',3,'puppet','Puppeteer','Drones you take over attack with 3D6.'],
  ['B',1,'patch','Patch Up','Your healing items restore +2 HP.'],['B',2,'shock','Shock Rounds','Targets you hit lose their reaction this round.'],['B',3,'turret','Turret Drop','Once per mission, place a turret: 2D6, range 1–4, fires at the end of each round.'],
  ['L',4,'machine','Ghost in the Machine','EMP Shockwave reaches 3 hexes and also shuts down enemy cyberware.']],
 ghost:[['A',1,'step','Silent Step','+1 movement when you start your turn in cover.'],['A',2,'backstab','Backstab','+1 attack die when attacking from heavy cover.'],['A',3,'vanish','Vanish','After attacking from cover, roll 1D6: on 4+ you keep Shadow.'],
  ['B',1,'smoke','Smoke Master','Pack 1 extra Smoke Grenade (pack limit 5). Your smoke covers 2 hexes around.'],['B',2,'twin','Twin Decoys','Holo-Decoy can be used twice per round, once per mission.'],['B',3,'swap','Misdirect','Once per round, swap places with your hologram (up to 3 hexes).'],
  ['L',4,'phantom','Phantom','Once per mission, you cannot be targeted until your next turn.']],
 sniper:[['A',1,'steady','Steady Aim','Aimed shots roll +1 die.'],['A',2,'head','Headshot','Natural 6s deal +1 damage.'],['A',3,'oneshot','One Shot','Once per mission, an attack cannot be dodged.'],
  ['B',1,'eagle','Eagle Eye','Sniper range +2.'],['B',2,'spot','Spotter','Action: mark a target in line of sight; allies get +1 to hit it this round.'],['B',3,'watch','Overwatch','Reaction: shoot an enemy that moves inside your range.'],
  ['L',4,'ghostrifle','Ghost Rifle','Aimed shots ignore cover.']]};
const XPT=[0,5,12,20,30,42,56,72,90,110];
const ATTR=[['grit','Grit','+1 maximum HP per point.'],['aim','Aim','Per point: once per mission, reroll one attack die.'],['reflex','Reflex','Per point: once per mission, reroll one dodge die.'],['tech','Tech','+1 Neural Load per point. At 3: +1 to hacking.']];
const AMAX=3;
/* ---------- heroes ---------- */
let H=store.get('heroes',null);
if(!H){H={active:'h1',list:[{id:'h1',name:'Pistolwhisker',model:'outlaw',cls:'gunslinger',xp:60,attrs:{grit:1,aim:2,reflex:2,tech:1},talents:['quick','noon','fan'],spec:'A',created:Date.now()}]};}
const saveH=()=>store.set('heroes',H);
let shown=false;
const active=()=>H.list.find(h=>h.id===H.active)||H.list[0];
const level=h=>{let l=1;XPT.forEach((t,i)=>{if(h.xp>=t)l=i+1;});return Math.min(10,l);};
const attrPts=h=>level(h)-1-Object.values(h.attrs).reduce((a,b)=>a+b,0);
const talentPts=h=>Math.floor(level(h)/2)-h.talents.length;
function stats(h){const c=CB[h.cls],t=h.talents,g=h.gear||{weapon:null,cyber:[],pack:[]},has=id=>g.cyber.includes(id),B=GN.gear?GN.gear.byId:()=>null;
  let mv=c.mv;if(has('jetboost'))mv++;if(!t.includes('unstop')){if(has('subdermal'))mv--;if(g.weapon==='rocket')mv--;}
  if(h.cls==='ghost'&&t.includes('step'))mv=mv+'*';
  const reacts=[c.react.split(':')[0]];if(has('subdermal')&&h.cls!=='brawler')reacts.push('Ricochet Shield');if(has('holodecoy')&&h.cls!=='ghost')reacts.push('Holo-Decoy');if(has('plasma'))reacts.push('Plasma Shield');if(has('feign'))reacts.push('Feign Death');
  const nlUsed=g.cyber.reduce((a,id)=>a+((B(id)||{}).load||0),0);
  return{hp:c.hp+h.attrs.grit+(t.includes('skin')?2:0),mv,nl:c.nl+h.attrs.tech+(t.includes('overclock')?1:0),nlUsed,aim:h.attrs.aim,reflex:h.attrs.reflex,hack:(h.cls==='tech'?1:0)+(h.attrs.tech>=3?1:0)+(GN.st.g&&GN.st.g.own.aicore?1:0),pack:4+(t.includes('smoke')?1:0),
    dodge:has('cyberreflex')?'5+ ×2':'5+',reacts,weapon:B(g.weapon)};}
function canTake(h,T){const L=level(h),[br,tier,id]=T;if(h.talents.includes(id)||talentPts(h)<1)return false;
  if(br==='L')return L>=10;
  if(tier===1)return L>=2;
  const prev=TL[h.cls].find(x=>x[0]===br&&x[1]===tier-1);if(!h.talents.includes(prev[2]))return false;
  if(tier===2)return L>=4;
  return L>=6&&h.spec===br;}
function why(h,T){const L=level(h),[br,tier]=T;if(br==='L')return 'Level 10';if(tier===1)return L<2?'Level 2':'';if(tier===2)return L<4?'Level 4':'Needs tier 1';return h.spec&&h.spec!==br?'Other specialization':L<5?'Specialize at level 5':L<6?'Level 6':'Needs tier 2';}
/* ---------- UI ---------- */
function render(){
  if(!active().gear&&GN.gear)GN.gear.HG();
  const h=active(),c=CB[h.cls],C=GN.CLASSES[h.cls],L=level(h),s=stats(h),nx=XPT[L]||null,pv=XPT[L-1];
  $('#hr-heroes').innerHTML=H.list.map(x=>`<button data-h="${esc(x.id)}" class="${x.id===h.id?'on-t':''}" aria-pressed="${x.id===h.id}">${ci(x.cls,20)} ${esc(x.name)} · ${level(x)}</button>`).join('')+'<button class="b-gold" data-new="1">+ New character</button>';
  $('#hr-top').innerHTML=`<div style="display:flex;gap:14px;align-items:center">${ci(h.cls,64)}<div style="flex:1"><div class="disp" style="font-size:34px;line-height:1.05">${esc(h.name)}</div>
    <div class="cond" style="color:${C.c};font-size:15px">${C.n} · Level ${L}${h.spec?' · '+c[h.spec].n:''} <span class="sub" style="text-transform:none;letter-spacing:0">· class locked</span></div></div></div>
    <div><div style="display:flex;justify-content:space-between;font-size:14px"><span class="cond">XP</span><span>${nx?`${h.xp} / ${nx} to level ${L+1}`:`${h.xp} · max level`}</span></div><div class="hp" style="height:8px"><i style="width:${nx?Math.min(100,100*(h.xp-pv)/(nx-pv)):100}%;background:linear-gradient(90deg,#71617c,#c6a15b)"></i></div></div>
    <div class="g3">${[['HP',s.hp],['Move',s.mv],['Dodge',s.dodge],['Neural Load',s.nlUsed+' / '+s.nl],['Aim rerolls',s.aim],['Dodge rerolls',s.reflex]].map(([a,b])=>`<div class="stat"><b>${b}</b><span class="sub" style="font-size:13px">${a}</span></div>`).join('')}</div>
    <div class="g2"><button class="b-out" id="hr-play">Play a match (demo)</button><button id="hr-respec">Respec · 20 cr</button></div>
    <button class="b-out" id="hr-del" style="min-height:38px">Delete this character</button>`;
  const g=h.gear||GN.gear.HG(),W=s.weapon,B=GN.gear.byId;
  $('#hr-equip').innerHTML=`<div class="vh" style="margin:0"><h2>Equipped</h2><a class="cond" href="#gear" style="font-size:14px">Change gear ›</a></div>
    ${W?`<div><div class="cond" style="font-size:13px;color:var(--mute)">${esc(W.wt)} weapon</div><b style="font-size:18px">${esc(W.n)}</b><table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:4px">${W.st.map(([a,b])=>`<tr><td class="sub" style="padding:2px 0;width:38%">${a}</td><td style="padding:2px 0;font-weight:600">${esc(b)}</td></tr>`).join('')}</table><p class="sub" style="margin:4px 0 0;font-size:13px">${esc(W.fx)}</p></div>`:'<p class="sub" style="margin:0">No weapon equipped.</p>'}
    <div class="mrule"><b>Implants</b><span>${g.cyber.length?g.cyber.map(id=>`${esc(B(id).n)} (load ${B(id).load})`).join(' · '):'None'} · Neural Load ${s.nlUsed}/${s.nl}</span></div>
    <div class="mrule"><b>Mission pack</b><span>${g.pack.length?g.pack.map(id=>esc(B(id).n)).join(', '):'Empty'} · ${g.pack.length}/${s.pack}</span></div>
    <div class="mrule"><b>Reactions</b><span>${s.reacts.map(esc).join(' · ')} · one per round</span></div>`;
  $('#hr-class').innerHTML=classCard(h.cls,true);
  const ap=attrPts(h);
  $('#hr-attr').innerHTML=`<div class="vh" style="margin:0"><h2>Attributes</h2><span class="cond" style="color:${ap?'var(--gold)':'var(--mute)'}">${ap} point${ap===1?'':'s'} to spend</span></div>
    ${ATTR.map(([k,n,d])=>`<div class="attr"><div style="flex:1"><b class="cond">${n}</b><div class="sub" style="font-size:13px">${d}</div></div><div class="pips">${[1,2,3].map(i=>`<i class="${h.attrs[k]>=i?'on':''}"></i>`).join('')}</div><button class="b-out" data-a="${k}" aria-label="Raise ${n}" ${ap>0&&h.attrs[k]<AMAX?'':'disabled'} style="min-width:44px;padding:0">+</button></div>`).join('')}
    <p class="sub" style="margin:0;font-size:13px">1 point per level, max ${AMAX} per attribute. You cannot max everything: choose your build.</p>`;
  const tp=talentPts(h),T=TL[h.cls];
  const node=t=>{const owned=h.talents.includes(t[2]),ok=canTake(h,t),w=owned?'':why(h,t);
    return `<button class="tal ${owned?'own':''}" data-t="${t[2]}" ${owned||ok?'':'aria-disabled="true"'}><span class="cond" style="font-size:12px;color:var(--mute)">${t[0]==='L'?'Legend':'Tier '+t[1]}</span><b>${esc(t[3])}</b><small>${esc(t[4])}</small>${owned?'<span class="tg" style="color:var(--teal)">Learned</span>':ok?'<span class="tg" style="color:var(--gold)">Learn · 1 point</span>':`<span class="tg">${w}</span>`}</button>`;};
  $('#hr-tree').innerHTML=`<div class="vh" style="margin:0"><h2>Talents</h2><span class="cond" style="color:${tp?'var(--gold)':'var(--mute)'}">${tp} point${tp===1?'':'s'}</span></div>
    <p class="sub" style="margin:0;font-size:13px">A talent point at levels 2, 4, 6, 8 and 10. At level 5 pick a specialization: only its tier 3 opens.</p>
    ${L>=5&&!h.spec?`<div class="g2">${['A','B'].map(b=>`<button class="b-gold" data-spec="${b}">Specialize: ${c[b].n}</button>`).join('')}</div>`:''}
    <div class="tree">${['A','B'].map(b=>`<div class="br ${h.spec===b?'sp':''}"><div class="cond" style="color:${C.c}">${c[b].n}${h.spec===b?' · your specialization':''}</div><div class="sub" style="font-size:13px;margin-bottom:6px">${c[b].d}</div>${T.filter(t=>t[0]===b).map(node).join('<div class="link"></div>')}</div>`).join('')}</div>
    ${node(T.find(t=>t[0]==='L'))}`;
  syncAll();
  if(shown&&GN.loSync)GN.loSync(h);
}
function classCard(k,full){const c=CB[k],C=GN.CLASSES[k];
  return `<div style="display:flex;gap:12px;align-items:center">${ci(k,44)}<div><div class="cond" style="font-size:13px;color:var(--mute)">Class</div><div class="disp" style="font-size:28px;line-height:1.05;color:${C.c}">${C.n}</div><div class="sub">${c.role}</div></div></div>
  <p style="margin:0">${c.style}</p>
  <div class="g3">${[['HP',c.hp],['Move',c.mv],['Neural Load',c.nl]].map(([a,b])=>`<div class="stat"><b>${b}</b><span class="sub" style="font-size:13px">${a}</span></div>`).join('')}</div>
  <div class="mrule"><b>Passive</b><span>${esc(c.passive)}</span></div><div class="mrule"><b>Reaction</b><span>${esc(c.react)}</span></div>
  <div class="mrule"><b>Strengths</b><span>${c.plus.map(esc).join(' · ')}</span></div><div class="mrule"><b>Weaknesses</b><span>${c.minus.map(esc).join(' · ')}</span></div>
  <div class="mrule"><b>Starts with</b><span>${esc(c.gear)}</span></div>${full?`<div class="mrule"><b>Paths</b><span>${c.A.n}: ${c.A.d} ${c.B.n}: ${c.B.d}</span></div>`:''}`;}
function syncAll(){
  if(!active().gear&&GN.gear&&GN.gear.HG)try{GN.gear.HG();}catch(e){}
  const h=active(),C=GN.CLASSES[h.cls],L=level(h),s=stats(h);
  const n=$('#me-name');if(n)n.textContent=h.name;const sb=$('#me-sub');if(sb)sb.textContent=`${C.n} · Lvl ${L} · Outlaws · League #38`;const hp=$('#me-hp');if(hp)hp.textContent=`HP ${s.hp}/${s.hp}`;
  if(store.get('char','outlaw')!==h.model&&GN.chars&&GN.chars.get(h.model)){store.set('char',h.model);if(GN.loChar)GN.loChar(h.model);}
  subs.forEach(f=>{try{f(h);}catch(e){}});
}
const subs=[];
$('#v-hero').addEventListener('click',e=>{const h=active();let b;
  if((b=e.target.closest('[data-h]'))){H.active=b.dataset.h;saveH();render();toast(`${active().name} is now your active character.`);return;}
  if(e.target.closest('[data-new]')){wizard();return;}
  if((b=e.target.closest('[data-a]'))&&!b.disabled){if(attrPts(h)>0&&h.attrs[b.dataset.a]<AMAX){h.attrs[b.dataset.a]++;saveH();render();}return;}
  if((b=e.target.closest('[data-spec]'))){const br=b.dataset.spec;modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Specialize as ${CB[h.cls][br].n}?</h2><p style="margin:0">${CB[h.cls][br].d} This choice is permanent unless you respec. It opens tier 3 of this path only.</p><div class="g2"><button data-close>Not yet</button><button class="b-gold" id="sp-ok">Specialize</button></div>`,(c,close)=>c.querySelector('#sp-ok').addEventListener('click',()=>{h.spec=br;saveH();close();render();toast(`Specialized: ${CB[h.cls][br].n}.`);}));return;}
  if((b=e.target.closest('[data-t]'))){const t=TL[h.cls].find(x=>x[2]===b.dataset.t);if(h.talents.includes(t[2]))return;if(!canTake(h,t)){toast(why(h,t)||'No talent points left.');return;}h.talents.push(t[2]);saveH();render();toast(`Learned ${t[3]}.`);return;}
  if(e.target.closest('#hr-play')){playMatch(h);return;}
  if(e.target.closest('#hr-respec')){if(!h.talents.length&&!Object.values(h.attrs).some(v=>v)){toast('Nothing to reset.');return;}
    modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Respec ${esc(h.name)}?</h2><p style="margin:0">All attribute and talent points and the specialization come back for 20 cr. Level, XP and class stay: the class is locked.</p><div class="g2"><button data-close>Cancel</button><button class="b-gold" id="rs-ok">Respec · 20 cr</button></div>`,(c,close)=>c.querySelector('#rs-ok').addEventListener('click',()=>{if(GN.st.cr<20){toast('Not enough credits.');return;}GN.addCr(-20);h.attrs={grit:0,aim:0,reflex:0,tech:0};h.talents=[];h.spec=null;saveH();close();render();toast('Points refunded. Build again.');}));return;}
  if(e.target.closest('#hr-del')){const last=H.list.length===1,others=H.list.filter(x=>x.id!==h.id&&x.model===h.model).length,M=GN.chars.get(h.model),canMini=M&&!others&&GN.chars.list().length>1;
    modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Delete ${esc(h.name)}?</h2>
      <p style="margin:0">The character is deleted for good: level ${level(h)}, ${h.xp} XP, attributes, talents, specialization and the gear it carries. This cannot be undone.</p>
      ${canMini?`<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="dl-mini" style="width:22px;height:22px;margin-top:2px;accent-color:#ff5d5b"><span>Also delete its 3D miniature <b>${esc(M.name)}</b>${M.builtin?' (built-in, can be restored from Manage miniatures)':' (your uploaded .glb file)'}</span></label>`:M?`<p class="sub" style="margin:0">The miniature ${esc(M.name)} stays: ${others?'another character uses it':'it is your only miniature'}.</p>`:''}
      ${last?'<p style="margin:0;color:var(--magl)">This is your only character. You will create a new one first; then this one is deleted.</p>':''}
      <label class="r" style="margin:0">Type the name to confirm<input id="dl-name" autocomplete="off" placeholder="${esc(h.name)}" style="flex:1;min-height:44px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--bone);padding:0 10px;font:inherit"></label>
      <div class="g2"><button data-close>Keep</button><button class="b-gold" id="dl-ok" disabled>Delete for good</button></div>`,(c,close)=>{
      const ok=c.querySelector('#dl-ok');c.querySelector('#dl-name').addEventListener('input',e=>{ok.disabled=e.target.value.trim()!==h.name;});
      ok.addEventListener('click',()=>{let mini=!!(c.querySelector('#dl-mini')&&c.querySelector('#dl-mini').checked);close();
        const finish=async()=>{H.list=H.list.filter(x=>x.id!==h.id);if(H.active===h.id||!H.list.some(x=>x.id===H.active))H.active=H.list[0].id;saveH();
          if(mini&&H.list.some(x=>x.model===h.model)){mini=false;toast('Miniature kept: the new character uses it.');}
          if(mini){try{await GN.chars.remove(h.model);}catch(err){mini=false;toast(err.message);}}
          render();toast(`${h.name} deleted${mini?' with its miniature':''}.`);};
        if(last){toast('Create your new character first.');wizard(finish);}else finish();});});}
});
function playMatch(h){
  const before=level(h),win=Math.random()<.55,obj=Math.random()<.5,downs=Math.floor(Math.random()*3);
  const xp=1+(win?3:0)+(obj?2:0)+downs;h.xp=Math.min(XPT[9]+40,h.xp+xp);saveH();
  const after=level(h);
  const lines=[`Survived: +1 XP`,win?'Victory: +3 XP':'Defeat: +0 XP',obj?'Objective: +2 XP':'',downs?`Enemies downed: +${downs} XP`:''].filter(Boolean);
  if(after>before){modal(`<h2 id="md-t" class="disp" style="color:var(--gold);font-size:34px">Level ${after}!</h2><p style="margin:0">${lines.join(' · ')}</p><p style="margin:0">+${after-before} attribute point${after-before>1?'s':''}${Math.floor(after/2)>Math.floor(before/2)?' · +1 talent point':''}${after>=5&&before<5?' · specialization unlocked':''}${after===10?' · Legend talent unlocked':''}</p><button class="b-gold" data-close>Build my character</button>`);}
  else toast(`${lines.join(' · ')} (total +${xp} XP)`);
  render();
}
/* ---------- creation wizard: miniature → class (locked) → name ---------- */
function wizard(onDone){
  const st={model:null,cls:null,name:''};let step=1;
  modal('<div id="wz"></div>',(c,close)=>{
    const draw=()=>{const w=c.querySelector('#wz');
      if(step===1)w.innerHTML=`<h2 id="md-t" class="cond" style="color:var(--gold)">New character · 1 of 3</h2><p class="sub" style="margin:0">Choose the miniature that plays this character.</p>
        <div class="col" style="gap:6px;max-height:46vh;overflow:auto">${GN.chars.list().map(m=>`<button data-m="${esc(m.id)}" class="${st.model===m.id?'on-t':''}" style="justify-content:flex-start">${esc(m.name)}${m.builtin?'':' ★'}</button>`).join('')}</div>
        <label class="btn filebtn b-out">Upload your own miniature (.glb)<input id="wz-up" type="file" accept=".glb,model/gltf-binary"></label><p class="sub" id="wz-err" style="margin:0;color:var(--magl)"></p>
        <div class="g2"><button data-close>Cancel</button><button class="b-gold" id="wz-next" ${st.model?'':'disabled'}>Next</button></div>`;
      if(step===2)w.innerHTML=`<h2 id="md-t" class="cond" style="color:var(--gold)">New character · 2 of 3</h2><p class="sub" style="margin:0">Pick a class. <b style="color:var(--magl)">It is locked for this character forever.</b></p>
        <div class="cls-row" style="grid-template-columns:repeat(5,minmax(0,1fr))">${Object.keys(CB).map(k=>`<button data-c="${k}" class="${st.cls===k?'on-t':''}" aria-pressed="${st.cls===k}">${ci(k,28)}<span>${GN.CLASSES[k].n}</span></button>`).join('')}</div>
        <div class="col" style="gap:6px;max-height:42vh;overflow:auto">${st.cls?classCard(st.cls,true):'<p class="sub" style="margin:0">Tap a class to read it.</p>'}</div>
        <div class="g2"><button id="wz-back">Back</button><button class="b-gold" id="wz-next" ${st.cls?'':'disabled'}>Next</button></div>`;
      if(step===3)w.innerHTML=`<h2 id="md-t" class="cond" style="color:var(--gold)">New character · 3 of 3</h2>
        <label class="r">Name <input id="wz-name" maxlength="24" value="${esc(st.name)}" style="flex:1;min-height:44px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--bone);padding:0 10px;font:inherit"></label>
        <div style="display:flex;gap:10px;align-items:center">${ci(st.cls,40)}<div><b>${GN.CLASSES[st.cls].n}</b><div class="sub">${esc(GN.chars.get(st.model)?GN.chars.get(st.model).name:'')} miniature · starts at level 1</div></div></div>
        <p style="margin:0;color:var(--magl)">Once created, the class cannot be changed. You can still respec attributes and talents.</p>
        <div class="g2"><button id="wz-back">Back</button><button class="b-gold" id="wz-ok">Create and lock class</button></div>`;
    };
    c.querySelector('#wz').addEventListener('click',e=>{let b;
      if(e.target.closest('[data-close]')){close();return;}
      if((b=e.target.closest('[data-m]'))){st.model=b.dataset.m;draw();}
      else if((b=e.target.closest('[data-c]'))){st.cls=b.dataset.c;draw();}
      else if(e.target.closest('#wz-next')){if(step===3)return;if(step===2&&!st.name)st.name='';step++;draw();}
      else if(e.target.closest('#wz-back')){step--;draw();}
      else if(e.target.closest('#wz-ok')){const nm=(c.querySelector('#wz-name').value||'').trim();if(!nm){toast('Give your character a name.');return;}
        const h={id:'h'+Date.now().toString(36),name:nm,model:st.model,cls:st.cls,xp:0,attrs:{grit:0,aim:0,reflex:0,tech:0},talents:[],spec:null,created:Date.now()};h.gear=GN.gear.startGear(st.cls);
        H.list.push(h);H.active=h.id;saveH();close();render();toast(`${nm} the ${GN.CLASSES[st.cls].n} is ready. Class locked.`);if(onDone)onDone();}
    });
    c.querySelector('#wz').addEventListener('input',e=>{if(e.target.id==='wz-name')st.name=e.target.value;});
    c.querySelector('#wz').addEventListener('change',async e=>{if(e.target.id!=='wz-up')return;const f=e.target.files[0];if(!f)return;
      try{const r=await GN.chars.add(f,f.name.replace(/\.glb$/i,'').replace(/[_-]+/g,' ').slice(0,32),'gunslinger');st.model=r.id;draw();toast('Miniature uploaded.');}catch(err){c.querySelector('#wz-err').textContent=err.message;}});
    draw();
  });
}
GN.hero={active,level,stats,on(f){subs.push(f);},list:()=>H.list,setActive(id){H.active=id;saveH();render();},CB,save:saveH,refresh(){if(shown)render();else syncAll();}};
GN.register('hero',{show(){shown=true;render();if(GN.loShow)GN.loShow();if(GN.loSync)GN.loSync(active());},hide(){shown=false;if(GN.loHide)GN.loHide();}});
syncAll();
})();

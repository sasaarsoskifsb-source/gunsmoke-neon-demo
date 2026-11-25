/* Gunsmoke & Neon app: shell, router, state, Home, Gear, Trophies */
var GN=(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem('gn-'+k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem('gn-'+k,JSON.stringify(v));}catch(e){}}};
const st=store.get('state',{cr:142,weapon:'revolver',up:['cyberreflex','jetboost',null],items:{knives:6,granate:3,nanoheal:2}});
const save=()=>store.set('state',st);
const views={};let current=null;
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2800);}
function modal(html,bind){const m=$('#modal'),c=$('#md-c');c.innerHTML=html;m.hidden=false;const close=()=>{m.hidden=true;c.innerHTML='';};
  c.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));if(bind)bind(c,close);const f=c.querySelector('button,select');if(f)f.focus();}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'){$('#modal').hidden=true;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#modal').hidden=true;});
function setCr(n){st.cr=n;save();$('#cr').textContent=n+' cr';$('#me-cr').textContent=n+' cr';}
function route(){
  const v=(location.hash||'#home').slice(1);const name=views[v]?v:'home';
  if(current===name)return;
  if(current&&views[current].hide)views[current].hide();
  $$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+name));
  $$('.nav a').forEach(a=>a.classList.toggle('cur',a.dataset.v===name||(name==='loadout'&&a.dataset.v==='gear')));
  current=name;window.scrollTo(0,0);if(views[name].show)views[name].show();
}
function register(name,v){views[name]=v||{};}

/* ---------- HOME ---------- */
const FEED=['Caravan job in Dryridge · New bounties posted','Neon Kid won a duel at the Saloon','Shadow Syndicate took The Plant','Black Market raid in Neon Mesa','Rust Jack returns from permadeath tomorrow'];
let fi=0;setInterval(()=>{fi=(fi+1)%FEED.length;$('#h-feed').textContent=FEED[fi];},5000);
$('#v-home').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='join')toast(`You're queued for “${b.dataset.m}”. The app will call you when the table is ready.`);
  if(a==='challenge')toast(`Challenge sent to ${b.dataset.p}.`);
  if(a==='hunters')modal(`<h2 id="md-t" class="cond">Who's hunting you</h2><div class="list"><div><span class="av" style="background:#3a2418;color:#e08a68">CS</span><div style="flex:1"><b>Copper Sentinel</b><div class="sub">Set the 45 cr bounty · 0.8 km</div></div></div><div><span class="av" style="background:#33121f;color:#f07ab0">DW</span><div style="flex:1"><b>Dust Widow</b><div class="sub">Sniper · tracking since yesterday</div></div></div><div><span class="av" style="background:#123536;color:#00E5D4">IJ</span><div style="flex:1"><b>Iron Jackal</b><div class="sub">Brawler · same league</div></div></div></div><button class="b-out" data-close>Close</button>`);
  if(a==='bounty')modal(`<h2 id="md-t" class="cond">Place a bounty</h2><p class="sub" style="margin:0">Paid from your credits. Minimum 3 cr. Paid out only on an Execution.</p>
    <label class="r">Target <select id="bt-who"><option>Copper Sentinel</option><option>Neon Kid</option><option>Dust Widow</option></select></label>
    <label class="r">Amount <span id="bt-v">10 cr</span><input id="bt-a" type="range" min="3" max="${Math.max(3,st.cr)}" value="${Math.min(10,st.cr)}"></label>
    <div class="g2"><button data-close>Cancel</button><button class="b-gold" id="bt-ok">Post bounty</button></div>`,(c,close)=>{
      const a=c.querySelector('#bt-a');a.addEventListener('input',()=>c.querySelector('#bt-v').textContent=a.value+' cr');
      c.querySelector('#bt-ok').addEventListener('click',()=>{const n=+a.value,who=c.querySelector('#bt-who').value;if(n>st.cr){toast('Not enough credits.');return;}setCr(st.cr-n);close();toast(`Bounty of ${n} cr posted on ${who}.`);});});
});
register('home');

/* ---------- GEAR ---------- */
const IC={gun:'<path d="M3 9h14l2-2h2v4h-4l-1 2h-3l-1 4H8l1-4H3z"/>',blade:'<path d="M5 19L18 6l1-3 2 2-3 1L5 19l-1 2-2-2z"/>',chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',flask:'<path d="M9 2h6M10 2v5l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V2"/>',shield:'<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>'};
const RC={common:'#a59f8e',rare:'#00E5D4',epic:'#f07ab0',legendary:'#F2B544'};
const ITEMS=[
 {id:'revolver',n:'Revolver',t:'weapon',r:'common',ic:'gun',s:'3D6 · range 1–6',d:'Hit on 4+ (5+ at 5–6 hexes), damage 1. Fires on the sprint with 1D6.',p:6,lo:['weapon','revolvers']},
 {id:'heavyrev',n:'Heavy Revolver',t:'weapon',r:'rare',ic:'gun',s:'3D6 · dmg 2',d:'Range 1–4, hit on 5+, damage 2. Planned weapon from the design notes.',p:14,lo:['weapon','revolvers']},
 {id:'shotgun',n:'Sawn-off Shotgun',t:'weapon',r:'rare',ic:'gun',s:'3D6 · range 1–3',d:'Hit on 4+ (5+ at 3 hexes). Damage 2 at 1 hex, else 1.',p:10,lo:['weapon','shotgun']},
 {id:'katana',n:'Katana',t:'weapon',r:'rare',ic:'blade',s:'2D6 · hit 3+',d:'Range 1, damage 2. Dodge a firearm hit on a 6 and the shooter takes 1.',p:10,lo:['back','katana']},
 {id:'ekatana',n:'Energy Katana',t:'weapon',r:'epic',ic:'blade',s:'Deflects on 5+',d:'Katana that deflects on a 5 or 6. Planned weapon.',p:20,lo:['back','katana']},
 {id:'sniper',n:'Sniper Rifle',t:'weapon',r:'rare',ic:'gun',s:'2D6 · range 4–8',d:'Damage 2. Aimed (no move this turn) hits on 3+.',p:12,lo:['back','rifle']},
 {id:'emp',n:'EMP Rifle',t:'weapon',r:'epic',ic:'gun',s:'Disables drones',d:'Hit drones and upgrades are off until the end of next round. Planned weapon.',p:18,lo:['back','rifle']},
 {id:'knives',n:'Throwing Knives',t:'weapon',r:'common',ic:'blade',s:'1D6 · range 1–3',d:'One knife per throw. Planned weapon.',p:2,lo:['weapon','knives']},
 {id:'granate',n:'Granate',t:'consumable',r:'rare',ic:'flask',s:'Blast 1 hex',d:'Thrown up to 3 hexes. Hits everyone on and next to the target hex.',p:4},
 {id:'cyberreflex',n:'Cyber-Reflex',t:'cyberware',r:'rare',ic:'chip',s:'Dodge 2D6',d:'Roll 2D6 to dodge, keep the better die.',p:10},
 {id:'jetboost',n:'Jet Boost',t:'cyberware',r:'epic',ic:'chip',s:'Move +1',d:'Movement +1 and sprint +1.',p:6,lo:['back','jetpack']},
 {id:'cybereyes',n:'Cyber Eyes',t:'cyberware',r:'rare',ic:'chip',s:'Aim after move',d:'Sniper can aim after moving 1 hex.',p:6,lo:['cyber','eye']},
 {id:'neural',n:'Neural Prediction',t:'cyberware',r:'epic',ic:'chip',s:'Reroll 1 die',d:'Once per round, reroll one of your dice.',p:14,lo:['cyber','spine']},
 {id:'nanoheal',n:'Nano Heal',t:'consumable',r:'common',ic:'flask',s:'+3 HP',d:'Action: heal 3 HP. Single use.',p:3},
 {id:'plasma',n:'Plasma Shield',t:'cyberware',r:'legendary',ic:'shield',s:'Cancel 2 hits',d:'Reaction, once per round: cancel up to 2 hits from one attack.',p:24,lo:['shoulder','shield']},
 {id:'camo',n:'Adaptive Camo',t:'cyberware',r:'epic',ic:'shield',s:'+1 dodge in cover',d:'Extra +1 to dodge while in cover.',p:12},
 {id:'aicore',n:'AI Core Shard',t:'loot',r:'legendary',ic:'chip',s:'Story loot',d:'Piece of the lost Corporation AI core. Wanted by two factions.',p:40}];
const byId=id=>ITEMS.find(i=>i.id===id);
let gFilter='all',gSel='plasma';
const CATS=[['all','All'],['weapon','Weapons'],['cyberware','Cyberware'],['consumable','Consumables'],['loot','Loot']];
function renderGear(){
  const sl=[['Weapon',st.weapon],['Upgrade 1',st.up[0]],['Upgrade 2',st.up[1]],['Upgrade 3',st.up[2]]];
  $('#g-slots').innerHTML=sl.map(([l,id])=>{const i=id&&byId(id);return `<div style="${i?'border-color:'+RC[i.r]:'border-style:dashed;color:var(--mute)'}"><div class="sub" style="font-size:12px">${l}</div><b style="font-size:14px">${i?esc(i.n):'Empty'}</b></div>`;}).join('');
  $('#g-chips').innerHTML=CATS.map(([k,l])=>`<button data-f="${k}" class="${gFilter===k?'on-t':''}" aria-pressed="${gFilter===k}">${l}${k==='all'?' '+ITEMS.length:''}</button>`).join('');
  $('#g-items').innerHTML=ITEMS.filter(i=>gFilter==='all'||i.t===gFilter).map(i=>{const q=st.items[i.id];const eq=st.weapon===i.id||st.up.includes(i.id);
    return `<button class="it r-${i.r} ${gSel===i.id?'sel':''}" data-i="${i.id}" aria-pressed="${gSel===i.id}" style="${gSel===i.id?'border-color:'+RC[i.r]:''}"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${RC[i.r]}" stroke-width="1.8" stroke-linejoin="round">${IC[i.ic]}</svg><b>${esc(i.n)}</b><small>${eq?'Equipped':esc(i.s)}</small>${q?`<span class="q">x${q}</span>`:''}</button>`;}).join('');
  const i=byId(gSel),eq=st.weapon===i.id||st.up.includes(i.id);
  let acts='';
  if(i.t==='weapon')acts=eq?'<button disabled>Equipped</button>':'<button class="b-gold" data-g="equip">Equip weapon</button>';
  else if(i.t==='cyberware')acts=eq?'<button class="b-out" data-g="unequip">Unequip</button>':'<button class="b-gold" data-g="equip">Equip to free slot</button>';
  else if(i.t==='consumable')acts=`<button class="b-gold" data-g="use" ${st.items[i.id]?'':'disabled'}>Use (${st.items[i.id]||0} left)</button>`;
  else acts='<button disabled>Quest item</button>';
  const sell=Math.round(i.p*.75);
  $('#g-detail').innerHTML=`<span class="rt ${i.r}">${i.r} · ${i.t}</span><h2 class="disp" style="font-size:32px;line-height:1.05;text-transform:none;letter-spacing:0">${esc(i.n)}</h2><div class="cond" style="color:var(--gold)">${esc(i.s)}</div><p style="margin:0;color:#d9cba8">${esc(i.d)}</p><div class="g2">${acts}<button class="b-out" data-g="sell" ${eq||i.t==='loot'?'disabled':''}>Sell · ${sell} cr</button></div>${i.lo?'<a class="cond" href="#loadout" style="font-size:14px">See it on the miniature ›</a>':''}`;
}
$('#g-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;gFilter=b.dataset.f;renderGear();});
$('#g-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;gSel=b.dataset.i;renderGear();});
$('#g-detail').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b||b.disabled)return;const i=byId(gSel),a=b.dataset.g;
  if(a==='equip'){if(i.t==='weapon'){st.weapon=i.id;toast(`${i.n} equipped.`);}else{const k=st.up.indexOf(null);if(k<0){toast('All 3 upgrade slots are full. Unequip one first.');return;}st.up[k]=i.id;toast(`${i.n} in upgrade slot ${k+1}.`);}
    if(i.lo&&GN.loadoutSet)GN.loadoutSet(i.lo[0],i.lo[1]);}
  if(a==='unequip'){st.up[st.up.indexOf(i.id)]=null;toast(`${i.n} unequipped.`);}
  if(a==='use'){st.items[i.id]--;toast(i.id==='nanoheal'?'Nano Heal used: +3 HP.':`${i.n} readied for your next mission.`);}
  if(a==='sell'){setCr(st.cr+Math.round(i.p*.75));toast(`Sold ${i.n}.`);if(st.items[i.id])st.items[i.id]--;}
  save();renderGear();});
register('gear',{show:renderGear});

/* ---------- TROPHIES ---------- */
const TR=[['First Blood','First Execution in a ranked match',1,'#B95632'],['Duelist','Win 10 duels',1,'#00E5D4'],['Bounty Hunter','Claim 5 bounties',1,'#F2B544'],['Survivor','Survive 3 missions with a bounty on you',1,'#D93B83'],
 ['Zone Warden','Hold a zone for 3 wars',.67,'2/3'],['Ghost Hand','Hack 20 terminals',.65,'13/20'],['Untouchable','Finish 5 matches at full HP',.2,'1/5'],['Orbital Pioneer','Win on the Orbital Station',0,'Expansion'],['Frontier Legend','Reach league top 10',0,'#38 now']];
function renderTrophies(){
  $('#t-count').textContent=TR.filter(t=>t[2]===1).length+' / '+TR.length;
  $('#t-stats').innerHTML=[['62%','Win rate'],['1.8','K/D'],['47','Matches'],['9','Bounties claimed'],['4','Bounties survived'],['#38','League']].map(([a,b])=>`<div class="stat"><b>${a}</b><span class="sub" style="font-size:13px">${b}</span></div>`).join('');
  $('#t-grid').innerHTML=TR.map(([n,d,p,c])=>p===1?`<div style="border-color:${c}"><svg role="img" aria-label="${n} medal" width="42" height="46" viewBox="0 0 40 44"><path d="M12 2h6l2 12-5 2zM22 2h6l-3 14-5-2z" fill="${c}" opacity=".6"/><circle cx="20" cy="28" r="13" fill="#111820" stroke="${c}" stroke-width="3"/><path d="M20 20l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="${c}"/></svg><b class="cond" style="font-size:15px;letter-spacing:.02em;text-transform:none">${n}</b><span class="sub" style="font-size:12px;line-height:1.2">${d}</span></div>`
   :`<div class="lock"><svg role="img" aria-label="${n} medal, not earned" width="42" height="46" viewBox="0 0 40 44"><circle cx="20" cy="28" r="13" fill="none" stroke="#4a5868" stroke-width="3" stroke-dasharray="4 3"/><path d="M15 27v-3a5 5 0 0 1 10 0v3M14 27h12v8H14z" fill="none" stroke="#7b8796" stroke-width="2"/></svg><b class="cond" style="font-size:15px;letter-spacing:.02em;text-transform:none;color:var(--mute)">${n}</b><span class="sub" style="font-size:12px;line-height:1.2">${d}</span>${p?`<div class="hp" style="width:100%"><i style="width:${p*100}%;background:var(--teal)"></i></div>`:''}<span class="sub" style="font-size:12px">${c}</span></div>`).join('');
}
register('trophies',{show:renderTrophies});

function start(){setCr(st.cr);window.addEventListener('hashchange',route);route();}
return {$,$$,esc,toast,modal,register,start,store,st,save,views};
})();

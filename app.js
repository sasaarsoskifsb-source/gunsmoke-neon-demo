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
  let v=(location.hash||'#home').slice(1);if(v==='loadout')v='hero';const name=views[v]?v:'home';
  if(current===name)return;
  if(current&&views[current].hide)views[current].hide();
  $$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+name));
  $$('.nav a').forEach(a=>a.classList.toggle('cur',a.dataset.v===name||false));
  current=name;window.scrollTo(0,0);if(views[name].show)views[name].show();
}
function register(name,v){views[name]=v||{};}

/* ---------- HOME ---------- */
const FEED=['Caravan job in Dryridge · New bounties posted','Neon Kid won a duel at the Saloon','Shadow Syndicate took The Plant','Black Market raid in Neon Mesa','Rust Jack returns from permadeath tomorrow'];
let fi=0;setInterval(()=>{fi=(fi+1)%FEED.length;$('#h-feed').textContent=FEED[fi];},5000);
$('#v-home').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='join'){if(b.dataset.map&&b.dataset.map!=='orbital'&&GN.maps)GN.maps.select(b.dataset.map,true);toast(`You're queued for “${b.dataset.m}”${b.dataset.map&&b.dataset.map!=='orbital'?' on '+GN.maps.get(b.dataset.map).n:''}. The app will call you when the table is ready.`);}
  if(a==='challenge')toast(`Challenge sent to ${b.dataset.p}.`);
  if(a==='hunters')modal(`<h2 id="md-t" class="cond">Who's hunting you</h2><div class="list"><div><span class="av" style="background:#3a2c40;color:#b7a6c2">CS</span><div style="flex:1"><b>Copper Sentinel</b><div class="sub">Set the 45 cr bounty · 0.8 km</div></div></div><div><span class="av" style="background:#3e1c22;color:#ff8f8d">DW</span><div style="flex:1"><b>Dust Widow</b><div class="sub">Sniper · tracking since yesterday</div></div></div><div><span class="av" style="background:#1a3b3d;color:#32d6d0">IJ</span><div style="flex:1"><b>Iron Jackal</b><div class="sub">Brawler · same league</div></div></div></div><button class="b-out" data-close>Close</button>`);
  if(a==='bounty')modal(`<h2 id="md-t" class="cond">Place a bounty</h2><p class="sub" style="margin:0">Paid from your credits. Minimum 3 cr. Paid out only on an Execution.</p>
    <label class="r">Target <select id="bt-who"><option>Copper Sentinel</option><option>Neon Kid</option><option>Dust Widow</option></select></label>
    <label class="r">Amount <span id="bt-v">10 cr</span><input id="bt-a" type="range" min="3" max="${Math.max(3,st.cr)}" value="${Math.min(10,st.cr)}"></label>
    <div class="g2"><button data-close>Cancel</button><button class="b-gold" id="bt-ok">Post bounty</button></div>`,(c,close)=>{
      const a=c.querySelector('#bt-a');a.addEventListener('input',()=>c.querySelector('#bt-v').textContent=a.value+' cr');
      c.querySelector('#bt-ok').addEventListener('click',()=>{const n=+a.value,who=c.querySelector('#bt-who').value;if(n>st.cr){toast('Not enough credits.');return;}setCr(st.cr-n);close();toast(`Bounty of ${n} cr posted on ${who}.`);});});
});

/* ---------- MISSION GENERATOR (v1.2 tables: type, zone, twist, stakes) ---------- */
const T_TYPE=[['Bounty Hunt','PvP','8 rounds','3–6 players','Hunt in'],['Duel','1 v 1','6 rounds','2 players','Showdown at'],['Sabotage','Free-for-all','10 rounds','3–6 players','Sabotage at'],['Ambush','PvP','6 rounds','3–6 players','Ambush near'],['Zone War','Teams','8 rounds','4–6 players','War for'],['Covert Op','Teams, hidden objective','8 rounds','4–6 players','Covert job at']];
const zoneFor=r=>{const M=GN.maps;if(r<=4){const m=M.list[r-1];return{id:m.id,n:m.n,spots:m.spots,z:m.zone};}if(r===5){const m=M.get(M.selected());return{id:m.id,n:m.n,spots:m.spots,z:m.zone,pick:1};}return{id:'orbital',n:'Orbital Station',spots:['the Cryo Lab','the Reactor','the Docking Bridge'],z:'Expansion'};};
const T_TWIST=[['Sandstorm','Ranged attacks beyond 4 hexes are 1 harder to hit.'],['Blackout','Line of sight reaches 5 hexes at most.'],['Drone Patrol','2 drones hunt whoever has the biggest bounty.'],['Black Market Open','Buy one item mid-mission at +2 cr.'],['Double Bounty','Bounty payouts are doubled.'],['Faction Reinforcements','The controlling faction puts a guard on each objective.']];
const d6=()=>1+Math.floor(Math.random()*6);
const pip=(v,c)=>`<span class="pip" style="${c?'background:'+c+';color:#241923':''}">${v}</span>`;
function genMission(){
  const r1=d6();let r2=d6();const zoneRolls=[r2];
  const hasKey=st.g&&st.g.own&&st.g.own.keycard;
  while(r2===6&&!hasKey){r2=d6();zoneRolls.push(r2);}
  const r3=d6(),s1=d6(),s2=d6(),ty=T_TYPE[r1-1],zn=zoneFor(r2),loc=zn.spots[Math.floor(Math.random()*3)],tw=T_TWIST[r3-1];
  let cr=5+s1+s2,loot=s1+s2===12?'Legendary loot drop':s1===s2?'Rare loot drop':'';
  const enemyZone=zn.id==='neonmesa'||zn.id==='theplant';if(enemyZone)cr+=2;
  const target=r1===1?'You carry a 45 cr bounty: you are a likely target.':'';
  const id='m'+Date.now();
  const html=`<div class="gen" id="${id}"><div style="display:flex;justify-content:space-between;gap:8px"><span class="cond" style="font-size:13px;color:var(--gold)">GENERATED · ${ty[0].toUpperCase()} · ${ty[1].toUpperCase()}</span><b style="color:var(--gold);white-space:nowrap">+${cr} cr</b></div>
    <b style="font-size:17px">${ty[4]} ${loc}</b>
    <span class="sub">Map: <b style="color:var(--bone)">${zn.n}</b>${zn.pick?' (your pick)':''} · ${ty[2]} · ${ty[3]}${enemyZone?' · Corporation-held +2 cr':''}</span>
    <span><b style="color:var(--magl)">${tw[0]}:</b> ${tw[1]}</span>
    ${loot?`<span style="color:var(--teal)">${loot} for the winner.</span>`:''}${target?`<span class="sub" style="color:var(--magl)">${target}</span>`:''}
    <div class="rolls"><span>Type ${pip(r1)}</span><span>Zone ${zoneRolls.map(v=>pip(v)).join('')}</span><span>Twist ${pip(r3)}</span><span>Stakes ${pip(s1)}${pip(s2)}</span></div>
    ${zoneRolls.length>1?'<span class="sub" style="font-size:12px">Orbital Station rerolled: needs the Orbital Keycard or the expansion.</span>':''}
    <div class="g2"><button class="b-gold" data-act="join" data-m="${ty[4]} ${loc}" data-map="${zn.id}">Join</button><button class="b-out" data-act="dismiss" data-id="${id}">Dismiss</button></div></div>`;
  $('#h-gen').insertAdjacentHTML('afterbegin',html);
  while($('#h-gen').children.length>3)$('#h-gen').lastElementChild.remove();
}
$('#h-genbtn').addEventListener('click',genMission);
$('#h-gen').addEventListener('click',e=>{const b=e.target.closest('[data-act="dismiss"]');if(b){const el=document.getElementById(b.dataset.id);if(el)el.remove();}});

/* ---------- ALLIANCES ---------- */
if(!st.al)st.al={pacts:[{who:'Neon Kid',type:'Blood pact',left:2,split:'50 / 50'}],traitor:0};
const PLAYERS=[['Neon Kid','Tech-Slinger'],['Dust Widow','Sniper'],['Iron Jackal','Brawler'],['Copper Sentinel','Brawler']];
function renderAl(){
  const A=st.al;
  $('#h-al').innerHTML=`<div class="vh" style="margin:0"><h2>Alliances</h2><button class="b-out" data-al="new" style="min-height:40px">Propose pact</button></div>
   ${A.traitor?`<div class="sub" style="color:var(--magl)">Traitor mark: −100 reputation and an automatic 5 cr bounty for 3 days.</div>`:''}
   ${A.pacts.length?A.pacts.map((p,k)=>`<div class="pact"><span class="av" style="background:#1a3b3d;color:var(--teal)">${esc(p.who.split(' ').map(w=>w[0]).join(''))}</span><div style="flex:1"><b>${esc(p.who)}</b><div class="sub">${esc(p.type)}${p.pending?' · waiting for an answer':p.type==='Blood pact'?` · ${p.left} missions left`:' · this mission'} · split ${esc(p.split)}</div></div>${p.pending?'':`<button class="b-gold" data-al="break" data-k="${k}" style="min-height:40px">Break</button>`}</div>`).join(''):'<p class="sub" style="margin:0">No pacts yet. Allies cannot attack each other and share control points.</p>'}
   <p class="sub" style="margin:0;font-size:13px">Back to back: +1 to dodge next to an ally. Max alliance size is half the players. No pacts in Duels.</p>`;
}
$('#h-al').addEventListener('click',e=>{const b=e.target.closest('[data-al]');if(!b)return;const A=st.al;
  if(b.dataset.al==='new')modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Propose a pact</h2>
    <label class="r">Partner <select id="pa-who">${PLAYERS.filter(p=>!A.pacts.some(x=>x.who===p[0])).map(p=>`<option>${p[0]}</option>`).join('')}</select></label>
    <label class="r">Type <select id="pa-type"><option>Mission pact</option><option>Blood pact</option></select></label>
    <p class="sub" style="margin:0">Mission pact: this mission only. Blood pact: 3 missions, both get +1 reputation per shared win.</p>
    <label class="r">Credit split <select id="pa-split"><option>50 / 50</option><option>60 / 40</option><option>70 / 30</option></select></label>
    <div class="g2"><button data-close>Cancel</button><button class="b-gold" id="pa-ok">Send offer</button></div>`,(c,close)=>{
      c.querySelector('#pa-ok').addEventListener('click',()=>{const who=c.querySelector('#pa-who').value;if(!who){close();return;}const p={who,type:c.querySelector('#pa-type').value,left:3,split:c.querySelector('#pa-split').value,pending:true};
        A.pacts.push(p);save();close();renderAl();toast(`Pact offer sent to ${who}.`);
        setTimeout(()=>{if(who==='Copper Sentinel'){A.pacts.splice(A.pacts.indexOf(p),1);toast('Copper Sentinel refuses: he is hunting your bounty.');}else{p.pending=false;toast(`${who} accepted the ${p.type.toLowerCase()}.`);}save();renderAl();},2500);});});
  if(b.dataset.al==='break'){const p=A.pacts[+b.dataset.k];modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Break the pact with ${esc(p.who)}?</h2>
    <p style="margin:0">Breaking a pact marks you as a <b style="color:var(--magl)">Traitor</b>: −100 reputation, an automatic 5 cr bounty on you for 3 days, and ${esc(p.who)} gets +1 attack die against you for the rest of the mission.</p>
    <div class="g2"><button data-close>Keep the pact</button><button class="b-gold" id="br-ok">Break it</button></div>`,(c,close)=>{
      c.querySelector('#br-ok').addEventListener('click',()=>{A.pacts.splice(+b.dataset.k,1);A.traitor=1;save();close();renderAl();toast(`Pact with ${p.who} broken. You carry the Traitor mark.`);});});}
});
renderAl();
register('home');

/* ---------- TROPHIES ---------- */
const TR=[['First Blood','First Execution in a ranked match',1,'#71617c'],['Duelist','Win 10 duels',1,'#32d6d0'],['Bounty Hunter','Claim 5 bounties',1,'#c6a15b'],['Survivor','Survive 3 missions with a bounty on you',1,'#ff5d5b'],
 ['Zone Warden','Hold a zone for 3 wars',.67,'2/3'],['Ghost Hand','Hack 20 terminals',.65,'13/20'],['Untouchable','Finish 5 matches at full HP',.2,'1/5'],['Orbital Pioneer','Win on the Orbital Station',0,'Expansion'],['Frontier Legend','Reach league top 10',0,'#38 now']];
function renderTrophies(){
  $('#t-count').textContent=TR.filter(t=>t[2]===1).length+' / '+TR.length;
  $('#t-stats').innerHTML=[['62%','Win rate'],['1.8','K/D'],['47','Matches'],['9','Bounties claimed'],['4','Bounties survived'],['#38','League']].map(([a,b])=>`<div class="stat"><b>${a}</b><span class="sub" style="font-size:13px">${b}</span></div>`).join('');
  $('#t-grid').innerHTML=TR.map(([n,d,p,c])=>p===1?`<div style="border-color:${c}"><svg role="img" aria-label="${n} medal" width="42" height="46" viewBox="0 0 40 44"><path d="M12 2h6l2 12-5 2zM22 2h6l-3 14-5-2z" fill="${c}" opacity=".6"/><circle cx="20" cy="28" r="13" fill="#241923" stroke="${c}" stroke-width="3"/><path d="M20 20l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="${c}"/></svg><b class="cond" style="font-size:15px;letter-spacing:.02em;text-transform:none">${n}</b><span class="sub" style="font-size:12px;line-height:1.2">${d}</span></div>`
   :`<div class="lock"><svg role="img" aria-label="${n} medal, not earned" width="42" height="46" viewBox="0 0 40 44"><circle cx="20" cy="28" r="13" fill="none" stroke="#5e4c60" stroke-width="3" stroke-dasharray="4 3"/><path d="M15 27v-3a5 5 0 0 1 10 0v3M14 27h12v8H14z" fill="none" stroke="#8e7d90" stroke-width="2"/></svg><b class="cond" style="font-size:15px;letter-spacing:.02em;text-transform:none;color:var(--mute)">${n}</b><span class="sub" style="font-size:12px;line-height:1.2">${d}</span>${p?`<div class="hp" style="width:100%"><i style="width:${p*100}%;background:var(--teal)"></i></div>`:''}<span class="sub" style="font-size:12px">${c}</span></div>`).join('');
}
register('trophies',{show:renderTrophies});

function start(){setCr(st.cr);window.addEventListener('hashchange',route);route();}
return {$,$$,esc,toast,modal,register,start,store,st,save,views,addCr:n=>setCr(st.cr+n),setCr};
})();

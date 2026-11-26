/* Inventory v1.2: 6 weapon types, cyberware with Neural Load, consumables (pack 4), loot (unlimited passives) */
(function(){
const {$,esc,toast,st,save}=GN;
/* ---------- classes + animated symbols ---------- */
const CLASSES={
 gunslinger:{n:'Gunslinger',c:'#c6a15b',p:'Dead Eye: reroll one die per pistol attack.',
  svg:'<g class="ci-spin"><circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="2.4"/>'+[0,60,120,180,240,300].map(a=>`<circle cx="${(20+6.5*Math.sin(a*Math.PI/180)).toFixed(1)}" cy="${(20-6.5*Math.cos(a*Math.PI/180)).toFixed(1)}" r="2.3" fill="currentColor"/>`).join('')+'<circle cx="20" cy="20" r="1.6" fill="currentColor"/></g>'},
 brawler:{n:'Brawler',c:'#ff5d5b',p:'Charge: sprint and still strike in melee.',
  svg:'<g class="ci-jab"><rect x="9" y="12" width="20" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M14 12v6M19 12v6M24 12v6M9 21h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M29 17h4M29 23h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="ci-speed"/></g>'},
 tech:{n:'Tech-Slinger',c:'#32d6d0',p:'Hacker: +1 to hacks, hacks from 3 hexes.',
  svg:'<rect x="13" y="13" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path class="ci-flow" d="M20 4v9M20 27v9M4 20h9M27 20h9M8 8l5 5M32 32l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="2.5" fill="currentColor" class="ci-blink"/>'},
 ghost:{n:'Ghost',c:'#b7a6c2',p:'Shadow: +1 dodge after ending a turn in cover without attacking.',
  svg:'<g class="ci-fade"><path d="M10 34V19a10 10 0 0 1 20 0v15l-3.5-3-3.3 3-3.2-3-3.3 3-3.2-3z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="16.5" cy="20" r="1.8" fill="currentColor"/><circle cx="23.5" cy="20" r="1.8" fill="currentColor"/></g>'},
 sniper:{n:'Sniper',c:'#f1e9db',p:'Steady Hand: aim after moving 1 hex, sniper range 4–9.',
  svg:'<g class="ci-scope"><circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20 4v8M20 28v8M4 20h8M28 20h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></g><circle cx="20" cy="20" r="2.4" fill="#ff5d5b" class="ci-blink"/>'}};
const icon=(k,size)=>`<svg class="ci" role="img" aria-label="${CLASSES[k].n}" width="${size}" height="${size}" viewBox="0 0 40 40" style="color:${CLASSES[k].c}">${CLASSES[k].svg}</svg>`;
GN.classIcon=icon;GN.CLASSES=CLASSES;
/* ---------- catalogue ---------- */
// t: weapon|cyber|consumable|loot · wt: weapon type · fit: classes that use it best
const IT=[
 // WEAPONS: one of each of the 6 types (+ variants)
 {id:'katana',t:'weapon',wt:'Melee',n:'Katana',r:'rare',fit:['brawler','ghost'],st:[['Dice','2D6'],['Range','1 hex'],['Hit','3+'],['Damage','2']],fx:'Deflect: when you dodge a firearm hit with a natural 6, the shooter takes 1 damage.',src:'Bought at the Black Market, Neon Mesa, for 10 cr.',lore:'Folded steel with a magenta edge strip.',p:10,lo:['back','katana']},
 {id:'ekatana',t:'weapon',wt:'Melee',n:'Energy Katana',r:'epic',fit:['brawler','ghost'],st:[['Dice','2D6'],['Range','1 hex'],['Hit','3+'],['Damage','2']],fx:'Deflect on a 5 or 6. Hits on drones deal +1 damage.',src:'Looted from the Data Vault match (win, round 7).',lore:'Plasma blade, hums near cyberware.',p:20,lo:['back','katana']},
 {id:'revolver',t:'weapon',wt:'Pistol',n:'Revolver',r:'common',fit:['gunslinger'],st:[['Dice','3D6'],['Range','1–6 hex'],['Hit','4+ (5+ at 5–6)'],['Damage','1']],fx:'Quick Draw: you may attack after a sprint, with 1D6.',src:'Starting gear of every Gunslinger.',lore:'Six chambers, one reputation.',p:6,lo:['weapon','revolvers']},
 {id:'heavyrev',t:'weapon',wt:'Pistol',n:'Heavy Revolver',r:'rare',fit:['gunslinger'],st:[['Dice','3D6'],['Range','1–4 hex'],['Hit','5+'],['Damage','2']],fx:'Kick: a target hit twice by one attack is pushed 1 hex away.',src:'Season 1 reward, Gunslinger Rank IV.',lore:'Hand-cannon from the Plant foundry.',p:14,lo:['weapon','revolvers']},
 {id:'shotgun',t:'weapon',wt:'Shotgun',n:'Sawn-off Shotgun',r:'rare',fit:['brawler','tech'],st:[['Dice','3D6'],['Range','1–3 hex'],['Hit','4+ (5+ at 3)'],['Damage','2 at 1 hex, else 1']],fx:'Spread: dodging it is 1 harder at 1 hex (6+ without cover).',src:'Bought at the Saloon armory for 10 cr.',lore:'Barrel cut short for close work.',p:10,lo:['weapon','shotgun']},
 {id:'smg',t:'weapon',wt:'SMG',n:'Viper SMG',r:'rare',fit:['tech','gunslinger'],st:[['Dice','4D6'],['Range','1–4 hex'],['Hit','5+'],['Damage','1']],fx:'Suppress: a target you hit moves 1 hex less next turn. Spray: split the dice between two targets standing next to each other.',src:'Looted from a Corporation drone crate.',lore:'Corporate security issue, serial filed off.',p:12,lo:['weapon','smg']},
 {id:'sniper',t:'weapon',wt:'Sniper',n:'Sniper Rifle',r:'rare',fit:['sniper','ghost'],st:[['Dice','2D6'],['Range','4–8 hex'],['Hit','4+ (aimed 3+)'],['Damage','2']],fx:'Aim: if you did not move this turn, hit on 3+. Cannot fire at 1–3 hexes.',src:'Bought at the Black Market for 12 cr.',lore:'Long glass, longer patience.',p:12,lo:['back','rifle']},
 {id:'emp',t:'weapon',wt:'Sniper',n:'EMP Rifle',r:'epic',fit:['sniper','tech'],st:[['Dice','2D6'],['Range','4–8 hex'],['Hit','4+'],['Damage','1']],fx:'Short-circuit: a hit target loses its cyberware effects and reaction until the end of next round. Drones hit are disabled.',src:'Looted from the Orbital Armory.',lore:'Fires a charge, not a bullet.',p:18,lo:['back','rifle']},
 {id:'rocket',t:'weapon',wt:'Rocket',n:'Hellfire Launcher',r:'epic',fit:['brawler'],st:[['Dice','1D6'],['Range','3–7 hex'],['Hit','3+ on the target hex'],['Damage','3, plus 1 to every adjacent hex']],fx:'Blast hits allies too. Reload: after firing you must spend an action to reload. Heavy: carrier moves 1 hex less.',src:'Mission reward: Convoy through the desert.',lore:'One shot, one crater.',p:24,lo:['back','rocket']},
 // CYBERWARE: 3 slots, Neural Load 6 (Tech-Slinger 8)
 {id:'cyberreflex',t:'cyber',cls:['gunslinger','brawler','tech','ghost','sniper'],n:'Cyber-Reflex',r:'rare',load:2,fit:['ghost','gunslinger'],fx:'Dodge with 2D6 and keep the better die.',src:'Implanted at the Neon Mesa clinic for 10 cr.',lore:'Spinal accelerator, twitchy in the rain.',p:10},
 {id:'jetboost',t:'cyber',cls:['gunslinger','brawler','tech','ghost','sniper'],n:'Jet Boost',r:'rare',load:1,fit:['brawler','gunslinger'],fx:'Movement +1 and sprint +1.',src:'Bought at the Black Market for 6 cr.',lore:'Calf thrusters, leave scorch marks.',p:6,lo:['back','jetpack']},
 {id:'cybereyes',t:'cyber',cls:['gunslinger','ghost','sniper'],n:'Cyber Eyes',r:'rare',load:1,fit:['sniper'],fx:'Aim still works after moving 1 hex. Pistols get +1 range.',src:'Looted from the Sabotage match at Drone Hub.',lore:'Teal optics with a range finder.',p:6,lo:['cyber','eye']},
 {id:'neural',t:'cyber',cls:['gunslinger','tech','sniper'],n:'Neural Prediction',r:'epic',load:2,fit:['tech','sniper'],fx:'Once per round, reroll one of your own dice.',src:'Mission reward: Two teams, one Data Vault.',lore:'Guesses your next move before you do.',p:14,lo:['cyber','spine']},
 {id:'plasma',t:'cyber',cls:['brawler','tech'],n:'Plasma Shield',r:'legendary',load:3,fit:['brawler','tech'],fx:'Reaction, once per mission: cancel up to 2 hits from one attack.',src:'Looted from the Orbital Station Armory.',lore:'Shoulder emitter, smells of ozone.',p:24,lo:['shoulder','shield']},
 {id:'camo',t:'cyber',cls:['ghost','sniper'],n:'Adaptive Camouflage',r:'epic',load:2,fit:['ghost'],fx:'+1 to dodge while in cover (dodge never better than 2+).',src:'Bought from a Shadow Syndicate fence for 12 cr.',lore:'Skin weave that copies the wall behind you.',p:12},
 {id:'subdermal',t:'cyber',cls:['brawler'],n:'Subdermal Armor',r:'rare',load:2,fit:['brawler'],fx:'Gives the Ricochet Shield reaction: cancel one hit on 4+. Movement −1.',src:'Starting implant of every Brawler.',lore:'Plates under the skin.',p:8,lo:['shoulder','pauldron']},
 {id:'titanium',t:'cyber',cls:['brawler'],n:'Titanium Arms',r:'rare',load:2,fit:['brawler'],fx:'Melee attacks deal +1 damage. Your unarmed Strike rolls 2D6.',src:'Bought at the Plant foundry for 10 cr.',lore:'Knuckles that dent doors.',p:10},
 {id:'berserker',t:'cyber',cls:['brawler'],n:'Berserker Chip',r:'epic',load:3,fit:['brawler'],fx:'Below half HP: +1 attack die, but −1 to your dodge.',src:'Looted from a Rust Jack duel.',lore:'Bans fear, also bans caution.',p:14},
 {id:'grapple',t:'cyber',cls:['tech','ghost','sniper'],n:'Grappling Hook',r:'rare',load:1,fit:['ghost','sniper'],fx:'Action: move up to 4 hexes in a straight line, over crates. Once per round.',src:'Bought at the Train Station for 7 cr.',lore:'Wrist reel, 20 m of wire.',p:7},
 {id:'overclock',t:'cyber',cls:['gunslinger','brawler','ghost'],n:'Overclock Legs',r:'epic',load:2,fit:['gunslinger','ghost'],fx:'Sprint 7 hexes. After an overclocked sprint roll 1D6: on a 1 you take 1 damage.',src:'Mission reward: Neon Kid duel.',lore:'Runs hot, runs fast.',p:12},
 {id:'holodecoy',t:'cyber',cls:['tech','ghost','sniper'],n:'Holo-Decoy',r:'rare',load:2,fit:['ghost','sniper'],fx:'Reaction: the first hit of an attack goes to a hologram.',src:'Bought from a Shadow Syndicate fence for 7 cr.',lore:'A flicker of you, one step to the left.',p:7},
 {id:'feign',t:'cyber',cls:['gunslinger','brawler','tech','ghost','sniper'],n:'Feign Death',r:'epic',load:2,fit:['ghost','gunslinger'],fx:'When you would be downed, vanish and return next turn within 2 hexes at 1 HP. Once per mission.',src:'Looted from the Smuggler Cache.',lore:'Stops your heart for six seconds.',p:9},
 // CONSUMABLES: any number owned, pack up to 4 into a mission
 {id:'nanoheal',t:'consumable',n:'Nano Heal',r:'common',fit:['brawler','gunslinger','tech','ghost','sniper'],fx:'Action: heal 3 HP. Can target an ally next to you.',src:'Bought at the Saloon for 3 cr.',lore:'A syringe of hungry machines.',p:3},
 {id:'granate',t:'consumable',n:'Granate',r:'rare',fit:['brawler','tech'],fx:'Throw up to 3 hexes: 1D6 per unit on and next to the target hex, hit on 4+, damage 1.',src:'Looted from a Corporation drone crate.',lore:'Pin, count, pray.',p:4},
 {id:'smoke',t:'consumable',n:'Smoke Grenade',r:'common',fit:['ghost','sniper'],fx:'Throw up to 3 hexes: that hex and its neighbours give heavy cover against ranged attacks until the end of the round.',src:'Bought at the Black Market for 3 cr.',lore:'Desert-grey cloud.',p:3},
 {id:'stim',t:'consumable',n:'Stim Shot',r:'common',fit:['gunslinger','brawler'],fx:'Free: +2 movement this turn.',src:'Bought at the Saloon for 2 cr.',lore:'Burns going in.',p:2},
 {id:'empnade',t:'consumable',cls:['tech','brawler','gunslinger'],n:'EMP Grenade',r:'rare',fit:['tech'],fx:'Throw up to 3 hexes: drones disabled and cyberware switched off within 1 hex until the end of next round.',src:'Looted from the Drone Hub war.',lore:'Quiet flash, loud consequences.',p:5},
 {id:'flash',t:'consumable',n:'Flashbang',r:'common',fit:['brawler','tech'],fx:'Throw up to 3 hexes: everyone within 1 hex loses their reaction this round.',src:'Bought at the Black Market for 3 cr.',lore:'Ears ring till sunrise.',p:3},
 {id:'spike',t:'consumable',cls:['tech','ghost'],n:'Hack Spike',r:'rare',fit:['tech'],fx:'One door, drone or terminal hack succeeds automatically.',src:'Mission reward: Sabotage at the Plant.',lore:'Single-use exploit on a stick.',p:5},
 {id:'patch',t:'consumable',n:'Armor Patch',r:'common',fit:['brawler','gunslinger','tech','ghost','sniper'],fx:'Reaction: ignore 1 damage from one attack.',src:'Bought at the Saloon for 3 cr.',lore:'Spray-on ceramic.',p:3},
 {id:'knives',t:'consumable',n:'Throwing Knives',r:'common',fit:['ghost','gunslinger'],fx:'Throw one: 1D6, range 1–3, hit on 4+, damage 1. Does not use your weapon.',src:'Bought at the Train Station for 1 cr each.',lore:'Balanced for the wrist.',p:1,lo:['weapon','knives']},
 // LOOT: unlimited, earned by winning matches, always active, duplicates do not stack
 {id:'aicore',t:'loot',n:'AI Core Shard',r:'legendary',fit:['tech'],fx:'+1 to all your hacking rolls.',src:'Won: Two teams, one Data Vault (victory, 21 Nov).',lore:'A splinter of the lost Corporation mind.'},
 {id:'star',t:'loot',n:"Sheriff's Star",r:'epic',fit:['gunslinger'],fx:'+1 reputation for every mission you survive.',src:'Won: Duel vs Rust Jack (victory, 24 Nov).',lore:'Tin, but it still means something.'},
 {id:'lucky',t:'loot',n:'Lucky Bullet',r:'rare',fit:['gunslinger','sniper'],fx:'Once per mission, reroll all the dice of one attack.',src:'Won: Bounty Hunt in Dryridge (victory, 18 Nov).',lore:'It missed you once. It will again.'},
 {id:'ghostcoat',t:'loot',n:'Ghost Coat Patch',r:'rare',fit:['ghost'],fx:'Round 1 of every mission: +1 to dodge.',src:'Won: Ambush on the Vault convoy (victory, 15 Nov).',lore:'Torn from a coat no one saw leave.'},
 {id:'compass',t:'loot',n:'Desert Compass',r:'common',fit:['gunslinger','brawler','tech','ghost','sniper'],fx:'In Desert missions you choose your starting edge.',src:'Won: Convoy through the desert (victory, 12 Nov).',lore:'Always points to water. Or trouble.'},
 {id:'ledger',t:'loot',n:'Bounty Ledger',r:'epic',fit:['gunslinger','sniper'],fx:'Bounties you claim pay 20% more.',src:'Won: 5 claimed bounties (trophy reward).',lore:'Names, prices, and a few crossed out.'},
 {id:'fang',t:'loot',n:"Jackal's Fang",r:'rare',fit:['brawler'],fx:'Melee: a natural 6 on your attack deals +1 damage.',src:'Won: Zone War vs Iron Jackal (victory, 9 Nov).',lore:'Pulled from a chrome jaw.'},
 {id:'keycard',t:'loot',n:'Orbital Keycard',r:'legendary',fit:['tech','ghost'],fx:'Unlocks Orbital Station story missions in the mission generator.',src:'Won: Sabotage of the Orbital Station (victory, 3 Nov).',lore:'Still warm from the docking bridge.'}];
const byId=id=>IT.find(i=>i.id===id);
const ALL=['gunslinger','brawler','tech','ghost','sniper'];
const WTYPES={gunslinger:['Pistol','Shotgun','SMG'],brawler:['Melee','Shotgun','Rocket'],tech:['SMG','Pistol','Shotgun'],ghost:['Melee','Pistol','SMG'],sniper:['Sniper','Pistol']};
const allowedCls=i=>i.t==='weapon'?ALL.filter(c=>WTYPES[c].includes(i.wt)):(i.cls||ALL);
const allowed=(i,c)=>allowedCls(i).includes(c);
const START={gunslinger:{weapon:'revolver',cyber:['cyberreflex']},brawler:{weapon:'katana',cyber:['subdermal']},tech:{weapon:'smg',cyber:['neural']},ghost:{weapon:'katana',cyber:['camo']},sniper:{weapon:'sniper',cyber:['cybereyes']}};
const RC={common:'#b5a7b4',rare:'#32d6d0',epic:'#ff8f8d',legendary:'#c6a15b'};
const TYPE={weapon:'Weapon',cyber:'Cyberware',consumable:'Consumable',loot:'Loot'};
const TI={weapon:'<path d="M3 9h14l2-2h2v4h-4l-1 2h-3l-1 4H8l1-4H3z"/>',Melee:'<path d="M5 19L18 6l1-3 2 2-3 1L5 19l-1 2-2-2z"/>',Rocket:'<path d="M3 14l11-11h4v4L7 18zM6 14l4 4M3 21l3-3"/>',cyber:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',consumable:'<path d="M9 2h6M10 2v5l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V2"/>',loot:'<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'};
const tIcon=i=>TI[i.wt]||TI[i.t];
/* ---------- state ---------- */
if(!st.g)st.g={own:{revolver:1,katana:1,smg:1,sniper:1,rocket:1,heavyrev:1,shotgun:1,ekatana:1,emp:1,cyberreflex:1,jetboost:1,cybereyes:1,neural:1,plasma:1,camo:1,subdermal:1,grapple:1,overclock:1,nanoheal:3,granate:2,smoke:2,stim:4,empnade:1,flash:2,spike:1,patch:2,knives:6,aicore:1,star:1,lucky:1,ghostcoat:1,compass:1,ledger:1,fang:1,keycard:1},weapon:'revolver',cyber:['cyberreflex','jetboost'],pack:['nanoheal','granate','stim']};
const G=st.g;
['titanium','berserker','holodecoy','feign'].forEach(id=>{if(G.own[id]===undefined)G.own[id]=1;});
function startGear(cls){const s=START[cls];[s.weapon,...s.cyber].forEach(id=>{if(!G.own[id])G.own[id]=1;});save();return{weapon:s.weapon,cyber:s.cyber.slice(),pack:['nanoheal','stim'].filter(id=>G.own[id])};}
const HG=()=>{const h=GN.hero.active();if(!h.gear){h.gear=h.id==='h1'&&G.weapon?{weapon:G.weapon,cyber:G.cyber.slice(),pack:G.pack.slice()}:startGear(h.cls);GN.hero.save();}return h.gear;};
const saveAll=()=>{save();GN.hero.save();GN.hero.refresh();};
GN.gear={byId,allowed,allowedCls,startGear,HG:()=>HG(),WTYPES};
const myClass=()=>GN.hero?GN.hero.active().cls:'gunslinger';
const loadCap=()=>GN.hero?GN.hero.stats(GN.hero.active()).nl:6;
const loadUsed=()=>HG().cyber.reduce((s,id)=>s+(byId(id).load||0),0);
const SLOTS=3;let PACK=4;
let filter='all',sel='plasma',clsF=null;
function rulesFor(i){const cl=' · Classes: '+allowedCls(i).map(c=>CLASSES[c].n).join(', ');return rulesFor0(i)+(i.t==='loot'?'':cl);}
function rulesFor0(i){
  if(i.t==='weapon')return `${i.wt} · one weapon equipped at a time`;
  if(i.t==='cyber')return `Neural Load ${i.load} · max ${SLOTS} implants and ${loadCap()} load`;
  if(i.t==='consumable')return `Stock unlimited · pack up to ${PACK} into a mission`;
  return 'Loot · unlimited · always active · copies do not stack';
}
function render(){
  PACK=GN.hero?GN.hero.stats(GN.hero.active()).pack:4;
  const mc=myClass();
  const h=GN.hero.active(),S=GN.hero.stats(h),Lv=GN.hero.level(h);
  $('#g-class').innerHTML=`<div style="display:flex;gap:12px;align-items:center">${icon(mc,52)}<div style="flex:1"><div class="disp" style="font-size:28px;line-height:1.05">${esc(h.name)}</div><div class="cond" style="color:${CLASSES[mc].c};font-size:14px">${CLASSES[mc].n} · Level ${Lv} · class locked</div></div><a class="cond" href="#hero" style="font-size:14px">Hero ›</a></div>
   <div class="g3">${[['HP',S.hp],['Move',S.mv],['Dodge',S.dodge],['Neural Load',S.nlUsed+' / '+S.nl],['Pack',HG().pack.length+' / '+S.pack],['Reactions',S.reacts.length]].map(([a,b])=>`<div class="stat"><b style="font-size:24px">${b}</b><span class="sub" style="font-size:13px">${a}</span></div>`).join('')}</div>
   <p class="sub" style="margin:0;font-size:13px">Showing only gear a ${CLASSES[mc].n} can use. Weapons: ${WTYPES[mc].join(', ')}.</p>`;

  const lu=loadUsed(),lc=loadCap();
  $('#g-slots').innerHTML=`<div style="border-color:${RC[byId(HG().weapon).r]}"><div class="sub" style="font-size:12px">Weapon</div><b style="font-size:14px">${esc(byId(HG().weapon).n)}</b></div>`+
   [0,1,2].map(k=>{const id=HG().cyber[k],i=id&&byId(id);return `<div style="${i?'border-color:'+RC[i.r]:'border-style:dashed;color:var(--mute)'}"><div class="sub" style="font-size:12px">Implant ${k+1}</div><b style="font-size:14px">${i?esc(i.n):'Empty'}</b></div>`;}).join('');
  $('#g-meters').innerHTML=`<div><div style="display:flex;justify-content:space-between;font-size:13px"><span class="cond">Neural load</span><span>${lu} / ${lc}</span></div><div class="hp"><i style="width:${100*lu/lc}%;background:${lu>=lc?'var(--mag)':'var(--teal)'}"></i></div></div>
   <div><div style="display:flex;justify-content:space-between;font-size:13px"><span class="cond">Mission pack</span><span>${HG().pack.length} / ${PACK}</span></div><div class="hp"><i style="width:${100*HG().pack.length/PACK}%;background:var(--gold)"></i></div><div class="sub" style="font-size:12px;margin-top:3px">${HG().pack.length?HG().pack.map(id=>esc(byId(id).n)).join(', '):'Nothing packed'}</div></div>
   <div><div style="display:flex;justify-content:space-between;font-size:13px"><span class="cond">Loot</span><span>${IT.filter(i=>i.t==='loot'&&G.own[i.id]).length} · no limit</span></div><div class="sub" style="font-size:12px">All loot is always active.</div></div>`;
  const CATS=[['all','All'],['weapon','Weapons'],['cyber','Cyberware'],['consumable','Consumables'],['loot','Loot']];
  $('#g-chips').innerHTML=CATS.map(([k,l])=>`<button data-f="${k}" class="${filter===k?'on-t':''}" aria-pressed="${filter===k}">${l}</button>`).join('');
  const list=IT.filter(i=>G.own[i.id]&&allowed(i,mc)&&(filter==='all'||i.t===filter));
  $('#g-items').innerHTML=list.length?list.map(i=>{const eq=HG().weapon===i.id||HG().cyber.includes(i.id),pk=HG().pack.filter(x=>x===i.id).length;
    const tag=eq?'Equipped':pk?`Packed ×${pk}`:i.t==='loot'?'Active':i.wt||(i.load?`Load ${i.load}`:TYPE[i.t]);
    return `<button class="it r-${i.r} ${sel===i.id?'sel':''}" data-i="${i.id}" aria-pressed="${sel===i.id}" style="${sel===i.id?'border-color:'+RC[i.r]:''}"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${RC[i.r]}" stroke-width="1.8" stroke-linejoin="round">${tIcon(i)}</svg><b>${esc(i.n)}</b><small style="${eq||pk?'color:var(--teal)':''}">${tag}</small>${G.own[i.id]>1?`<span class="q">x${G.own[i.id]}</span>`:''}<span class="fits">${i.fit.slice(0,3).map(k=>icon(k,14,false)).join('')}</span></button>`;}).join('')
    :`<p class="sub" style="grid-column:1/-1">Nothing here for this filter.</p>`;
  if(!G.own[sel]||!list.some(i=>i.id===sel))sel=list[0]&&list[0].id;
  renderDetail();
}
function renderDetail(){
  const i=byId(sel);if(!i){$('#g-detail').innerHTML='';return;}
  const eq=HG().weapon===i.id||HG().cyber.includes(i.id),pk=HG().pack.filter(x=>x===i.id).length,mc=myClass();
  let acts='';
  if(i.t==='weapon')acts=eq?'<button disabled>Equipped</button>':'<button class="b-gold" data-g="equip">Equip weapon</button>';
  if(i.t==='cyber')acts=eq?'<button class="b-out" data-g="unequip">Remove implant</button>':'<button class="b-gold" data-g="equip">Install implant</button>';
  if(i.t==='consumable')acts=`<button class="b-gold" data-g="pack" ${G.own[i.id]>pk&&HG().pack.length<PACK?'':'disabled'}>Pack for mission</button>`+(pk?'<button class="b-out" data-g="unpack">Unpack one</button>':'');
  if(i.t==='loot')acts='<button disabled>Always active</button>';
  const sell=i.p&&!eq&&i.t!=='loot'?`<button class="b-out" data-g="sell">Sell · ${Math.round(i.p*.75)} cr</button>`:'';
  const stats=i.st?`<table style="width:100%;border-collapse:collapse;font-size:15px">${i.st.map(([a,b])=>`<tr><td class="sub" style="padding:3px 0;width:40%">${a}</td><td style="padding:3px 0;font-weight:600">${esc(b)}</td></tr>`).join('')}</table>`:'';
  $('#g-detail').innerHTML=`<span class="rt ${i.r}">${i.r} · ${i.wt?i.wt+' weapon':TYPE[i.t]}</span>
   <h2 class="disp" style="font-size:32px;line-height:1.05;text-transform:none;letter-spacing:0;color:var(--bone)">${esc(i.n)}</h2>
   <div><div class="cond" style="font-size:13px;color:var(--gold)">In the game</div>${stats}<p style="margin:4px 0 0">${esc(i.fx)}</p></div>
   <div><div class="cond" style="font-size:13px;color:var(--gold)">How you got it</div><p style="margin:2px 0 0;color:#e3d8cc">${esc(i.src)}</p></div>
   <div><div class="cond" style="font-size:13px;color:var(--gold)">Rules</div><p class="sub" style="margin:2px 0 0">${esc(rulesFor(i))}</p></div>
   <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span class="cond" style="font-size:13px;color:var(--gold)">Best for</span>${i.fit.map(k=>`<span class="fitchip">${icon(k,18,true)}${CLASSES[k].n}</span>`).join('')}${i.fit.includes(mc)?'<span class="sub" style="font-size:13px;color:var(--teal)">fits your class</span>':''}</div>
   <p class="sub" style="margin:0;font-style:italic">${esc(i.lore)}</p>
   <div class="g2">${acts}${sell}</div>${i.lo?'<a class="cond" href="#hero" style="font-size:14px">See it on your miniature ›</a>':''}`;
}
$('#g-chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.f;render();});
$('#g-items').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=b.dataset.i;render();if(innerWidth<820)$('#g-detail').scrollIntoView({behavior:'smooth',block:'start'});});
$('#g-detail').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b||b.disabled)return;const i=byId(sel),a=b.dataset.g;
  if(a==='equip'&&i.t==='weapon'){HG().weapon=i.id;toast(`${i.n} equipped.`);}
  if(a==='equip'&&i.t==='cyber'){if(HG().cyber.length>=SLOTS){toast(`All ${SLOTS} implant slots are full. Remove one first.`);return;}
    if(loadUsed()+i.load>loadCap()){toast(`Neural Load would be ${loadUsed()+i.load} / ${loadCap()}. Remove an implant first.`);return;}
    HG().cyber.push(i.id);toast(`${i.n} installed.`);}
  if(a==='unequip'){HG().cyber=HG().cyber.filter(x=>x!==i.id);toast(`${i.n} removed.`);}
  if(a==='pack'){HG().pack.push(i.id);toast(`${i.n} packed (${HG().pack.length}/${PACK}).`);}
  if(a==='unpack'){HG().pack.splice(HG().pack.indexOf(i.id),1);toast(`${i.n} unpacked.`);}
  if(a==='sell'){GN.addCr(Math.round(i.p*.75));G.own[i.id]--;if(i.t==='consumable'){while(HG().pack.filter(x=>x===i.id).length>G.own[i.id])HG().pack.splice(HG().pack.indexOf(i.id),1);}toast(`Sold ${i.n}.`);}
  saveAll();render();});
GN.gearItems=IT;
GN.register('gear',{show:render});
})();

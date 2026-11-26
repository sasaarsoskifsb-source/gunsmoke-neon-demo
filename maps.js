/* Skirmish maps: Dryridge, Red Canyon, Neon Mesa, The Plant. One is selected and projected in AR. */
(function(){
const {$,esc,toast,store}=GN;
const MAPS=[
 {id:'dryridge',n:'Dryridge',zone:'Frontier town',fit:'gunslinger',players:'2–6',img:'map-dryridge.webp',
  blurb:'A dusty frontier town: saloon, windmill and water tower ringed by red rock. Close streets for duels and bounty hunts.',
  rules:[['Buildings','Block movement and line of sight.'],['Fences','Light cover (+1 dodge).'],['Water tower','Climb with an action: +1 range for pistols and snipers.'],['Saloon','Interact: +3 HP once per mission.'],['Objectives','5 control points.']],
  spots:['the Saloon','the Water Tower','the Windmill']},
 {id:'redcanyon',n:'Red Canyon',zone:'Desert',fit:'sniper',players:'2–6',img:'map-redcanyon.webp',
  blurb:'Mesas and a dry river cut the board into lanes. Long sight lines from the cliffs, ambushes in the gorge.',
  rules:[['Mesas','Block line of sight. Standing on a mesa edge: +1 to hit from high ground.'],['Dry river','Movement −1 inside the gorge.'],['Sand','Desert rule: movement −1 everywhere.'],['Cacti','Light cover.'],['Objectives','5 control points.']],
  spots:['the Big Mesa','the Dry River','Cactus Pass']},
 {id:'neonmesa',n:'Neon Mesa',zone:'Neon city',fit:'tech',players:'3–6',img:'map-neonmesa.webp',
  blurb:'A cyber city wrapped around a glowing mesa. Neon rails, hack terminals and corporate drones.',
  rules:[['Neon rails','Moving along a glowing path: +1 movement.'],['Towers','Block movement and line of sight.'],['Hack terminals','Hack on 5+: open doors or switch a drone to your side.'],['Drones','2 corporate drones start active.'],['Objectives','5 control points.']],
  spots:['the Neon Spire','the Hack Terminal','the Drone Hub']},
 {id:'theplant',n:'The Plant',zone:'Industrial',fit:'brawler',players:'3–6',img:'map-theplant.webp',
  blurb:'A refinery of tanks, pipes and smokestacks. Heavy cover everywhere and toxic pools for the careless.',
  rules:[['Tanks and pipes','Heavy cover (+2 dodge).'],['Toxic pools','Entering one: 1 damage.'],['Smokestacks','Line of sight past the smoke reaches 3 hexes at most.'],['Catwalks','Ladders let you climb with 1 movement.'],['Objectives','5 control points.']],
  spots:['the Tank Farm','the Smokestack','the Toxic Pools']}];
const get=id=>MAPS.find(m=>m.id===id)||MAPS[0];
let sel=store.get('map','dryridge'),view=sel;
function select(id,silent){sel=get(id).id;store.set('map',sel);syncHome();subs.forEach(f=>{try{f(sel);}catch(e){}});if(!silent)toast(`${get(sel).n} selected for your next skirmish.`);render();}
const subs=[];
function syncHome(){const m=get(sel);const i=$('#h-mapimg');if(i){i.src=m.img;i.alt=`${m.n} board`;}const n=$('#h-mapname');if(n)n.textContent=`Skirmish map: ${m.n} · change ›`;
  const r=$('#lv-round');if(r&&!r.dataset.fixed){}}
function render(){
  const m=get(view);
  $('#mp-img').src=m.img;$('#mp-img').alt=`${m.n} board`;$('#mp-sel').hidden=view!==sel;
  $('#mp-thumbs').innerHTML=MAPS.map(x=>`<button class="thumb ${x.id===view?'on-t':''}" data-m="${x.id}" aria-pressed="${x.id===view}"><img src="${x.img}" alt=""><span>${esc(x.n)}${x.id===sel?' ✓':''}</span></button>`).join('');
  $('#mp-info').innerHTML=`<span class="rt rare">${esc(m.zone)} · ${m.players} players</span>
   <h2 class="disp" style="font-size:36px;line-height:1.05;text-transform:none;letter-spacing:.01em">${esc(m.n)}</h2>
   <p style="margin:0">${esc(m.blurb)}</p>
   <div style="display:flex;align-items:center;gap:8px"><span class="cond" style="font-size:13px;color:var(--gold)">Favours</span><span class="fitchip">${GN.classIcon?GN.classIcon(m.fit,18,true):''}${GN.CLASSES?GN.CLASSES[m.fit].n:m.fit}</span></div>
   <div>${m.rules.map(([a,b])=>`<div class="mrule"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
   <div class="g2">${view===sel?'<button disabled>Selected for skirmish</button>':'<button class="b-gold" id="mp-pick">Select for skirmish</button>'}<a class="btn b-teal" href="#ar" id="mp-ar">Play in AR</a></div>`;
}
$('#mp-thumbs').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;view=b.dataset.m;render();});
const step=d=>{const i=MAPS.findIndex(m=>m.id===view);view=MAPS[(i+d+MAPS.length)%MAPS.length].id;render();};
$('#mp-prev').addEventListener('click',()=>step(-1));$('#mp-next').addEventListener('click',()=>step(1));
$('#mp-info').addEventListener('click',e=>{if(e.target.closest('#mp-pick'))select(view);else if(e.target.closest('#mp-ar')&&view!==sel)select(view,true);});
// swipe between maps on the big image
let sx=null;$('#mp-img').addEventListener('pointerdown',e=>{sx=e.clientX;});$('#mp-img').addEventListener('pointerup',e=>{if(sx!==null&&Math.abs(e.clientX-sx)>40)step(e.clientX<sx?1:-1);sx=null;});
GN.maps={list:MAPS,get,selected:()=>sel,select,on(f){subs.push(f);}};
syncHome();
GN.register('maps',{show(){view=sel;render();}});
})();

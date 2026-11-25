/* 3D Loadout: Pistolwhisker with attachments */
{
const $=GN.$;
let apply=()=>{},focusCam=()=>{};
const view=$('#lo-view');
/* ---------- katalog ---------- */
const SLOTS=[
 {id:'head',name:'Headgear',desc:'Hats, visors and rigs. Cosmetic.',cam:'head',items:[
  {id:'none',n:'Bare head',d:'Ears out',r:'common'},
  {id:'stetson',n:'Frontier Stetson',d:'Rust leather, gold band',r:'common'},
  {id:'visor',n:'Neon Visor',d:'Teal HUD band',r:'rare'},
  {id:'antenna',n:'Signal Antennas',d:'Magenta relay tips',r:'epic'}]},
 {id:'outfit',name:'Outfit',desc:'Dye for the whole outfit. Cosmetic.',cam:'full',items:[
  {id:'orig',n:'Original',d:'As printed',r:'common'},
  {id:'bone',n:'Dust Bone',d:'Sun-bleached',r:'common'},
  {id:'rust',n:'Frontier Rust',d:'Red canyon',r:'rare'},
  {id:'ink',n:'Night Ink',d:'Shadow run',r:'rare'},
  {id:'chrome',n:'Neon Chrome',d:'Teal sheen',r:'legendary'}]},
 {id:'belt',name:'Belt',desc:'Worn at the waist.',cam:'full',items:[
  {id:'none',n:'No belt',d:'',r:'common'},
  {id:'buckle',n:'Gold Buckle',d:'Rust leather',r:'common'},
  {id:'neon',n:'Neon Belt',d:'Glowing teal',r:'rare'},
  {id:'grenade',n:'Grenade Belt',d:'Granate · 4 charges',r:'epic'}]},
 {id:'weapon',name:'Holstered weapons',desc:'Carried on the hips. Sets your rulebook weapon.',cam:'full',items:[
  {id:'none',n:'Empty holsters',d:'Udarac only: 1D6',r:'common'},
  {id:'revolvers',n:'Twin Revolvers',d:'Revolver 3D6 · range 1–6',r:'common'},
  {id:'shotgun',n:'Sawn-off Shotgun',d:'Shotgun 3D6 · range 1–3',r:'rare'},
  {id:'knives',n:'Throwing Knives',d:'Planned weapon',r:'rare'}]},
 {id:'back',name:'Back',desc:'Big gear on the back.',cam:'back',items:[
  {id:'none',n:'Nothing',d:'',r:'common'},
  {id:'jetpack',n:'Jet Boost Pack',d:'Upgrade: move +1',r:'epic'},
  {id:'katana',n:'Sheathed Katana',d:'Katana 2D6 · range 1',r:'rare'},
  {id:'rifle',n:'Sniper Rifle',d:'Snajper 2D6 · range 4–8',r:'rare'},
  {id:'datapack',n:'Data Pack',d:'Hacking rig',r:'common'}]},
 {id:'shoulder',name:'Shoulder',desc:'Armor on the left shoulder.',cam:'full',items:[
  {id:'none',n:'Nothing',d:'',r:'common'},
  {id:'pauldron',n:'Rust Pauldron',d:'Subdermal armor look',r:'common'},
  {id:'shield',n:'Plasma Shield',d:'Ricochet Shield emitter',r:'epic'}]},
 {id:'cyber',name:'Cyberware',desc:'Implants and glow.',cam:'head',items:[
  {id:'none',n:'Clean',d:'No implants',r:'common'},
  {id:'eye',n:'Cyber Eye',d:'Teal optic',r:'rare'},
  {id:'halo',n:'Bounty Halo',d:'For the most wanted',r:'legendary'},
  {id:'spine',n:'Spine Lights',d:'Neural line',r:'epic'}]},
 {id:'base',name:'Base',desc:'The miniature base on the table.',cam:'full',items:[
  {id:'round',n:'Round Base',d:'Standard 50 mm',r:'common'},
  {id:'hex',n:'Hex Base',d:'Fits one board hex',r:'common'},
  {id:'hexneon',n:'Neon Hex',d:'Hex with teal ring',r:'rare'},
  {id:'rock',n:'Red Canyon Rock',d:'Desert scenic',r:'epic'}]}
];
const DEF={head:'stetson',outfit:'orig',belt:'buckle',weapon:'revolvers',back:'none',shoulder:'none',cyber:'none',base:'hexneon'};
let cur=Object.assign({},DEF);
try{const s=JSON.parse(localStorage.getItem('gn-loadout')||'null');if(s)for(const k in DEF)if(s[k]&&SLOTS.find(x=>x.id===k).items.some(i=>i.id===s[k]))cur[k]=s[k];}catch(e){}
let slot='head';
function renderUI(){
  $('#lo-tabs').innerHTML=SLOTS.map(s=>`<button role="tab" aria-selected="${s.id===slot}" class="${s.id===slot?'on-t':''}" data-s="${s.id}">${s.name}</button>`).join('');
  const S=SLOTS.find(s=>s.id===slot);$('#lo-name').textContent=S.name;$('#lo-desc').textContent=S.desc;
  $('#lo-opts').innerHTML=S.items.map(i=>`<button class="opt l-${i.r} ${cur[slot]===i.id?'sel':''}" data-i="${i.id}" aria-pressed="${cur[slot]===i.id}"><span class="rt ${i.r}">${i.r}</span><b>${i.n}</b><small>${i.d||'&nbsp;'}</small></button>`).join('');
  $('#lo-sum').innerHTML=SLOTS.map(s=>{const i=s.items.find(x=>x.id===cur[s.id]);return `<li><span>${s.name}</span><span>${i.n}</span></li>`;}).join('');
}
$('#lo-tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;slot=b.dataset.s;renderUI();focusCam(SLOTS.find(s=>s.id===slot).cam);});
$('#lo-opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur[slot]=b.dataset.i;renderUI();apply();});
const toast=GN.toast;
$('#lo-rand').addEventListener('click',()=>{for(const s of SLOTS)cur[s.id]=s.items[Math.floor(Math.random()*s.items.length)].id;renderUI();apply();toast('Random loadout rolled.');});
$('#lo-reset').addEventListener('click',()=>{cur=Object.assign({},DEF);renderUI();apply();toast('Back to the default loadout.');});
$('#lo-save').addEventListener('click',()=>{let ok=true;try{localStorage.setItem('gn-loadout',JSON.stringify(cur));}catch(e){ok=false;}toast(ok?'Loadout saved on this device.':'Could not save here, the browser blocked storage.');});
renderUI();

let started=false,visible=false;
function init3d(){started=true;
if(!window.THREE||!THREE.GLTFLoader){$('#lo-load').textContent='3D library did not load. Refresh the page.';return;}

/* ---------- scena ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
view.prepend(renderer.domElement);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(32,1,.05,50);
scene.add(new THREE.HemisphereLight(0xfff1d8,0x1a2230,.9));
const key=new THREE.DirectionalLight(0xffe8c8,1.6);key.position.set(2,4,3);scene.add(key);
const rimT=new THREE.PointLight(0x00E5D4,2.2,8);rimT.position.set(-2,2,-1.5);scene.add(rimT);
const rimM=new THREE.PointLight(0xD93B83,1.6,8);rimM.position.set(2,1.2,-2);scene.add(rimM);
const floor=new THREE.Mesh(new THREE.CircleGeometry(3,64),new THREE.MeshStandardMaterial({color:0x0c1117,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.06;scene.add(floor);
const rig=new THREE.Group();scene.add(rig);
const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.25},o));
const GLOW=c=>new THREE.MeshStandardMaterial({color:0x000000,emissive:c,emissiveIntensity:1.6,roughness:.4});
const COL={bone:0xE8D9B5,rust:0xB95632,teal:0x00E5D4,gold:0xF2B544,ink:0x111820,mag:0xD93B83,leather:0x5a3420,steel:0x8d949e,wood:0x6b4428};
const mesh=(g,m,p,r)=>{const o=new THREE.Mesh(g,m);if(p)o.position.set(...p);if(r)o.rotation.set(...r);return o;};
// sidra za Pistolwhisker (izmjereno iz modela, stopala na y=0, lice prema +Z)
const A={head:[.05,1.74,0],hatY:1.8,face:[.1,1.75,.12],backC:[.0,1.22,-.2],waistY:1.0,hipL:[-.21,.97,.04],hipR:[.21,.97,.04],shL:[-.22,1.41,-.01]};
function build(slot,id){
  const g=new THREE.Group();
  if(slot==='head'){
    if(id==='stetson'){g.add(mesh(new THREE.CylinderGeometry(.27,.29,.022,40),M(COL.leather,{roughness:.8})));g.add(mesh(new THREE.CylinderGeometry(.12,.155,.15,32),M(COL.leather,{roughness:.8}),[0,.085,0]));g.add(mesh(new THREE.TorusGeometry(.152,.013,8,40),M(COL.gold,{metalness:.8,roughness:.3}),[0,.03,0],[Math.PI/2,0,0]));g.position.set(A.head[0],A.hatY,A.head[2]);g.rotation.set(-.08,0,.06);}
    if(id==='visor'){g.add(mesh(new THREE.CylinderGeometry(.155,.155,.05,40,1,true,-1.3,2.6),Object.assign(GLOW(COL.teal),{side:THREE.DoubleSide})));g.add(mesh(new THREE.CylinderGeometry(.16,.16,.012,40,1,true),M(COL.ink),[0,.03,0]));g.position.set(A.head[0],1.755,.0);}
    if(id==='antenna'){for(const s of[-1,1]){g.add(mesh(new THREE.CylinderGeometry(.006,.008,.24,8),M(COL.steel,{metalness:.8}),[s*.08,.12,-.04],[0,0,-s*.25]));g.add(mesh(new THREE.SphereGeometry(.022,16,12),GLOW(COL.mag),[s*.11,.24,-.04]));}g.position.set(A.head[0],1.78,0);}
  }
  if(slot==='belt'&&id!=='none'){
    const ring=new THREE.TorusGeometry(.2,.022,10,48);
    g.add(mesh(ring,id==='neon'?GLOW(COL.teal):M(COL.leather,{roughness:.8}),[0,0,0],[Math.PI/2,0,0]));
    if(id==='buckle')g.add(mesh(new THREE.BoxGeometry(.07,.05,.02),M(COL.gold,{metalness:.9,roughness:.25}),[0,0,.215]));
    if(id==='grenade')for(let i=0;i<4;i++){const a=-.9+i*.6;g.add(mesh(new THREE.SphereGeometry(.035,16,12),M(0x3b4a2f,{roughness:.6}),[Math.sin(a)*.22,-.02,Math.cos(a)*.22]));g.add(mesh(new THREE.CylinderGeometry(.008,.008,.02,8),GLOW(COL.gold),[Math.sin(a)*.22,.02,Math.cos(a)*.22]));}
    g.scale.set(1.1,1,.95);g.position.set(.02,A.waistY,.02);
  }
  if(slot==='weapon'){
    const holster=(x,side)=>{const h=new THREE.Group();h.add(mesh(new THREE.BoxGeometry(.06,.16,.05),M(COL.leather,{roughness:.8})));h.add(mesh(new THREE.BoxGeometry(.035,.09,.03),M(COL.wood),[0,.11,-.01],[.3,0,0]));h.add(mesh(new THREE.CylinderGeometry(.018,.018,.03,12),M(COL.steel,{metalness:.9,roughness:.3}),[0,.06,.01],[Math.PI/2,0,0]));h.position.set(x,0,0);h.rotation.z=side*.12;return h;};
    if(id==='revolvers'){g.add(holster(A.hipL[0]-.02,1));g.add(holster(A.hipR[0]+.02,-1));}
    if(id==='shotgun'){const s=new THREE.Group();s.add(mesh(new THREE.BoxGeometry(.05,.42,.05),M(COL.steel,{metalness:.8,roughness:.35}),[0,-.05,0]));s.add(mesh(new THREE.BoxGeometry(.06,.16,.07),M(COL.wood),[0,.2,-.01]));s.position.set(A.hipR[0]+.04,0,0);s.rotation.z=-.15;g.add(s);}
    if(id==='knives')for(let i=0;i<3;i++){g.add(mesh(new THREE.BoxGeometry(.012,.14,.03),M(COL.steel,{metalness:.9,roughness:.2}),[A.hipL[0]-.02,-.05,.02+i*.035],[0,0,.1]));g.add(mesh(new THREE.BoxGeometry(.016,.05,.032),M(COL.rust),[A.hipL[0]-.022,.04,.02+i*.035]));}
    g.position.y=A.hipL[1];g.position.z=A.hipL[2];
  }
  if(slot==='back'&&id!=='none'){
    if(id==='jetpack'){for(const s of[-1,1]){g.add(mesh(new THREE.CylinderGeometry(.06,.06,.3,20),M(COL.steel,{metalness:.85,roughness:.3}),[s*.075,0,0]));g.add(mesh(new THREE.ConeGeometry(.05,.08,20),GLOW(COL.teal),[s*.075,-.19,0],[Math.PI,0,0]));g.add(mesh(new THREE.TorusGeometry(.061,.008,8,24),M(COL.rust),[s*.075,.1,0],[Math.PI/2,0,0]));}g.add(mesh(new THREE.BoxGeometry(.2,.18,.06),M(COL.ink),[0,.02,.05]));g.position.set(A.backC[0],A.backC[1],A.backC[2]-.06);}
    if(id==='katana'){g.add(mesh(new THREE.BoxGeometry(.035,.85,.025),M(COL.ink,{roughness:.4})));g.add(mesh(new THREE.CylinderGeometry(.04,.04,.012,20),M(COL.gold,{metalness:.9}),[0,.43,0]));g.add(mesh(new THREE.BoxGeometry(.03,.2,.022),M(COL.rust),[0,.54,0]));g.add(mesh(new THREE.BoxGeometry(.006,.83,.03),GLOW(COL.mag),[.018,0,0]));g.position.set(A.backC[0],A.backC[1]+.05,A.backC[2]-.04);g.rotation.z=.65;}
    if(id==='rifle'){g.add(mesh(new THREE.BoxGeometry(.045,.95,.05),M(COL.steel,{metalness:.8,roughness:.35})));g.add(mesh(new THREE.BoxGeometry(.06,.28,.07),M(COL.wood),[0,-.38,0]));g.add(mesh(new THREE.CylinderGeometry(.022,.022,.2,16),M(COL.ink),[0,.12,-.05]));g.add(mesh(new THREE.CircleGeometry(.02,16),GLOW(COL.teal),[0,.22,-.05],[-Math.PI/2,0,0]));g.position.set(A.backC[0],A.backC[1]+.05,A.backC[2]-.05);g.rotation.z=-.6;}
    if(id==='datapack'){g.add(mesh(new THREE.BoxGeometry(.28,.32,.12),M(COL.ink,{roughness:.5})));g.add(mesh(new THREE.BoxGeometry(.2,.02,.005),GLOW(COL.teal),[0,.06,-.062]));g.add(mesh(new THREE.BoxGeometry(.2,.02,.005),GLOW(COL.teal),[0,0,-.062]));g.add(mesh(new THREE.BoxGeometry(.08,.08,.03),M(COL.rust),[0,-.09,-.07]));g.position.set(A.backC[0],A.backC[1],A.backC[2]-.07);}
  }
  if(slot==='shoulder'&&id!=='none'){
    if(id==='pauldron'){const p=mesh(new THREE.SphereGeometry(.11,24,16,0,Math.PI*2,0,Math.PI/2),M(COL.rust,{metalness:.6,roughness:.45}));p.scale.set(1,.7,1.1);g.add(p);g.add(mesh(new THREE.TorusGeometry(.105,.008,8,32),M(COL.gold,{metalness:.9}),[0,.005,0],[Math.PI/2,0,0]));g.rotation.z=.5;}
    if(id==='shield'){g.add(mesh(new THREE.TorusGeometry(.09,.012,10,32),M(COL.steel,{metalness:.9}),[0,0,0],[0,Math.PI/2,0]));g.add(mesh(new THREE.CircleGeometry(.085,32),Object.assign(GLOW(COL.teal),{transparent:true,opacity:.55,side:THREE.DoubleSide}),[0,0,0],[0,Math.PI/2,0]));g.position.x=-.06;}
    g.position.add(new THREE.Vector3(...A.shL));
  }
  if(slot==='cyber'&&id!=='none'){
    if(id==='eye'){g.add(mesh(new THREE.SphereGeometry(.022,16,12),GLOW(COL.teal),A.face));g.add(mesh(new THREE.TorusGeometry(.028,.005,8,20),M(COL.steel,{metalness:.9}),A.face));}
    if(id==='halo'){const h=mesh(new THREE.TorusGeometry(.16,.012,10,48),GLOW(COL.gold),[A.head[0],2.02,0],[Math.PI/2,0,0]);h.userData.spin=true;g.add(h);}
    if(id==='spine')for(let i=0;i<6;i++)g.add(mesh(new THREE.SphereGeometry(.016,12,10),GLOW(COL.mag),[.0,1.5-i*.08,-.19+i*.005]));
  }
  if(slot==='base'){
    const top=M(COL.ink,{roughness:.6}),edge=M(COL.rust,{roughness:.5});
    if(id==='round'){g.add(mesh(new THREE.CylinderGeometry(.5,.52,.06,48),top));g.add(mesh(new THREE.TorusGeometry(.51,.012,8,64),edge,[0,0,0],[Math.PI/2,0,0]));}
    if(id==='hex'||id==='hexneon'){g.add(mesh(new THREE.CylinderGeometry(.52,.54,.06,6),top));g.add(mesh(new THREE.CylinderGeometry(.545,.545,.02,6,1,true),edge,[0,-.02,0]));if(id==='hexneon')g.add(mesh(new THREE.TorusGeometry(.47,.01,8,6),GLOW(COL.teal),[0,.032,0],[Math.PI/2,0,Math.PI/6]));}
    if(id==='rock'){const r=mesh(new THREE.DodecahedronGeometry(.5,1),M(0x8a4a2a,{roughness:.95,flatShading:true}));r.scale.set(1.05,.14,.95);g.add(r);g.add(mesh(new THREE.DodecahedronGeometry(.12,0),M(0x6f3a20,{roughness:1,flatShading:true}),[.34,.06,.2]));}
    g.position.y=-.03;
  }
  return g;
}
const parts={};let model=null,mats=[];
const TINT={orig:0xffffff,bone:0xf6ead0,rust:0xf0a585,ink:0x8f9cad,chrome:0xb4fff6};
apply=function(){
  if(!model)return;
  for(const s of SLOTS){if(parts[s.id])rig.remove(parts[s.id]);if(s.id==='outfit')continue;parts[s.id]=build(s.id,cur[s.id]);rig.add(parts[s.id]);}
  for(const m of mats){m.color.setHex(TINT[cur.outfit]);m.emissive.setHex(cur.outfit==='chrome'?0x003833:0);m.metalness=cur.outfit==='chrome'?.55:m.userData.met;}
}
/* ---------- kamera ---------- */
let yaw=0,tYaw=0,pitch=.12,dist=5.2,tDist=5.2,lookY=.95,tLookY=.95,spin=true;
focusCam=function(c){spin=false;$('#lo-spin').classList.remove('on-t');$('#lo-spin').setAttribute('aria-pressed','false');
  const n=((yaw%(2*Math.PI))+2*Math.PI)%(2*Math.PI);yaw=n;
  if(c==='head'){tYaw=.35;tDist=2.2;tLookY=1.68;}else if(c==='back'){tYaw=Math.PI+.4;tDist=3.6;tLookY=1.15;}else{tYaw=.35;tDist=5.2;tLookY=.95;}}
document.querySelectorAll('#lo-cam [data-cam]').forEach(b=>b.addEventListener('click',()=>focusCam(b.dataset.cam)));
$('#lo-spin').addEventListener('click',()=>{spin=!spin;$('#lo-spin').classList.toggle('on-t',spin);$('#lo-spin').setAttribute('aria-pressed',spin);});
const cv=renderer.domElement,ptrs=new Map();let pinch=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size===1){spin=false;$('#lo-spin').classList.remove('on-t');}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;
  if(ptrs.size===1){yaw-=(e.clientX-p.x)*.01;tYaw=yaw;pitch=Math.max(-.2,Math.min(.6,pitch+(e.clientY-p.y)*.005));}
  p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)tDist=Math.max(1.6,Math.min(8,tDist*pinch/d));pinch=d;}});
const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=0;};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{e.preventDefault();tDist=Math.max(1.6,Math.min(8,tDist*(1+e.deltaY*.001)));},{passive:false});
new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}).observe(view);
/* ---------- model ---------- */
const loader=new THREE.GLTFLoader();
function load(){
  if(!window.GN_EMBED||!GN_EMBED.outlaw){const sc=document.createElement('script');sc.src='m-outlaw.js';sc.onload=load;sc.onerror=()=>{$('#lo-load').textContent='Miniature failed to load.';};document.head.appendChild(sc);return;}
  loader.load('data:model/gltf-binary;base64,'+GN_EMBED.outlaw,gl=>{
    model=gl.scene;model.traverse(n=>{if(n.isMesh){const m=n.material;m.userData.met=m.metalness;mats.push(m);}});
    rig.add(model);$('#lo-load').remove();apply();
  },undefined,()=>{$('#lo-load').textContent='Miniature failed to load.';});
}
load();
let t0=performance.now();
function loop(t){
  const dt=Math.min(.05,(t-t0)/1000);t0=t;
  if(spin){yaw+=dt*.5;tYaw=yaw;}else yaw+=(tYaw-yaw)*.12;
  dist+=(tDist-dist)*.12;lookY+=(tLookY-lookY)*.12;
  cam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,lookY+Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);cam.lookAt(0,lookY,0);
  rig.traverse(o=>{if(o.userData.spin)o.rotation.z+=dt*.8;});
  renderer.render(scene,cam);if(visible)requestAnimationFrame(loop);
}
GN.loStart=()=>{t0=performance.now();requestAnimationFrame(loop);};GN.loStart();
}

GN.loadoutSet=(slotId,id)=>{cur[slotId]=id;try{localStorage.setItem('gn-loadout',JSON.stringify(cur));}catch(e){}renderUI();apply();};
GN.register('loadout',{show(){visible=true;if(!started)init3d();else if(GN.loStart)GN.loStart();},hide(){visible=false;}});
}

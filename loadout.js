/* 3D Loadout: Pistolwhisker with attachments */
{
const $=GN.$;
let apply=()=>{},focusCam=()=>{};
const view=$('#lo-view');
/* Equipped gear is shown as symbols over the miniature; the uploaded model is never changed. */
const toast=GN.toast,esc=GN.esc;
let curHero=null;
const badges=document.createElement('div');badges.id='lo-badges';view.appendChild(badges);
function badge(id){const B=GN.gear,i=B.byId(id);if(!i)return'';return `<button class="lb" data-i="${id}" style="border-color:${B.RC[i.r]}" title="${esc(i.n)}" aria-label="${esc(i.n)}">${B.sym(id,22)}</button>`;}
function group(label,ids,max){if(!ids.length&&!max)return'';const empty=max?Math.max(0,max-ids.length):0;
  return `<div class="lg"><span>${label}</span><div>${ids.map(badge).join('')}${'<i class="lb lb-e" aria-hidden="true"></i>'.repeat(empty)}</div></div>`;}
function renderBadges(){const h=curHero;if(!h||!GN.gear){badges.innerHTML='';return;}const g=h.gear||GN.gear.HG(),B=GN.gear;
  const loot=['aicore','star','lucky','ghostcoat','compass','ledger','fang','keycard'].filter(id=>B.owned(id)&&B.byId(id));
  badges.innerHTML=group('Weapon',g.weapon?[g.weapon]:[],1)+group('Implants',g.cyber,3)+group('Pack',g.pack,0)+(loot.length?`<div class="lg"><span>Loot</span><div>${loot.slice(0,3).map(badge).join('')}${loot.length>3?`<button class="lb lb-more" data-more="1" aria-label="All loot">+${loot.length-3}</button>`:''}</div></div>`:'');}
badges.addEventListener('click',e=>{
  if(e.target.closest('[data-more]')){const B=GN.gear,loot=['aicore','star','lucky','ghostcoat','compass','ledger','fang','keycard'].filter(id=>B.owned(id)&&B.byId(id));
    GN.modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Loot · always active</h2><div class="list">${loot.map(id=>{const i=B.byId(id);return `<div><span class="lb" style="border-color:${B.RC[i.r]}">${B.sym(id,22)}</span><div style="flex:1"><b>${esc(i.n)}</b><div class="sub">${esc(i.fx)}</div></div></div>`;}).join('')}</div><button class="b-gold" data-close>Close</button>`);return;}
  const b=e.target.closest('[data-i]');if(!b)return;const i=GN.gear.byId(b.dataset.i);
  GN.modal(`<div style="display:flex;gap:12px;align-items:center"><span class="lb" style="border-color:${GN.gear.RC[i.r]};width:52px;height:52px">${GN.gear.sym(i.id,34)}</span><div><h2 id="md-t" class="cond" style="margin:0">${esc(i.n)}</h2><div class="sub" style="text-transform:capitalize">${i.r} · ${{weapon:'Weapon'+(i.wt?' · '+i.wt:''),cyber:'Cyberware'+(i.load?' · load '+i.load:''),consumable:'Consumable',loot:'Loot · passive'}[i.t]}</div></div></div>
  ${i.st?`<div class="g2" style="font-size:14px">${i.st.map(([k,v])=>`<div><span class="sub">${esc(k)}</span> <b>${esc(v)}</b></div>`).join('')}</div>`:''}<p style="margin:0">${esc(i.fx||'')}</p><div class="g2"><a class="btn b-out" href="#gear" data-close>Open in Gear</a><button class="b-gold" data-close>Close</button></div>`);});
GN.loSync=h=>{curHero=h;renderBadges();if(GN.loChar)GN.loChar(h.model);};

let started=false,visible=false;
function init3d(){started=true;
if(!window.THREE||!THREE.GLTFLoader){$('#lo-load').textContent='3D library did not load. Refresh the page.';return;}

/* ---------- scena ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
view.prepend(renderer.domElement);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(32,1,.05,50);
scene.add(new THREE.HemisphereLight(0xfff1d8,0x2a1b2c,.9));
const key=new THREE.DirectionalLight(0xffe8c8,1.6);key.position.set(2,4,3);scene.add(key);
const rimT=new THREE.PointLight(0x32d6d0,2.2,8);rimT.position.set(-2,2,-1.5);scene.add(rimT);
const rimM=new THREE.PointLight(0xff5d5b,1.6,8);rimM.position.set(2,1.2,-2);scene.add(rimM);
const floor=new THREE.Mesh(new THREE.CircleGeometry(3,64),new THREE.MeshStandardMaterial({color:0x1b1119,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.06;scene.add(floor);
const rig=new THREE.Group();scene.add(rig);
const M=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.25},o));
const GLOW=c=>new THREE.MeshStandardMaterial({color:0x000000,emissive:c,emissiveIntensity:1.6,roughness:.4});
const COL={bone:0xf1e9db,rust:0xB95632,teal:0x32d6d0,gold:0xc6a15b,ink:0x241923,mag:0xff5d5b,leather:0x5a3420,steel:0x8d949e,wood:0x6b4428};
const mesh=(g,m,p,r)=>{const o=new THREE.Mesh(g,m);if(p)o.position.set(...p);if(r)o.rotation.set(...r);return o;};
// sidra za Pistolwhisker (izmjereno iz modela, stopala na y=0, lice prema +Z)
const CHARS={
 outlaw:{name:'Pistolwhisker',cls:'Gunslinger',head:[.05,1.74,0],hatY:1.8,face:[.1,1.75,.12],backC:[.0,1.22,-.2],hipL:[-.21,.97,.04],hipR:[.21,.97,.04],shL:[-.22,1.41,-.01],belt:[.02,1.0,.02,1.1,.95],halo:2.02,spine:[0,1.5,-.19]},
 vigilante:{name:'Vigilante',cls:'Gunslinger',head:[.07,1.69,-.03],hatY:1.8,face:[.11,1.72,.1],backC:[.06,1.28,-.3],hipL:[-.18,.97,0],hipR:[.38,.97,0],shL:[.3,1.44,0],belt:[.12,1.0,-.02,1.45,1.05],halo:2.04,spine:[.06,1.55,-.27]}};
let charId=null,want=(GN.hero&&GN.hero.active()&&GN.hero.active().model)||GN.store.get('char','outlaw'),loadErr=false;
GN.chars.on(()=>{if(want&&want!==charId&&GN.chars.exists(want))GN.loChar(want);});
let model=null;
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
const scenes={},anc={};
function load(){
  const id=charId;const l0=$('#lo-load');
  const use=sc=>{if(id!==charId)return;if(model)rig.remove(model);model=sc;
    rig.add(model);const l=$('#lo-load');if(l)l.hidden=true;};
  if(scenes[id]){use(scenes[id]);return;}
  if(l0){l0.hidden=false;l0.textContent='Loading miniature…';}
  GN.chars.buffer(id).then(GN.chars.parse).then(sc=>{
    if(CHARS[id])anc[id]=CHARS[id];else{GN.chars.normalise(sc);const w=new THREE.Group();w.add(sc);anc[id]=GN.chars.anchors(w);sc=w;}
    scenes[id]=sc;use(sc);
  }).catch(err=>{if(id!==charId)return;loadErr=true;msg(`This miniature could not be loaded${err&&err.message?': '+GN.esc(String(err.message).slice(0,120)):''}.`,true);});
  setTimeout(()=>{if(id===charId&&!scenes[id]&&!loadErr){const l=$('#lo-load');if(l&&!l.hidden)l.textContent='Still loading… big models take longer on phones.';}},15000);
}
function msg(t,retry){const l=$('#lo-load');if(!l)return;l.hidden=false;l.innerHTML=`<div>${t}</div><div class="row" style="justify-content:center;margin-top:10px">${retry?'<button id="lo-retry">Try again</button>':''}<button class="b-gold" id="lo-pick">Choose a miniature</button></div>`;
  const r=l.querySelector('#lo-retry');if(r)r.onclick=()=>{loadErr=false;delete scenes[charId];l.textContent='Loading miniature…';load();};
  l.querySelector('#lo-pick').onclick=pickMini;}
function pickMini(){const h=GN.hero.active();GN.modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Miniature for ${GN.esc(h.name)}</h2><div class="col" style="gap:6px;max-height:50vh;overflow:auto">${GN.chars.list().map(m=>`<button data-pm="${GN.esc(m.id)}" class="${m.id===h.model?'on-t':''}" style="justify-content:flex-start">${GN.esc(m.name)}${m.builtin?'':' ★'}</button>`).join('')}</div><label class="btn filebtn b-out">Upload a .glb<input id="pm-up" type="file" accept=".glb,model/gltf-binary"></label><p class="sub" id="pm-err" style="margin:0;color:var(--magl)"></p><button data-close>Cancel</button>`,(c,close)=>{
  c.addEventListener('click',e=>{const b=e.target.closest('[data-pm]');if(!b)return;h.model=b.dataset.pm;GN.hero.save();close();loadErr=false;charId=null;GN.loChar(h.model);GN.toast('Miniature changed.');});
  c.querySelector('#pm-up').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const r=await GN.chars.add(f,f.name.replace(/\.glb$/i,'').replace(/[_-]+/g,' ').slice(0,32),h.cls);h.model=r.id;GN.hero.save();close();charId=null;GN.loChar(r.id);GN.toast('Miniature uploaded.');}catch(err){c.querySelector('#pm-err').textContent=err.message;}});});}
GN.loChar=id=>{want=id;if(id===charId&&!loadErr)return;const l=$('#lo-load');if(l&&!scenes[id]){l.hidden=false;l.textContent='Loading miniature…';}
  GN.chars.ready.then(()=>{if(want!==id)return;
    if(!GN.chars.exists(id)){charId=null;if(model){rig.remove(model);model=null;}msg('This character\'s miniature is no longer on this device (uploads stay only in the browser where you added them).',false);return;}
    if(id===charId&&!loadErr)return;charId=id;loadErr=false;GN.store.set('char',id);load();});};
GN.loChar(want);
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

const CLS={gunslinger:'Gunslinger',brawler:'Brawler',tech:'Tech-Slinger',ghost:'Ghost',sniper:'Sniper'};
function renderChars(){const el=$('#lo-chars');if(!el||!GN.hero)return;const a=GN.hero.active();
  el.innerHTML=GN.hero.list().map(h=>`<button data-hid="${GN.esc(h.id)}" class="${h.id===a.id?'on-t':''}" aria-pressed="${h.id===a.id}">${GN.classIcon(h.cls,18)} ${GN.esc(h.name)}</button>`).join('')+'<a class="btn b-gold" href="#hero">+ New</a>';}
GN.chars.on(renderChars);setTimeout(renderChars,0);if(GN.hero)GN.hero.on(renderChars);
{const lc=$('#lo-chars');if(lc)lc.addEventListener('click',e=>{const b=e.target.closest('[data-hid]');if(!b)return;GN.hero.setActive(b.dataset.hid);renderChars();});}
function uploadDialog(){
  GN.modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Upload your character</h2>
  <p class="sub" style="margin:0">A .glb file (binary glTF 2.0), standing upright and facing forward (+Z), up to ${GN.chars.MAXMB} MB. Best on phones: under 60k triangles and 2K textures. It stays on this device.</p>
  <label class="btn filebtn" style="width:100%">Choose .glb file<input id="up-f" type="file" accept=".glb,model/gltf-binary"></label>
  <span class="sub" id="up-n">No file chosen</span>
  <label class="r">Name <input id="up-name" maxlength="32" style="flex:1;min-height:42px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--bone);padding:0 10px;font:inherit"></label>
  <label class="r">Class <select id="up-cls">${Object.entries(CLS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
  <p class="sub" id="up-err" style="margin:0;color:var(--magl)"></p>
  <div class="g2"><button data-close>Cancel</button><button class="b-gold" id="up-ok" disabled>Add character</button></div>`,(c,close)=>{
    const f=c.querySelector('#up-f'),ok=c.querySelector('#up-ok');let file=null;
    f.addEventListener('change',()=>{file=f.files[0]||null;c.querySelector('#up-n').textContent=file?`${file.name} · ${(file.size/1e6).toFixed(1)} MB`:'No file chosen';if(file&&!c.querySelector('#up-name').value)c.querySelector('#up-name').value=file.name.replace(/\.glb$/i,'').replace(/[_-]+/g,' ').slice(0,32);ok.disabled=!file;});
    ok.addEventListener('click',async()=>{ok.disabled=true;ok.textContent='Adding…';c.querySelector('#up-err').textContent='';
      try{const r=await GN.chars.add(file,c.querySelector('#up-name').value.trim(),c.querySelector('#up-cls').value);
        close();renderChars();
        GN.toast(r.saved?'Character added and saved on this device.':'Character added for this visit (this browser blocks saving).');
        if(file.size>15e6)setTimeout(()=>GN.toast('Heavy model: it may be slow on phones. Aim for under 60k triangles.'),3000);
      }catch(err){c.querySelector('#up-err').textContent=err.message||'Upload failed.';ok.disabled=false;ok.textContent='Add character';}});
  });
}
function manage(){
  const all=GN.chars.list(),hc=GN.chars.hiddenCount(),one=all.length<=1;
  GN.modal(`<h2 id="md-t" class="cond" style="color:var(--gold)">Manage characters</h2>
   <p class="sub" style="margin:0">Remove the ones you don't need. Uploaded characters are deleted from this device; built-in miniatures are only hidden and can be restored.</p>
   <div class="list" id="mg-list">${all.map(c=>`<div><span class="av" style="background:var(--panel2);color:var(--gold)">${GN.esc(c.name.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><div style="flex:1"><b>${GN.esc(c.name)}</b><div class="sub">${c.builtin?'Built-in':'Uploaded'+(c.size?` · ${(c.size/1e6).toFixed(1)} MB`:'')} · ${CLS[c.cls]||c.cls}</div></div><button class="b-gold" data-rm="${GN.esc(c.id)}" ${one?'disabled':''} style="min-height:40px">Remove</button></div>`).join('')}</div>
   ${one?'<p class="sub" style="margin:0">Keep at least one character.</p>':''}
   <div class="g2">${hc?`<button class="b-out" id="mg-restore">Restore built-in (${hc})</button>`:'<span></span>'}<button data-close>Done</button></div>`,(m,close)=>{
    m.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click',()=>{const c=GN.chars.get(b.dataset.rm);if(!c)return;
      const yes=m.querySelector('#mg-yes');if(yes&&yes.dataset.id===c.id){return;}
      b.outerHTML=`<span style="display:flex;gap:6px"><button data-no style="min-height:40px">Keep</button><button class="b-gold" id="mg-yes" data-id="${GN.esc(c.id)}" style="min-height:40px">${c.builtin?'Hide':'Delete'}</button></span>`;
      m.querySelector('[data-no]').addEventListener('click',()=>{close();manage();});
      m.querySelector('#mg-yes').addEventListener('click',async()=>{try{await GN.chars.remove(c.id);close();renderChars();if(GN.loChar&&GN.hero)GN.loChar(GN.hero.active().model);GN.toast(c.builtin?`${c.name} hidden. Restore it any time.`:`${c.name} deleted.`);manage();}catch(err){GN.toast(err.message);}});}));
    const r=m.querySelector('#mg-restore');if(r)r.addEventListener('click',()=>{GN.chars.restore();close();renderChars();GN.toast('Built-in miniatures restored.');manage();});
  });
}
$('#lo-del').addEventListener('click',manage);
GN.loShow=()=>{const was=visible;visible=true;if(!started)init3d();else if(!was&&GN.loStart)GN.loStart();};
GN.loHide=()=>{visible=false;};
}

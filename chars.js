/* Character registry: built-in miniatures + characters the player uploads (.glb), kept on this device */
(function(){
const BUILTIN=[
 {id:'outlaw',name:'Pistolwhisker',cls:'gunslinger',builtin:true},
 {id:'vigilante',name:'Vigilante',cls:'gunslinger',builtin:true},
 {id:'sentinel',name:'Copper Sentinel',cls:'brawler',builtin:true}];
const MAXMB=40;let custom=[];const subs=[];
/* ---- IndexedDB (may be unavailable: then uploads live for this visit only) ---- */
let dbp=null;const mem={};
function db(){if(dbp)return dbp;dbp=new Promise((res)=>{try{const r=indexedDB.open('gn-chars',1);r.onupgradeneeded=()=>r.result.createObjectStore('chars',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);}catch(e){res(null);}});return dbp;}
function tx(mode,fn){return db().then(d=>new Promise(res=>{if(!d){res(null);return;}try{const t=d.transaction('chars',mode),s=t.objectStore('chars');const q=fn(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>res(null);}catch(e){res(null);}}));}
async function loadList(){const all=await tx('readonly',s=>s.getAll());custom=(all||[]).map(c=>({id:c.id,name:c.name,cls:c.cls,builtin:false,size:c.size}));emit();}
function emit(){subs.forEach(f=>{try{f();}catch(e){}});}
function b64ToBuf(b64){const bin=atob(b64),n=bin.length,u=new Uint8Array(n);for(let i=0;i<n;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function embed(id){return new Promise((res,rej)=>{if(window.GN_EMBED&&GN_EMBED[id]){res(b64ToBuf(GN_EMBED[id]));return;}
  const sc=document.createElement('script');sc.src='m-'+id+'.js';sc.onload=()=>GN_EMBED&&GN_EMBED[id]?res(b64ToBuf(GN_EMBED[id])):rej(new Error('missing'));sc.onerror=rej;document.head.appendChild(sc);});}
const bufCache={};
async function buffer(id){
  if(bufCache[id])return bufCache[id];
  const b=BUILTIN.find(c=>c.id===id);
  if(b)return bufCache[id]=await embed(id);
  if(mem[id])return mem[id];
  const rec=await tx('readonly',s=>s.get(id));if(!rec)throw new Error('not found');return bufCache[id]=rec.data;
}
async function add(file,name,cls){
  if(!/\.glb$/i.test(file.name))throw new Error('Use a .glb file (binary glTF 2.0).');
  if(file.size>MAXMB*1e6)throw new Error(`File is ${(file.size/1e6).toFixed(0)} MB. Keep characters under ${MAXMB} MB.`);
  const data=await file.arrayBuffer();
  const magic=new Uint32Array(data,0,1)[0];if(magic!==0x46546C67)throw new Error('This is not a valid .glb file.');
  const id='u'+Date.now().toString(36);const rec={id,name:(name||file.name.replace(/\.glb$/i,'')).slice(0,32),cls,data,size:file.size,created:Date.now()};
  const ok=await tx('readwrite',s=>s.put(rec));
  if(ok===null){mem[id]=data;}
  custom.push({id,name:rec.name,cls,builtin:false,size:file.size});emit();return {id,saved:ok!==null};
}
const hidden=()=>GN.store.get('hiddenChars',[]);
async function remove(id){
  if(list().length<=1)throw new Error('Keep at least one character.');
  if(BUILTIN.some(c=>c.id===id)){const h=hidden();if(!h.includes(id))h.push(id);GN.store.set('hiddenChars',h);}
  else{await tx('readwrite',s=>s.delete(id));delete mem[id];delete bufCache[id];custom=custom.filter(c=>c.id!==id);}
  if(GN.store.get('char','outlaw')===id)GN.store.set('char',list()[0].id);
  emit();}
function restore(){GN.store.set('hiddenChars',[]);emit();}
function list(){const h=hidden();return BUILTIN.filter(c=>!h.includes(c.id)).concat(custom);}
function get(id){return list().find(c=>c.id===id);}
function first(){return list()[0].id;}
/* ---- shared model helpers ---- */
// Normalise any model: feet on y=0, body centred on its feet (not on an outstretched gun), height 1.9
function normalise(scene){
  scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(scene),h=box.max.y-box.min.y||1,s=1.9/h;
  scene.scale.multiplyScalar(s);scene.updateMatrixWorld(true);
  const pts=samplePoints(scene,20000);let minY=Infinity;for(const p of pts)minY=Math.min(minY,p[1]);
  const feet=pts.filter(p=>p[1]<minY+0.12);const xs=feet.map(p=>p[0]).sort((a,b)=>a-b),zs=feet.map(p=>p[2]).sort((a,b)=>a-b);
  const pc=(a,q)=>a.length?a[Math.floor((a.length-1)*q)]:0;
  const cx=(pc(xs,.03)+pc(xs,.97))/2,cz=(pc(zs,.03)+pc(zs,.97))/2;
  scene.position.x-=cx;scene.position.z-=cz;scene.position.y-=minY;scene.updateMatrixWorld(true);
}
function samplePoints(root,max){const out=[];const v=new THREE.Vector3();let total=0;
  root.traverse(n=>{if(n.isMesh&&n.geometry&&n.geometry.attributes.position)total+=n.geometry.attributes.position.count;});
  const step=Math.max(1,Math.floor(total/max));
  root.traverse(n=>{if(!(n.isMesh&&n.geometry&&n.geometry.attributes.position))return;const pa=n.geometry.attributes.position;
    for(let i=0;i<pa.count;i+=step){v.fromBufferAttribute(pa,i).applyMatrix4(n.matrixWorld);out.push([v.x,v.y,v.z]);}});
  return out;}
// Attachment anchors measured from the body (works for any upright character facing +Z)
function anchors(root){
  const P=samplePoints(root,20000),H=Math.max(...P.map(p=>p[1]));
  const band=(lo,hi)=>P.filter(p=>p[1]>lo*H&&p[1]<hi*H);
  const q=(arr,i,f)=>{const a=arr.map(p=>p[i]).sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*f)]:0;};
  const head=band(.86,.95),sh=band(.73,.78),hip=band(.49,.54),back=band(.62,.72),waist=band(.5,.55);
  const hx=q(head,0,.5),hz=q(head,2,.5),hy=.9*H;
  const hl=q(hip,0,.1),hr=q(hip,0,.9),wx=(q(waist,0,.1)+q(waist,0,.9))/2,wz=(q(waist,2,.1)+q(waist,2,.9))/2;
  const wrx=(q(waist,0,.9)-q(waist,0,.1))/2,wrz=(q(waist,2,.9)-q(waist,2,.1))/2;
  return{head:[hx,hy,hz],hatY:.96*H,face:[hx+.03,.91*H,q(head,2,.95)],backC:[q(back,0,.5),.67*H,q(back,2,.04)-.03],
    hipL:[hl,.51*H,wz],hipR:[hr,.51*H,wz],shL:[q(sh,0,.85),.755*H,q(sh,2,.5)],belt:[wx,.525*H,wz,Math.max(.8,wrx/.2),Math.max(.8,wrz/.2)],halo:1.07*H,spine:[hx,.82*H,q(back,2,.06)]};
}
function parse(buf){return new Promise((res,rej)=>new THREE.GLTFLoader().parse(buf.slice(0),'',g=>res(g.scene),rej));}
GN.chars={list,get,first,add,remove,restore,hiddenCount:()=>hidden().length,buffer,parse,normalise,anchors,on(f){subs.push(f);},MAXMB};
loadList();
})();

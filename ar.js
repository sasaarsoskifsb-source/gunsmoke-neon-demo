/* AR Playground: white A4 sheet tracking, miniature on the sheet, virtual dice */
(function(){
const {$,toast}=GN;
/* ---------- dice ---------- */
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const FACE={1:[0,0],6:[0,180],2:[0,-90],5:[0,90],3:[-90,0],4:[90,0]};
const tray=$('#ar-tray'),res=$('#ar-res');let n=3,spins=[];
const rnd=()=>{const a=new Uint32Array(1);let v;do{crypto.getRandomValues(a);v=a[0];}while(v>=4294967292);return 1+v%6;};
const face=k=>`<div class="face f${k}">${[1,2,3,4,5,6,7,8,9].map(i=>PIPS[k].includes(i)?'<i></i>':'<span></span>').join('')}</div>`;
function build(){tray.innerHTML=Array.from({length:n},()=>`<div class="die">${[1,2,3,4,5,6].map(face).join('')}</div>`).join('');spins=Array(n).fill(0).map(()=>[0,0]);}
function roll(){
  if(tray.children.length!==n)build();tray.hidden=false;
  const tg=+$('#ar-tgt').value,vals=[];
  [...tray.children].forEach((d,i)=>{const v=rnd();vals.push(v);d.classList.remove('hit');
    spins[i][0]+=720+360*Math.floor(Math.random()*2);spins[i][1]+=720+360*Math.floor(Math.random()*2);
    const[x,y]=FACE[v];d.style.transform=`rotateX(${spins[i][0]+x}deg) rotateY(${spins[i][1]+y}deg)`;
    setTimeout(()=>{if(tg&&v>=tg)d.classList.add('hit');},1000);});
  const sum=vals.reduce((a,b)=>a+b,0),hits=tg?vals.filter(v=>v>=tg).length:0;
  res.textContent='';setTimeout(()=>{res.innerHTML=`Roll: ${vals.join(', ')} · sum <b style="color:var(--gold)">${sum}</b>`+(tg?` · hits <b style="color:var(--gold)">${hits}</b> (${tg}+)`:'');},1000);
}
$('#ar-nd').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;n=+b.dataset.n;[...$('#ar-nd').children].forEach(x=>x.classList.toggle('on-t',x===b));build();tray.hidden=false;res.textContent='';});
$('#ar-roll').addEventListener('click',roll);tray.addEventListener('click',roll);

/* ---------- AR ---------- */
const stage=$('#ar-stage'),statusEl=$('#ar-status');
const st={src:null,srcW:0,srcH:0,pose:null,lost:0,model:GN.store.get('char','outlaw'),h:60,bs:300,board:GN.maps.selected(),rot:0,f:.75,grid:true,manual:null,video:null,corners:null,on:false,inited:false};
function say(t,cls){statusEl.hidden=false;statusEl.textContent=t;statusEl.className=cls||'';}
let renderer,scene,cam,paper,hex,shadow,baseRing,pivot,miniG,boardMesh,pickPlane,texCache={},loader,current=null,autoYaw=null,disp={},dc,dctx,cache={},lastDet=0,smooth=null,raf=0;
function init(){
  st.inited=true;
  if(!window.THREE||!THREE.GLTFLoader){$('#ar-empty').innerHTML='<div><b>3D library did not load</b>Refresh the page.</div>';return false;}
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputEncoding=THREE.sRGBEncoding;renderer.setClearColor(0,0);
  stage.insertBefore(renderer.domElement,statusEl);
  scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(50,1,5,5000);
  scene.add(new THREE.HemisphereLight(0xfff2e0,0x302040,1.0));
  const key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(200,-300,600);scene.add(key);
  paper=new THREE.Group();paper.matrixAutoUpdate=false;paper.visible=false;scene.add(paper);paper.add(key.target);
  paper.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-148.5,-105],[148.5,-105],[148.5,105],[-148.5,105],[-148.5,-105]].map(([x,y])=>new THREE.Vector3(x,y,.3))),new THREE.LineBasicMaterial({color:0xff5d5b})));
  const pts=[],R=17;
  for(let r=-4;r<=4;r++)for(let q=-6;q<=6;q++){const cx=R*Math.sqrt(3)*(q+(r&1)/2),cy=R*1.5*r;if(Math.abs(cx)>148.5-R*.87||Math.abs(cy)>105-R)continue;
    for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30),b=Math.PI/180*(60*i+30);pts.push(new THREE.Vector3(cx+R*Math.cos(a),cy+R*Math.sin(a),.25),new THREE.Vector3(cx+R*Math.cos(b),cy+R*Math.sin(b),.25));}}
  hex=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x32d6d0,transparent:true,opacity:.55}));paper.add(hex);
  boardMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,alphaTest:.04,depthWrite:false}));boardMesh.position.z=.15;boardMesh.renderOrder=-1;boardMesh.visible=false;paper.add(boardMesh);
  pickPlane=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}));paper.add(pickPlane);
  miniG=new THREE.Group();paper.add(miniG);
  shadow=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.35,depthWrite:false}));shadow.position.z=.4;miniG.add(shadow);
  baseRing=new THREE.Mesh(new THREE.RingGeometry(.92,1,48),new THREE.MeshBasicMaterial({color:0xc6a15b}));baseRing.position.z=.5;miniG.add(baseRing);
  pivot=new THREE.Group();miniG.add(pivot);loader=new THREE.GLTFLoader();
  dc=document.createElement('canvas');dctx=dc.getContext('2d',{willReadFrequently:true});
  new ResizeObserver(layout).observe(stage);bindInput();loadModel(st.model);setBoard(st.board);return true;
}
function renderPick(){const el=$('#ar-pick');el.innerHTML=GN.chars.list().map(c=>`<button data-m="${GN.esc(c.id)}" class="${c.id===st.model?'on-t':''}" aria-pressed="${c.id===st.model}">${GN.esc(c.name)}</button>`).join('');}
GN.chars.on(()=>{if(!GN.chars.get(st.model)){st.model=GN.chars.first();if(renderer)loadModel(st.model);}renderPick();});
function loadModel(k){
  if(!GN.chars.exists(k)){GN.chars.ready.then(()=>{if(GN.chars.exists(k))loadModel(k);else if(st.model==null||st.model===k)loadModel(GN.chars.first());});if(GN.chars.list().length&&!GN.chars.exists(k))k=GN.chars.first();}
  st.model=k;renderPick();
  if(!renderer)return;
  const use=g=>{if(st.model!==k)return;if(current)pivot.remove(current);current=g;pivot.add(g);fit();};
  if(cache[k]){use(cache[k]);return;}
  say('Loading miniature…','warn');
  GN.chars.buffer(k).then(GN.chars.parse).then(sc=>{
    GN.chars.normalise(sc);const m=new THREE.Group();m.add(sc);m.rotation.x=Math.PI/2;const o=new THREE.Group();o.add(m);o.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(m);o.userData.h=b.max.z-b.min.z||1.9;
    o.userData.r=.35;
    cache[k]=o;use(o);say(st.pose?'Sheet found':(st.src?'Looking for a white A4 sheet…':'Miniature ready. Show the sheet.'),st.pose?'ok':'warn');
  }).catch(()=>say('Miniature failed to load.','warn'));
}
function fit(){if(!current)return;const s=st.h/current.userData.h;current.scale.setScalar(s);const r=current.userData.r*s*1.05;shadow.scale.setScalar(r);baseRing.scale.setScalar(r*1.02);}
function setBoard(id){
  st.board=id;renderMaps();if(!renderer)return;
  miniG.position.set(0,0,0);
  if(id==='none'){boardMesh.visible=false;hex.visible=st.grid;return;}
  const m=GN.maps.get(id);hex.visible=false;
  const show=t=>{if(st.board!==id)return;boardMesh.material.map=t;boardMesh.material.needsUpdate=true;sizeBoard();boardMesh.visible=true;};
  if(texCache[id]){show(texCache[id]);return;}
  new THREE.TextureLoader().load(m.img,t=>{t.encoding=THREE.sRGBEncoding;t.anisotropy=4;texCache[id]=t;show(t);},undefined,()=>toast('Board image failed to load.'));
}
function sizeBoard(){const t=boardMesh.material.map;if(!t||!t.image)return;const a=t.image.height/t.image.width;boardMesh.scale.set(st.bs,st.bs*a,1);}
function renderMaps(){const el=$('#ar-maps');if(!el)return;el.innerHTML=GN.maps.list.map(m=>`<button data-b="${m.id}" class="${st.board===m.id?'on-t':''}" aria-pressed="${st.board===m.id}">${GN.esc(m.n)}</button>`).join('')+`<button data-b="none" class="${st.board==='none'?'on-t':''}" aria-pressed="${st.board==='none'}">Hex grid only</button>`;}
function applyPose(p){
  const F=[1,-1,-1],c=[p.r1,p.r2,p.r3,p.t],e=[];for(let i=0;i<3;i++)for(let j=0;j<4;j++)e.push(F[i]*c[j][i]);
  paper.matrix.set(e[0],e[1],e[2],e[3],e[4],e[5],e[6],e[7],e[8],e[9],e[10],e[11],0,0,0,1);paper.matrixWorldNeedsUpdate=true;paper.visible=true;
  if(autoYaw===null){const camL=new THREE.Vector3(0,0,0).applyMatrix4(new THREE.Matrix4().copy(paper.matrix).invert());autoYaw=Math.atan2(camL.x,-camL.y);}
  pivot.rotation.z=autoYaw+st.rot*Math.PI/180;
}
function layout(){
  if(!renderer)return;const W=stage.clientWidth,H=stage.clientHeight,sw=st.srcW||W,sh=st.srcH||H,s=Math.min(W/sw,H/sh);
  disp={w:Math.round(sw*s),h:Math.round(sh*s)};disp.x=Math.round((W-disp.w)/2);disp.y=Math.round((H-disp.h)/2);
  for(const el of [renderer.domElement,st.src]){if(!el)continue;Object.assign(el.style,{left:disp.x+'px',top:disp.y+'px',width:disp.w+'px',height:disp.h+'px'});}
  renderer.setSize(disp.w,disp.h,false);setCam();
}
function setCam(){if(!st.srcW)return;const f=st.f*Math.max(st.srcW,st.srcH);cam.fov=2*Math.atan(st.srcH/2/f)*180/Math.PI;cam.aspect=st.srcW/st.srcH;cam.updateProjectionMatrix();}
function detectOn(el,w,h,size){const W=size,H=Math.round(size*h/w);dc.width=W;dc.height=H;dctx.drawImage(el,0,0,W,H);const c=GNDetect.findPaper(dctx.getImageData(0,0,W,H).data,W,H);return c&&c.map(([x,y])=>[x*w/W,y*h/H]);}
const poseFrom=c=>GNDetect.paperPose(c,st.srcW,st.srcH,st.f);
function stopVideo(){if(st.video){st.video.srcObject&&st.video.srcObject.getTracks().forEach(t=>t.stop());st.video=null;$('#ar-cam').textContent='Live camera';}}
function setSource(el,w,h){
  if(st.src&&st.src!==el)st.src.remove();if(el!==st.video)stopVideo();
  stage.classList.remove('vtable');previewOn=false;
  st.src=el;st.srcW=w;st.srcH=h;stage.insertBefore(el,renderer.domElement);$('#ar-empty').hidden=true;autoYaw=null;st.pose=null;paper.visible=false;layout();
}
function usePose(c,label){st.corners=c;const p=c&&poseFrom(c);
  if(p){st.pose=p;st.lost=0;applyPose(p);say(label||'Sheet found','ok');}else{st.pose=null;paper.visible=false;say('Sheet not found. Try marking the corners by hand.','warn');}}
function liveStep(t){
  const v=st.video;if(!v||v.readyState<2||t-lastDet<70)return;lastDet=t;
  if(v.videoWidth!==st.srcW){st.srcW=v.videoWidth;st.srcH=v.videoHeight;layout();}
  const c=detectOn(v,st.srcW,st.srcH,320);
  if(c){smooth=(smooth&&c.every((p,i)=>Math.hypot(p[0]-smooth[i][0],p[1]-smooth[i][1])<st.srcW*.06))?smooth.map((p,i)=>[p[0]*.55+c[i][0]*.45,p[1]*.55+c[i][1]*.45]):c;
    const p=poseFrom(smooth);if(p){st.pose=p;st.lost=0;applyPose(p);say('Sheet found · tracking','ok');}}
  else if(st.pose&&++st.lost>8){st.pose=null;paper.visible=false;smooth=null;say('Looking for a white A4 sheet…','warn');}
}
const dots=[];
function startManual(){st.manual=[];paper.visible=false;dots.forEach(d=>d.remove());dots.length=0;say('Tap the 4 corners of the sheet, going around it.','warn');}
function bindInput(){
  const cv=renderer.domElement;let drag=null;
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,moved:false};cv.setPointerCapture(e.pointerId);});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>4)drag.moved=true;if(drag.moved&&st.pose&&!st.manual){st.rot=((st.rot+dx*.6+540)%360)-180;drag.x=e.clientX;$('#ar-rot').value=st.rot|0;$('#ar-rv').textContent=(st.rot|0)+'°';if(!st.video)applyPose(st.pose);}});
  const rc=new THREE.Raycaster(),nv=new THREE.Vector2();
  cv.addEventListener('pointerup',e=>{const d=drag;drag=null;if(!d||d.moved)return;
    if(!st.manual){if(!st.pose)return;const r=cv.getBoundingClientRect();nv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      paper.updateMatrixWorld(true);rc.setFromCamera(nv,cam);const hit=rc.intersectObject(pickPlane)[0];if(!hit)return;
      const p=paper.worldToLocal(hit.point.clone());if(tapHandler&&tapHandler(p))return;const hx=boardMesh.visible?boardMesh.scale.x/2*.92:148,hy=boardMesh.visible?boardMesh.scale.y/2*.92:105;
      miniG.position.set(Math.max(-hx,Math.min(hx,p.x)),Math.max(-hy,Math.min(hy,p.y)),0);say('Miniature moved','ok');return;}
    const r=cv.getBoundingClientRect(),sr=stage.getBoundingClientRect();st.manual.push([(e.clientX-r.left)/r.width*st.srcW,(e.clientY-r.top)/r.height*st.srcH]);
    const dot=document.createElement('div');dot.style.cssText=`position:absolute;z-index:4;width:14px;height:14px;margin:-7px;border-radius:50%;background:#ff5d5b;border:2px solid #fff;left:${e.clientX-sr.left}px;top:${e.clientY-sr.top}px;pointer-events:none`;stage.appendChild(dot);dots.push(dot);
    if(st.manual.length===4){const m=st.manual,cx=m.reduce((s,p)=>s+p[0],0)/4,cy=m.reduce((s,p)=>s+p[1],0)/4;m.sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));st.manual=null;setTimeout(()=>{dots.forEach(d=>d.remove());dots.length=0;},600);autoYaw=null;usePose(m,'Corners set');}
    else say(`Corner ${st.manual.length} of 4`,'warn');});
}
async function startCam(){
  if(!renderer&&!init())return;
  if(st.video){stopVideo();say('Camera stopped.','warn');return;}
  try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false});
    const v=document.createElement('video');v.playsInline=true;v.setAttribute('playsinline','');v.muted=true;v.srcObject=s;await v.play();
    setSource(v,v.videoWidth,v.videoHeight);st.video=v;smooth=null;$('#ar-cam').textContent='Stop camera';say('Looking for a white A4 sheet…','warn');
    $('#ar-again').hidden=true;
  }catch(e){camBlocked();toast(e&&e.name==='NotAllowedError'&&!framed?'Camera permission denied. Allow it in your browser settings and try again.':'Live camera is not available here. Use Snap photo.');}
}
$('#ar-cam').addEventListener('click',startCam);$('#ar-cam2').addEventListener('click',startCam);
function onPhoto(e){const f=e.target.files&&e.target.files[0];if(!f)return;if(!renderer&&!init())return;const img=new Image();
  img.onload=()=>{setSource(img,img.naturalWidth,img.naturalHeight);usePose(detectOn(img,img.naturalWidth,img.naturalHeight,480));$('#ar-again').hidden=false;};img.src=URL.createObjectURL(f);e.target.value='';}
['#ar-file','#ar-file2','#ar-file3'].forEach(id=>$(id).addEventListener('change',onPhoto));
/* inside Claude the page runs in a sandboxed frame without camera access */
const framed=(()=>{try{return window.self!==window.top;}catch(e){return true;}})();
const camOK=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)&&window.isSecureContext;
function camBlocked(){
  $('#ar-note').innerHTML='Live AR needs the app opened in your phone browser over HTTPS (Claude blocks the camera inside chats). Here, <b>Snap photo</b> uses your phone camera for each shot.';
  $('#ar-hint').textContent='Inside Claude: snap a photo with your phone camera. For live AR open the app in your browser over HTTPS.';
}
if(framed||!camOK){camBlocked();$('#ar-cam').classList.remove('b-teal');$('#ar-snapbtn').classList.add('b-gold');$('#ar-cam2').hidden=true;}
$('#ar-manual').addEventListener('click',()=>{
  if(!st.src){toast('Take a photo or start the camera first.');return;}
  if(st.video){const c=document.createElement('canvas');c.width=st.srcW;c.height=st.srcH;c.getContext('2d').drawImage(st.video,0,0);const img=new Image();img.onload=()=>{setSource(img,c.width,c.height);startManual();};img.src=c.toDataURL('image/jpeg',.9);return;}
  startManual();});
$('#ar-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(b)loadModel(b.dataset.m);});
$('#ar-h').addEventListener('input',e=>{st.h=+e.target.value;$('#ar-hv').textContent=st.h+' mm';if(renderer)fit();});
$('#ar-rot').addEventListener('input',e=>{st.rot=+e.target.value;$('#ar-rv').textContent=st.rot+'°';if(st.pose)applyPose(st.pose);});
$('#ar-fov').addEventListener('input',e=>{st.f=e.target.value/100;$('#ar-fv').textContent=st.f.toFixed(2);if(renderer){setCam();if(st.corners&&!st.video)usePose(st.corners);}});
$('#ar-grid').addEventListener('click',e=>{st.grid=!st.grid;if(hex)hex.visible=st.grid&&st.board==='none';e.currentTarget.classList.toggle('on-t',st.grid);});
$('#ar-maps').addEventListener('click',e=>{const b=e.target.closest('[data-b]');if(!b)return;if(b.dataset.b==='none')setBoard('none');else GN.maps.select(b.dataset.b,true);});
GN.maps.on(id=>setBoard(id));
$('#ar-bs').addEventListener('input',e=>{st.bs=+e.target.value;$('#ar-bv').textContent=st.bs+' mm';if(renderer)sizeBoard();});
$('#ar-face').addEventListener('click',()=>{autoYaw=null;st.rot=0;$('#ar-rot').value=0;$('#ar-rv').textContent='0°';if(st.pose)applyPose(st.pose);});
let tapHandler=null,previewOn=false;
function preview(){
  if(!renderer&&!init())return false;if(st.video)stopVideo();
  if(st.src){st.src.remove();st.src=null;}
  $('#ar-empty').hidden=true;stage.classList.add('vtable');st.srcW=stage.clientWidth||800;st.srcH=stage.clientHeight||600;layout();
  const ph=55*Math.PI/180,r1=[1,0,0],r2=[0,-Math.cos(ph),Math.sin(ph)],r3=[0,-Math.sin(ph),-Math.cos(ph)],t=[0,-15,400];
  st.pose={r1,r2,r3,t,faces:true};autoYaw=null;applyPose(st.pose);previewOn=true;say('Virtual table','ok');return true;}
GN.ar={ensure(){return renderer||init();},paper:()=>paper,miniG:()=>miniG,hex:()=>hex,
  board(){return boardMesh&&boardMesh.visible?{w:boardMesh.scale.x,h:boardMesh.scale.y}:{w:297,h:210};},
  onTap(f){tapHandler=f;},setHeight(mm){st.h=mm;$('#ar-h').value=mm;$('#ar-hv').textContent=mm+' mm';fit();},
  hasPose:()=>!!st.pose,preview,setModel(k){loadModel(k);},faceYaw(rad){autoYaw=0;st.rot=rad*180/Math.PI;if(st.pose)applyPose(st.pose);}};
function loop(t){if(!st.on)return;liveStep(t);renderer.render(scene,cam);raf=requestAnimationFrame(loop);}
renderPick();renderMaps();
GN.register('ar',{show(){if(!st.inited&&!init())return;if(!renderer)return;st.on=true;layout();raf=requestAnimationFrame(loop);
  if(!framed&&camOK&&!st.video&&!st.src&&navigator.permissions)navigator.permissions.query({name:'camera'}).then(p=>{if(p.state==='granted'&&st.on&&!st.video)startCam();}).catch(()=>{});},hide(){st.on=false;cancelAnimationFrame(raf);stopVideo();}});
})();

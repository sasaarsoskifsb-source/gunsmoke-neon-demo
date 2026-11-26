/* Live Match: bots play a 2 v 2 Zone War by the v1.1 rules, spectated */
(function(){
const {$,esc}=GN;
const SQ=Math.sqrt(3),R=22,COLS=11,ROWS=8,MAXR=8,WIN=6;
const DIRS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const K=(q,r)=>q+','+r,ax=(c,r)=>[c-((r-(r&1))/2),r];
const tiles=new Map();
const off=a=>new Set(a.map(([c,r])=>K(...ax(c,r))));
const WALLS=off([[3,1],[3,2],[7,5],[7,6],[5,4]]),CRATES=off([[2,4],[4,6],[6,1],[8,3],[5,2],[1,6],[9,6]]);
const CPS=[ax(5,3),ax(1,2),ax(9,5)].map(([q,r])=>K(q,r));
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const[q]=ax(c,r),k=K(q,r);tiles.set(k,{q,r,k,x:SQ*R*(c+.5*(r&1))+R*SQ/2+4,y:1.5*R*r+R+4,type:WALLS.has(k)?'wall':CRATES.has(k)?'crate':'floor'});}
const W=SQ*R*(COLS+.5)+8,H=1.5*R*(ROWS-1)+2*R+8;
const dist=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
const d6=()=>1+Math.floor(Math.random()*6),rollN=n=>Array.from({length:n},d6),hit=(v,t)=>v===6||(v!==1&&v>=t);
const pips=(a,t)=>a.map(v=>`<span class="pip ${hit(v,t)?'h':''}">${v}</span>`).join('');
function cubeRound(fx,fz){const fy=-fx-fz;let rx=Math.round(fx),ry=Math.round(fy),rz=Math.round(fz);const dx=Math.abs(rx-fx),dy=Math.abs(ry-fy),dz=Math.abs(rz-fz);if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;return K(rx,rz);}
function line(a,b,e){const N=dist(a,b),o=[];for(let i=0;i<=N;i++){const t=N?i/N:0;o.push(cubeRound(a.q+1e-6*e+(b.q-a.q)*t,a.r+2e-6*e+(b.r-a.r)*t));}return o;}
const ROSTER=[
 {id:'NK',name:'Neon Kid',cls:'Tech-Slinger',team:0,hp:6,w:'sg',start:[0,1]},
 {id:'IJ',name:'Iron Jackal',cls:'Brawler',team:0,hp:9,w:'kat',start:[0,5]},
 {id:'DW',name:'Dust Widow',cls:'Sniper',team:1,hp:6,w:'snp',start:[10,1]},
 {id:'RJ',name:'Rust Jack',cls:'Gunslinger',team:1,hp:7,w:'rev',start:[10,6]}];
const TC=['#32d6d0','#ff5d5b'],TN=['Corporation','Shadow Syndicate'];
let U=[],round=0,order=[],oi=0,score=[0,0],over=false,playing=true,speed=1,timer=0,visible=false,lastFx=null,viewers=12;
const tile=u=>tiles.get(u.k),unitAt=k=>U.find(u=>u.k===k&&(u.state==='ok'||u.state==='down'));
function sight(a,b){const res=[1,-1].map(e=>{const L=line(a,b,e);return{blocked:L.slice(1,-1).some(k=>{const t=tiles.get(k);return!t||t.type==='wall';}),pre:L.length>2?L[L.length-2]:null};});
  if(res[0].blocked&&res[1].blocked)return null;if(res[0].blocked||res[1].blocked)return{cover:2,l:'heavy cover'};
  return res.some(o=>{const t=o.pre&&tiles.get(o.pre);return t&&(t.type==='crate'||unitAt(o.pre));})?{cover:1,l:'light cover'}:{cover:0,l:'no cover'};}
function prof(u,d,moved){
  if(u.w==='rev'&&d>=1&&d<=6)return{n:'Revolver',dice:3,t:d<=4?4:5,dmg:1,fire:1};
  if(u.w==='snp'&&d>=4&&d<=8)return{n:moved?'Sniper':'Sniper, aimed',dice:2,t:moved?4:3,dmg:2,fire:1};
  if(u.w==='kat'&&d===1)return{n:'Katana',dice:2,t:3,dmg:2,fire:0};
  if(u.w==='sg'&&d>=1&&d<=3)return{n:'Shotgun',dice:3,t:d===3?5:4,dmg:d===1?2:1,fire:1};
  if(d===1)return{n:'Strike',dice:1,t:4,dmg:1,fire:0};return null;}
function reach(u,n){const seen=new Map([[u.k,0]]),q=[u.k];while(q.length){const k=q.shift(),c=seen.get(k);if(c>=n)continue;const t=tiles.get(k);
  for(const[dq,dr]of DIRS){const nk=K(t.q+dq,t.r+dr),nt=tiles.get(nk);if(!nt||seen.has(nk)||nt.type!=='floor'||unitAt(nk))continue;seen.set(nk,c+1);q.push(nk);}}return seen;}
function feed(html){const li=document.createElement('li');li.innerHTML=`<div class="sub" style="font-size:12px">${round?'Round '+round:'Match start'}</div>${html}`;const f=$('#lv-feed');f.prepend(li);while(f.children.length>40)f.lastChild.remove();}
function newMatch(){
  U=ROSTER.map(r=>{const[q,rr]=ax(...r.start);return Object.assign({},r,{k:K(q,rr),max:r.hp,state:'ok',react:true,down:0});});
  round=0;score=[0,0];over=false;lastFx=null;$('#lv-feed').innerHTML='';
  feed('<b>Zone War: Drone Hub.</b> Hold the 3 control points. First team to 6 points, or most points after 8 rounds.');nextRound();draw();
}
function nextRound(){
  round++;if(round>MAXR){end();return;}
  const live=U.filter(u=>u.state==='ok');live.forEach(u=>{u.init=d6()+Math.random()/10;u.react=true;});
  order=live.sort((a,b)=>b.init-a.init);oi=0;
  feed('Initiative: '+order.map(u=>`${esc(u.name)} ${Math.floor(u.init)}`).join(' · '));
}
function endRound(){
  const gained=[0,0];
  for(const cp of CPS){const t=tiles.get(cp),c=[0,0];U.forEach(u=>{if(u.state==='ok'&&dist(tile(u),t)<=1)c[u.team]++;});if(c[0]!==c[1])gained[c[0]>c[1]?0:1]++;}
  score[0]+=gained[0];score[1]+=gained[1];
  if(gained[0]||gained[1])feed(`End of round: control points give <b style="color:${TC[0]}">+${gained[0]}</b> Corporation, <b style="color:${TC[1]}">+${gained[1]}</b> Syndicate.`);
  U.forEach(u=>{if(u.state==='down'&&round>u.down){u.state='out';feed(`${esc(u.name)} extracts from the board.`);}});
  if(score[0]>=WIN||score[1]>=WIN||[0,1].some(t=>!U.some(u=>u.team===t&&u.state==='ok'))){end();return;}
  nextRound();
}
function end(){over=true;const w=score[0]===score[1]?null:(score[0]>score[1]?0:1);
  feed(w===null?`<b>Match ends in a draw</b>, ${score[0]} : ${score[1]}.`:`<b style="color:${TC[w]}">${TN[w]} wins</b> ${score[0]} : ${score[1]}. Next match starts shortly.`);
  draw();clearTimeout(timer);timer=setTimeout(()=>{if(visible&&playing)newMatch(),schedule();},6000/speed);}
function damage(t,n,src,L){t.hp=Math.max(0,t.hp-n);if(t.hp===0&&t.state==='ok'){t.state='down';t.down=round;L.push(`<b style="color:var(--magl)">${esc(t.name)} is downed.</b>`);}}
function shoot(a,t,p,s,L){
  const dice=rollN(p.dice);if(a.id==='RJ'&&p.n==='Revolver'){const i=dice.findIndex(v=>!hit(v,p.t));if(i>=0)dice[i]=d6();}
  let hits=dice.filter(v=>hit(v,p.t)).length;L.push(`${pips(dice,p.t)} hit on ${p.t}+ → ${hits}`);
  if(!hits)return;const dt=Math.max(2,5-s.cover),dr=rollN(hits);let thr=dr.filter(v=>!hit(v,dt)).length;
  L.push(`dodge on ${dt}+: ${pips(dr,dt)} → ${thr} through`);
  if(thr&&t.id==='IJ'&&t.react){t.react=false;const v=d6();if(hit(v,4)){thr--;L.push('Ricochet Shield cancels a hit.');}}
  if(t.w==='kat'&&p.fire&&dr.includes(6)){L.push(`Katana deflects a bullet back at ${esc(a.name)}.`);damage(a,1,t,L);}
  if(thr){L.push(`<b>${esc(t.name)} −${thr*p.dmg} HP</b>`);damage(t,thr*p.dmg,a,L);}
}
function bestTarget(u,moved){let best=null;for(const t of U){if(t.team===u.team||t.state!=='ok')continue;const d=dist(tile(u),tile(t)),p=prof(u,d,moved);if(!p)continue;const s=sight(tile(u),tile(t));if(!s)continue;
  const v=p.dice*p.dmg*(7-p.t)/6-(s.cover*.4)+(1-t.hp/t.max);if(!best||v>best.v)best={t,p,s,v,d};}return best;}
function wantDist(u){return{snp:5,rev:3,sg:1,kat:1}[u.w];}
function act(u){
  const L=[];let moved=false;
  const downed=U.find(t=>t.team!==u.team&&t.state==='down'&&dist(tile(u),tile(t))===1);
  if(downed){downed.state='dead';feed(`<b>${esc(u.name)}</b> executes <b>${esc(downed.name)}</b>. Permadeath: 3 days. Bounty paid out.`);lastFx={a:u.k,b:downed.k,c:'#c6a15b'};return;}
  let shot=bestTarget(u,false);
  if(!shot||(u.w!=='snp'&&shot.d>wantDist(u)+1)){
    const R2=reach(u,3);const foes=U.filter(t=>t.team!==u.team&&t.state==='ok');let bk=u.k,bs=1e9;
    for(const[k]of R2){const t=tiles.get(k);let s=0;
      const nd=Math.min(...foes.map(f=>dist(t,tile(f))));s+=Math.abs(nd-wantDist(u))*2;
      const cd=Math.min(...CPS.map(c=>dist(t,tiles.get(c))));s+=cd*(u.w==='snp'?.4:1.1);
      if(DIRS.some(([dq,dr])=>{const n=tiles.get(K(t.q+dq,t.r+dr));return n&&n.type==='crate';}))s-=.8;
      s+=Math.random()*.6;if(s<bs){bs=s;bk=k;}}
    if(bk!==u.k){u.k=bk;moved=true;}
    shot=bestTarget(u,moved);
  }
  if(shot){L.unshift(`<b>${esc(u.name)}</b> → <b>${esc(shot.t.name)}</b>: ${shot.p.n}, ${shot.d} hex, ${shot.s.l}`);shoot(u,shot.t,shot.p,shot.s,L);lastFx={a:u.k,b:shot.t.k,c:TC[u.team]};feed(L.join('<br>'));}
  else{lastFx=null;if(moved)feed(`${esc(u.name)} moves${CPS.some(c=>dist(tile(u),tiles.get(c))<=1)?' onto a control point':''}.`);}
}
function step(){
  if(over)return;
  while(oi<order.length&&order[oi].state!=='ok')oi++;
  if(oi>=order.length){endRound();draw();return;}
  const u=order[oi++];u.active=true;act(u);draw(u);
  if(score[0]>=WIN||score[1]>=WIN)end();
}
function schedule(){clearTimeout(timer);if(!visible||!playing||over)return;timer=setTimeout(()=>{step();schedule();},1300/speed);}
const hexPts=(x,y)=>[0,1,2,3,4,5].map(i=>{const a=Math.PI/180*(60*i-30);return(x+R*Math.cos(a)).toFixed(1)+','+(y+R*Math.sin(a)).toFixed(1);}).join(' ');
function draw(active){
  let s=`<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Board: round ${round}, Corporation ${score[0]}, Syndicate ${score[1]}"><rect width="100%" height="100%" fill="#1a1410"/>`;
  for(const t of tiles.values()){const cp=CPS.includes(t.k);
    s+=`<polygon points="${hexPts(t.x,t.y)}" fill="${t.type==='wall'?'#4b3a4d':cp?'#3a2d1e':(t.q+t.r)%2?'#2a2118':'#261e16'}" stroke="${cp?'#c6a15b':'#3b3024'}" stroke-width="${cp?2:1}"/>`;
    if(t.type==='crate')s+=`<rect x="${t.x-9}" y="${t.y-9}" width="18" height="18" rx="2" fill="#8a5a2b" stroke="#5a3a1a"/>`;
    if(t.type==='wall')s+=`<rect x="${t.x-12}" y="${t.y-3}" width="24" height="6" fill="#ff5d5b" opacity=".7"/>`;
    if(cp){const c=[0,0];U.forEach(u=>{if(u.state==='ok'&&dist(tile(u),t)<=1)c[u.team]++;});const col=c[0]>c[1]?TC[0]:c[1]>c[0]?TC[1]:'#c6a15b';s+=`<circle cx="${t.x}" cy="${t.y}" r="6" fill="${col}"/>`;}}
  if(lastFx){const a=tiles.get(lastFx.a),b=tiles.get(lastFx.b);s+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${lastFx.c}" stroke-width="3" stroke-dasharray="6 4" opacity=".9"/>`;}
  for(const u of U){if(u.state==='dead'||u.state==='out')continue;const t=tile(u);
    s+=`<g opacity="${u.state==='down'?.5:1}"><circle cx="${t.x}" cy="${t.y}" r="15" fill="${TC[u.team]}" stroke="${active===u?'#c6a15b':'#241923'}" stroke-width="${active===u?4:2}"/><text x="${t.x}" y="${t.y+5}" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="700" font-size="14" fill="#241923">${u.id}</text></g>`;}
  $('#lv-board').innerHTML=s+'</svg>';
  $('#lv-a').textContent=score[0];$('#lv-b').textContent=score[1];
  $('#lv-round').textContent=over?'Zone War · Drone Hub · Final':`Zone War · Drone Hub · Round ${round} of ${MAXR}`+(active?` · ${active.name} acting`:'');
  $('#lv-units').innerHTML=U.map(u=>`<div class="card" style="padding:9px 11px;${active===u?'border-color:#c6a15b':''}${u.state!=='ok'?';opacity:.6':''}"><div style="display:flex;justify-content:space-between"><b>${esc(u.name)}</b><span style="font-size:13px;color:${TC[u.team]}">${u.hp}/${u.max}</span></div><div class="sub" style="font-size:13px">${u.cls} · ${{ok:'in play',down:'downed',dead:'executed',out:'extracted'}[u.state]}</div><div class="hp"><i style="width:${100*u.hp/u.max}%;background:${TC[u.team]}"></i></div></div>`).join('');
}
$('#lv-play').addEventListener('click',e=>{playing=!playing;e.currentTarget.textContent=playing?'Pause':'Play';if(playing&&over)newMatch();schedule();});
$('#lv-speed').addEventListener('click',e=>{speed=speed===1?2:speed===2?4:1;e.currentTarget.textContent=`Speed ${speed}×`;schedule();});
$('#lv-new').addEventListener('click',()=>{newMatch();schedule();});
setInterval(()=>{viewers=Math.max(5,viewers+Math.round((Math.random()-.45)*3));$('#lv-viewers').textContent=viewers;$('#h-viewers').textContent=viewers;},4000);
newMatch();
GN.register('live',{show(){visible=true;if(over)newMatch();schedule();},hide(){visible=false;clearTimeout(timer);}});
GN.liveDebug={step,get U(){return U},get over(){return over},get score(){return score},get round(){return round}};
})();

/* Movement hex grid shared by Maps, AR and Skirmish.
   Hexes are pointy-top, sized from the board width (COLS across), and only cells that sit on the
   painted map (image alpha) are kept, so the grid follows each map's outline and scales with the board. */
(function(){
const SQ=Math.sqrt(3),cache={};
const COLS=11;
function alpha(img){const W=Math.min(360,img.naturalWidth||360),H=Math.max(1,Math.round(W*(img.naturalHeight||1)/(img.naturalWidth||1)));
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});let d=null;
  try{x.drawImage(img,0,0,W,H);d=x.getImageData(0,0,W,H).data;}catch(e){d=null;}return{W,H,d};}
/* units: board width = 1, v grows downwards, asp = height / width */
function build(asp,A,cols){
  const R=1/(cols*SQ),cells=[];
  const inside=(u,v)=>{if(u<0||u>1||v<0||v>asp)return false;if(!A||!A.d)return true;
    const px=Math.min(A.W-1,Math.floor(u*A.W)),py=Math.min(A.H-1,Math.floor(v/asp*A.H));return A.d[(py*A.W+px)*4+3]>150;};
  const rows=Math.ceil(asp/(1.5*R)/2)+1,span=cols+rows;
  for(let r=-rows;r<=rows;r++)for(let q=-span;q<=span;q++){
    const u=.5+R*SQ*(q+r/2),v=asp/2+R*1.5*r;if(!inside(u,v))continue;
    let k=0;for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);if(inside(u+.8*R*Math.cos(a),v+.8*R*Math.sin(a)))k++;}
    if(k>=5)cells.push({q,r,u,v});}
  return{R,asp,cells};
}
function forImage(src){
  if(cache[src])return cache[src];
  return cache[src]=new Promise(res=>{const img=new Image();img.onload=()=>res(build(img.naturalHeight/img.naturalWidth,alpha(img),COLS));
    img.onerror=()=>res(build(1,null,COLS));img.src=src;});
}
function rect(asp,cols){return build(asp,null,cols||COLS);}
/* SVG overlay for a map picture (viewBox in board-width units) */
function svg(G){const R=G.R,w=R*.085;
  const hp=(c,s)=>[0,1,2,3,4,5].map(i=>{const a=Math.PI/180*(60*i-30);return (c.u+s*R*Math.cos(a)).toFixed(4)+','+(c.v+s*R*Math.sin(a)).toFixed(4);}).join(' ');
  return `<svg viewBox="0 0 1 ${G.asp.toFixed(4)}" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">`+
    G.cells.map(c=>{const t=((c.q-c.r)%3+3)%3;return `<polygon points="${hp(c,.97)}" fill="${t===0?'rgba(20,12,19,.16)':'none'}" stroke="rgba(20,12,19,.55)" stroke-width="${(w*2.4).toFixed(4)}" stroke-linejoin="round"/>`;}).join('')+
    G.cells.map(c=>`<polygon points="${hp(c,.97)}" fill="none" stroke="#32d6d0" stroke-opacity=".95" stroke-width="${w.toFixed(4)}" stroke-linejoin="round"/>`).join('')+'</svg>';}
GN.grid={COLS,forImage,rect,svg};
})();

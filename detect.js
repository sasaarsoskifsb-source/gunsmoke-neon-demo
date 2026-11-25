/* Gunsmoke & Neon AR: detekcija bijelog A4 papira i procjena položaja kamere (bez biblioteka) */
var GNDetect=(function(){
  function otsu(hist,total){let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sB=0,wB=0,best=0,th=128;
    for(let i=0;i<256;i++){wB+=hist[i];if(!wB)continue;const wF=total-wB;if(!wF)break;sB+=i*hist[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;th=i;}}return th;}
  // data: RGBA Uint8ClampedArray, W,H: dimenzije. Vraća 4 kuta [[x,y]..] u koordinatama te slike ili null.
  function findPaper(data,W,H){
    const N=W*H,L=new Uint8Array(N),S=new Uint8Array(N),hist=new Uint32Array(256);
    for(let i=0,j=0;i<N;i++,j+=4){const r=data[j],g=data[j+1],b=data[j+2];const l=(r*3+g*6+b)/10|0;L[i]=l;hist[l]++;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);S[i]=mx-mn;}
    const th=Math.max(otsu(hist,N),110);
    const M=new Uint8Array(N);for(let i=0;i<N;i++)M[i]=(L[i]>th&&S[i]<70)?1:0;
    const lab=new Int32Array(N),stack=new Int32Array(N);let best=-1,bestA=0,cur=0;
    for(let s=0;s<N;s++){if(!M[s]||lab[s])continue;cur++;let sp=0,a=0;stack[sp++]=s;lab[s]=cur;
      while(sp){const p=stack[--sp];a++;const x=p%W,y=(p/W)|0;
        if(x>0&&M[p-1]&&!lab[p-1]){lab[p-1]=cur;stack[sp++]=p-1;}
        if(x<W-1&&M[p+1]&&!lab[p+1]){lab[p+1]=cur;stack[sp++]=p+1;}
        if(y>0&&M[p-W]&&!lab[p-W]){lab[p-W]=cur;stack[sp++]=p-W;}
        if(y<H-1&&M[p+W]&&!lab[p+W]){lab[p+W]=cur;stack[sp++]=p+W;}}
      if(a>bestA){bestA=a;best=cur;}}
    if(bestA<N*0.015)return null;
    let cx=0,cy=0;const xs=[],ys=[];
    for(let p=0;p<N;p++)if(lab[p]===best){const x=p%W,y=(p/W)|0;cx+=x;cy+=y;
      // samo rubni pikseli
      if(x===0||y===0||x===W-1||y===H-1||lab[p-1]!==best||lab[p+1]!==best||lab[p-W]!==best||lab[p+W]!==best){xs.push(x);ys.push(y);}}
    cx/=bestA;cy/=bestA;const n=xs.length;if(n<20)return null;
    let i1=0,d=-1;for(let i=0;i<n;i++){const v=(xs[i]-cx)**2+(ys[i]-cy)**2;if(v>d){d=v;i1=i;}}
    let i2=0;d=-1;for(let i=0;i<n;i++){const v=(xs[i]-xs[i1])**2+(ys[i]-ys[i1])**2;if(v>d){d=v;i2=i;}}
    let i3=-1,i4=-1,a3=0,a4=0;const ax=xs[i2]-xs[i1],ay=ys[i2]-ys[i1];
    for(let i=0;i<n;i++){const cr=ax*(ys[i]-ys[i1])-ay*(xs[i]-xs[i1]);if(cr>a3){a3=cr;i3=i;}if(-cr>a4){a4=-cr;i4=i;}}
    if(i3<0||i4<0)return null;
    let q=[[xs[i1],ys[i1]],[xs[i3],ys[i3]],[xs[i2],ys[i2]],[xs[i4],ys[i4]]];
    const qa=Math.abs(area(q));if(qa<bestA*0.8||qa>bestA*1.3)return null; // nije pravokutnik
    // dodirivanje ruba slike = papir nije cijeli u kadru
    for(const[x,y]of q)if(x<=1||y<=1||x>=W-2||y>=H-2)return null;
    q=q.map(([x,y])=>[x+.5,y+.5]);
    q.sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));
    return q;
  }
  function area(q){let s=0;for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];s+=a[0]*b[1]-b[0]*a[1];}return s/2;}
  function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let m=i;for(let k=i+1;k<n;k++)if(Math.abs(A[k][i])>Math.abs(A[m][i]))m=k;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
      if(Math.abs(A[i][i])<1e-12)return null;for(let k=i+1;k<n;k++){const f=A[k][i]/A[i][i];for(let j=i;j<n;j++)A[k][j]-=f*A[i][j];b[k]-=f*b[i];}}
    const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let j=i+1;j<n;j++)s-=A[i][j]*x[j];x[i]=s/A[i][i];}return x;}
  // src: točke papira (mm), dst: pikseli. Vraća 3x3 H.
  function homography(src,dst){const A=[],b=[];
    for(let i=0;i<4;i++){const[X,Y]=src[i],[u,v]=dst[i];A.push([X,Y,1,0,0,0,-u*X,-u*Y]);b.push(u);A.push([0,0,0,X,Y,1,-v*X,-v*Y]);b.push(v);}
    const h=solve(A,b);if(!h)return null;return [[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]];}
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    sc=(a,s)=>[a[0]*s,a[1]*s,a[2]*s],nrm=a=>Math.hypot(a[0],a[1],a[2]),unit=a=>sc(a,1/nrm(a)),
    cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function poseFromH(Hm,f,cx,cy){
    const col=j=>[(Hm[0][j]-cx*Hm[2][j])/f,(Hm[1][j]-cy*Hm[2][j])/f,Hm[2][j]];
    let k1=col(0),k2=col(1),k3=col(2);const lam=2/(nrm(k1)+nrm(k2));
    let r1=sc(k1,lam),r2=sc(k2,lam),t=sc(k3,lam);
    if(t[2]<0){r1=sc(r1,-1);r2=sc(r2,-1);t=sc(t,-1);}
    r1=unit(r1);r2=unit(sub(r2,sc(r1,dot(r1,r2))));const r3=cross(r1,r2);
    return {r1,r2,r3,t,faces:dot(r3,sc(t,-1))>0};
  }
  const A4=[297,210];
  // corners: 4 kuta u pikselima (redoslijed oko središta). Vraća pozu s osi X duž duže stranice, Z prema kameri.
  function paperPose(corners,imgW,imgH,fScale){
    const f=(fScale||0.75)*Math.max(imgW,imgH),cx=imgW/2,cy=imgH/2;
    const e=i=>Math.hypot(corners[(i+1)%4][0]-corners[i][0],corners[(i+1)%4][1]-corners[i][1]);
    const P=[[-A4[0]/2,-A4[1]/2],[A4[0]/2,-A4[1]/2],[A4[0]/2,A4[1]/2],[-A4[0]/2,A4[1]/2]];
    const c=corners,cands=[c,[c[1],c[2],c[3],c[0]],[c[0],c[3],c[2],c[1]],[c[1],c[0],c[3],c[2]]];
    let best=null;
    for(const order of cands){
      const Hm=homography(P,order);if(!Hm)continue;const p=poseFromH(Hm,f,cx,cy);if(!p.faces)continue;
      let err=0;for(let i=0;i<4;i++){const[X,Y]=P[i];const q=[0,1,2].map(k=>p.r1[k]*X+p.r2[k]*Y+p.t[k]);if(q[2]<=0){err=1e9;break;}err+=Math.hypot(f*q[0]/q[2]+cx-order[i][0],f*q[1]/q[2]+cy-order[i][1]);}
      if(!best||err<best.err)best=Object.assign(p,{f,corners:order,err});
    }
    if(best&&best.err<0.15*Math.max(imgW,imgH)*4)return best;
    return null;
  }
  return {findPaper,paperPose,homography,poseFromH};
})();
if(typeof module!=='undefined')module.exports=GNDetect;

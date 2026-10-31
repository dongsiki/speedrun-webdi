/* 짐 싸기 3페 컷씬(2026-10-29, Claude Code).
   10/29 사용자: 「3. 1페때는 간단하게 컷씬한걸, 이번엔 좀 더 심화적으로 컷씬」
   1페와 같은 1비트 선 그림을 코드로 그린다. 글자·내레이션 없음.
   ① 넣은 물건마다 기억 장면(1페 그림)에 노인이 들어가 움직이고 카메라가 천천히 다가감
   ② 노인이 작은 가방을 들고 집을 나섬(식탁엔 두고 간 물건만, 한 번 돌아봄) → 문이 닫힘
   ③ 병원 복도 ④ 병실 협탁에 고른 물건을 하나씩 꺼내 놓음, 두고 온 물건은 점선 빈자리
   ⑤ 침대 옆 숨 쉬는 기계 → 흰 화면 */
const SuitcaseCut3=(()=>{
  const PI=Math.PI,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const BOTTOM={photo:43,bear:47,clock:43,keys:35,cloth:29,pills:44,book:47,cassette:28,letter:30,pencil:40};
  const T=Object.freeze({memory:3.4,leave:7,corridor:4.2,wardBase:2.2,wardItem:.6,wardTail:1.4,machine:5.2});
  // 기억 장면마다 노인(또는 아이)의 자리와 동작. 좌표는 1페 기억 그림(scene.js memory)과 같은 칸.
  const ACT={
    photo:{x:-20,y:190,s:1.55,dir:-1,pose:'reach',arm:[.2,2.3]},
    bear:{x:205,y:197,s:1.45,dir:-1,pose:'push',child:{x:-10,y:81}},
    clock:{x:-185,y:160,s:1.45,dir:1,pose:'reach',arm:[-.4,-1.75]},
    keys:{x:40,y:210,s:1.5,dir:1,pose:'reach',arm:[-.3,-1.35]},
    cloth:{x:-205,y:210,s:1.75,dir:1,pose:'reach',arm:[-.5,-2.45]},
    pills:{x:-252,y:126,s:1.25,dir:1,pose:'sit',arm:[-1.1,-1.45]},
    book:{x:222,y:150,s:1.3,dir:-1,pose:'sit',arm:[-1.2,-1.5],bow:.18},
    cassette:{x:250,y:130,s:1.5,dir:-1,pose:'sway'},
    letter:{x:150,y:185,s:1.5,dir:-1,pose:'bend',arm:[-.2,-.75]},
    pencil:{x:205,y:185,s:1.15,dir:-1,pose:'reach',arm:[-.3,-1.1],kid:true},
    'empty-case':{x:255,y:150,s:1.4,dir:-1,pose:'stand'}
  };
  const limb=(c,x1,y1,x2,y2,w)=>{c.strokeStyle='#000';c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  // 노인: 굽은 등, 검은 몸, 흰 머리. o = {walk, arm, arm2, sit, bow, look, carry, kid}
  function person(A,c,x,y,s,dir,o={}){
    c.save();c.translate(x,y);c.scale(s*dir,s);
    const kid=!!o.kid,bow=(o.bow||0)+(kid?0:.12),hip=o.sit?-46:-54,len=kid?36:48,shoulder=hip-(kid?34:46);
    const w=o.walk||0,swing=Math.sin(w)*.42;
    if(o.sit){limb(c,-4,hip,24,hip,9);limb(c,24,hip,26,0,9);limb(c,4,hip,30,hip+2,9);limb(c,30,hip+2,32,0,9);}
    else{const a=o.bend?-.15:0;limb(c,-4,hip,-4+Math.sin(swing+a)*len,hip+Math.cos(swing)*len,9);limb(c,4,hip,4+Math.sin(-swing+a)*len,hip+Math.cos(swing)*len,9);}
    c.save();c.translate(0,hip);c.rotate(bow+(o.bend?.55:0)+(o.sway||0));
    A.path(c,`M -13 0 L 13 0 L 15 ${shoulder-hip+4} Q 0 ${shoulder-hip-4} -15 ${shoulder-hip+4} Z`,'#000',1);
    const sy=shoulder-hip+6,arm=kid?28:40;
    const a1=o.arm??(o.walk?-swing*.8:0),a2=o.arm2??(o.walk?swing*.8:.15);
    limb(c,-6,sy,-6-Math.sin(a2)*arm,sy+Math.cos(a2)*arm,7);
    const hx=8-Math.sin(a1)*arm*-1,hy=sy+Math.cos(a1)*arm;limb(c,8,sy,hx,hy,7);
    if(o.carry){c.save();c.translate(-6-Math.sin(a2)*arm,sy+Math.cos(a2)*arm);c.rotate(-bow);A.path(c,'M -22 6 L 22 6 L 22 36 L -22 36 Z','#fff',2.2);A.stroke(c,'M -8 6 L -8 0 L 8 0 L 8 6',2.4);A.dots(c,-19,12,38,21,.16);c.restore();}
    c.save();c.translate(o.look?3:0,sy-(kid?16:14));A.oval(c,0,0,kid?12:10.5,kid?13:11.5);
    if(!kid)A.stroke(c,'M -9 -5 Q -2 -12 7 -8',1.4);c.restore();
    c.restore();c.restore();
    return {hx,hy};
  }
  function frameOf(g){return {cx:g.vw/2,cy:g.vh*.49,zoom:Math.min(g.vw/800,g.vh/650)};}
  function enter(c,g,push=1,dx=0){const f=frameOf(g);c.save();c.translate(f.cx,f.cy);c.scale(f.zoom*push,f.zoom*push);c.translate(dx,0);c.lineWidth=2.4;c.strokeStyle='#000';}
  function sequence(selected){
    const list=(selected.length?selected:['empty-case']).map(key=>({kind:'memory',key,d:T.memory}));
    list.push({kind:'leave',d:T.leave},{kind:'corridor',d:T.corridor},{kind:'ward',d:T.wardBase+T.wardItem*selected.length+T.wardTail},{kind:'machine',d:T.machine});
    return list;
  }
  const total=selected=>sequence(selected).reduce((n,x)=>n+x.d,0);
  function memory(A,c,key,t,g,selected){
    const f=frameOf(g),push=1+.12*ease(t/T.memory),k=ACT[key]||ACT['empty-case'];
    c.save();c.translate(f.cx,f.cy);c.scale(push,push);c.translate(-f.cx,-f.cy);
    A.memory(c,key,t,g,selected);
    c.translate(f.cx,f.cy);c.scale(f.zoom,f.zoom);
    const p=ease(t/1.6),b=Math.sin(t*1.7);
    const o={kid:k.kid};
    if(k.pose==='reach'||k.pose==='sit'||k.pose==='bend'){o.arm=k.arm[0]+(k.arm[1]-k.arm[0])*p;o.sit=k.pose==='sit';o.bend=k.pose==='bend'&&p>.2;o.bow=k.bow||0;}
    if(k.pose==='push'){o.arm=-1.25+b*.25;}
    if(k.pose==='sway'){o.sway=Math.sin(t*2.4)*.07;o.arm=.1;o.arm2=.1;}
    person(A,c,k.x,k.y,k.s,k.dir,o);
    if(k.child){const d=b*8;c.save();c.translate(k.child.x+d,k.child.y);person(A,c,0,0,.9,1,{kid:true,sit:true,arm:-2.9,arm2:-2.9});c.restore();}
    c.restore();
  }
  function door(A,c,x,y,w,h,open){
    A.path(c,`M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`,'#fff',3);
    A.dots(c,x+4,y+4,w-8,h-8,.18);
    const pw=w*(1-.82*open);A.path(c,`M ${x} ${y} L ${x+pw} ${y+(open?10:0)} L ${x+pw} ${y+h-(open?10:0)} L ${x} ${y+h} Z`,'#fff',3);
    A.oval(c,x+pw-12,y+h*.52,4,4,'#000',0);
  }
  function leave(A,c,t,g,selected){
    // 0~2.4 걸어 들어옴 → 2.4 멈춰 식탁 쪽으로 돌아봄 → 3.0~4.3 식탁(두고 가는 물건)으로 다가가 보는 장면 → 4.6 다시 돌아서 문으로 → 6.1 문이 닫힘
    const look=t>=3&&t<4.3,f=frameOf(g);
    if(look){const k=ease((t-3)/.5);enter(c,g,1+.75*k,-120*k);}else enter(c,g,1+.04*ease(t/T.leave));
    if(look)c.translate(0,-60*ease((t-3)/.5));
    const left=A.items.filter(x=>!selected.includes(x.id)).map(x=>x.id);
    A.stroke(c,'M -330 230 L 330 230',2);
    A.stroke(c,'M -40 80 L 300 80 L 314 100 L -50 100 Z M -24 100 L -29 230 M 282 100 L 289 230',3);
    const n=left.length,step=Math.min(58,320/Math.max(1,n));
    left.forEach((id,i)=>{const size=52;A.object(c,id,130+(i-(n-1)/2)*step,80-BOTTOM[id]*size/100,size,0);});
    A.chair(c,60,171,1.1);
    const doorOpen=t<6.1?1:1-ease((t-6.1)/.6);
    door(A,c,-330,-150,90,380,doorOpen);
    if(!look&&t<6.45){
      const x=t<2.4?360-(360+160)*ease(t/2.4):t<4.6?-160:-160-110*ease((t-4.6)/1.3);
      const facing=t>=2.55&&t<4.75?1:-1,moving=t<2.4||t>=4.6;
      c.save();if(t>5.7){c.beginPath();c.rect(-330+90*(1-.82*doorOpen)-2,-400,900,800);c.clip();}
      person(A,c,x,230,1.7,facing,{walk:moving?t*6.2:0,carry:true,bow:facing>0?.22:0});c.restore();
    }
    c.restore();
  }
  function corridor(A,c,t,g){
    enter(c,g,1);
    const vy=-30;A.stroke(c,'M -330 -260 L -40 vy L 40 vy L 330 -260 M -330 250 L -40 vy M 330 250 L 40 vy M -40 vy L -40 -50 M 40 vy L 40 -50 M -40 -50 L 40 -50 M -40 vy L 40 vy'.replace(/vy/g,vy+20),2);
    for(let i=0;i<5;i++){const z=((i/5)+t*.08)%1,s=1-z*.82,y=vy+20-(250-(vy+20))*-s*0,xL=-330+290*z,xR=330-290*z,top=-260+240*z,bot=250-230*z;
      A.stroke(c,`M ${xL} ${top+(bot-top)*.2} L ${xL} ${bot-6*s} M ${xR} ${top+(bot-top)*.2} L ${xR} ${bot-6*s}`,1.6*s+.6);
      A.stroke(c,`M ${-60*s} ${top+8} L ${60*s} ${top+8}`,3*s+.5);}
    A.dots(c,-38,-50,76,40,.12);
    const z=ease(t/T.corridor)*.86,s=1.7*(1-z*.85),y=245-(245-(vy+20))*z*1.02;
    person(A,c,0,y,s,1,{walk:t*5.4,carry:true});
    c.restore();
  }
  function bed(A,c){
    A.stroke(c,'M -300 110 L 150 110 M -300 60 L -300 210 M 150 85 L 150 210 M -300 210 L -300 220 M 150 210 L 150 220',4);
    A.path(c,'M -296 60 L 148 60 L 148 112 L -296 112 Z','#fff',2.6);
    A.path(c,'M -285 28 Q -282 6 -245 8 L -200 12 Q -188 36 -200 58 L -280 58 Q -290 50 -285 28 Z','#fff',2.2);
    A.oval(c,-232,30,16,17);A.stroke(c,'M -246 22 Q -236 12 -222 18',1.4);
    A.path(c,'M -212 44 Q -100 8 130 26 L 146 62 L -212 62 Z','#fff',2.4);A.dots(c,-200,34,330,24,.1);
  }
  function wardTable(A,c){A.stroke(c,'M 190 80 L 330 80 M 200 80 L 200 220 M 320 80 L 320 220 M 200 150 L 320 150',3);}
  function ward(A,c,t,g,selected){
    enter(c,g,1+.06*ease(t/4));
    A.stroke(c,'M -330 220 L 330 220',2);bed(A,c);wardTable(A,c);
    const left=A.items.filter(x=>!selected.includes(x.id)).map(x=>x.id);
    // 두고 온 물건: 벽 선반의 점선 빈자리
    A.stroke(c,'M -120 -150 L 320 -150',2.4);
    const step=Math.min(48,430/Math.max(1,left.length));
    c.save();c.globalAlpha=.42;c.setLineDash([3,6]);
    left.forEach((id,i)=>{const x=100+(i-(left.length-1)/2)*step;c.save();c.globalAlpha=.25;A.object(c,id,x,-150-BOTTOM[id]*.4,40,0);c.restore();c.save();c.translate(x,-170);c.beginPath();c.rect(-21,-20,42,40);c.lineWidth=1.6;c.stroke();c.restore();});
    c.restore();c.setLineDash([]);
    // 가방: 바닥에서 열리고, 고른 물건이 협탁 위로 하나씩
    const lid=ease((t-.6)/.9);A.path(c,'M 205 180 L 315 180 L 315 220 L 205 220 Z','#fff',2.4);
    c.save();c.translate(205,180);c.rotate(-lid*1.15);A.path(c,'M 0 -36 L 110 -36 L 110 0 L 0 0 Z','#fff',2.4);c.restore();
    const n=selected.length,stepT=Math.min(30,120/Math.max(1,n));
    selected.forEach((id,i)=>{const at=T.wardBase+i*T.wardItem,k=ease((t-at)/.42);if(k<=0)return;
      const bottom={photo:43,bear:47,clock:43,keys:35,cloth:29,pills:44,book:47,cassette:28,letter:30,pencil:40}[id],size=40,tx=260+(i-(n-1)/2)*stepT,ty=80-bottom*size/100;
      A.object(c,id,260+(tx-260)*k,200+(ty-200)*k,size,0);});
    c.restore();
  }
  function machine(A,c,t,g,selected){
    enter(c,g,1.06+.1*ease(t/T.machine),40);
    A.stroke(c,'M -330 220 L 330 220',2);bed(A,c);wardTable(A,c);
    const n=selected.length,stepT=Math.min(30,120/Math.max(1,n));
    selected.forEach((id,i)=>{const bottom={photo:43,bear:47,clock:43,keys:35,cloth:29,pills:44,book:47,cassette:28,letter:30,pencil:40}[id],size=40;A.object(c,id,260+(i-(n-1)/2)*stepT,80-bottom*size/100,size,0);});
    A.path(c,'M 205 180 L 315 180 L 315 220 L 205 220 Z','#fff',2.4);
    // 숨 쉬는 기계: 주름통이 오르내리고 관이 얼굴로
    const breath=(Math.sin(t*PI*2/3.2)+1)/2,top=-40-breath*40;
    A.path(c,'M -420 -60 L -330 -60 L -330 220 L -420 220 Z','#fff',2.6);
    A.path(c,`M -405 100 L -345 100 L -345 ${top+130} L -405 ${top+130} Z`,'#fff',2);
    for(let y=top+140;y<100;y+=10)A.stroke(c,`M -405 ${y} L -345 ${y}`,1.2);
    A.path(c,'M -410 -48 L -340 -48 L -340 -10 L -410 -10 Z','#fff',2);
    const ph=(t*.9)%1;c.save();c.beginPath();c.rect(-408,-46,66,34);c.clip();
    A.stroke(c,`M -410 -28 L ${-410+60*ph} -28 L ${-406+60*ph} -42 L ${-402+60*ph} -16 L ${-398+60*ph} -28 L -340 -28`,1.6);c.restore();
    A.stroke(c,'M -330 160 Q -280 150 -270 90 Q -262 50 -236 42',3);
    c.restore();
    if(t>T.machine-1.6){c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle=`rgba(255,255,255,${ease((t-(T.machine-1.6))/1.4)})`;c.fillRect(0,0,c.canvas.width,c.canvas.height);c.restore();}
  }
  function draw(A,c,t,g,selected){
    let at=t;for(const s of sequence(selected)){if(at<s.d||s.kind==='machine'){
      if(s.kind==='memory')memory(A,c,s.key,at,g,selected);else if(s.kind==='leave')leave(A,c,at,g,selected);else if(s.kind==='corridor')corridor(A,c,at,g);else if(s.kind==='ward')ward(A,c,at,g,selected);else machine(A,c,Math.min(at,s.d),g,selected);
      if(at<.13){c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1-at/.13;c.fillStyle='#fff';c.fillRect(0,0,c.canvas.width,c.canvas.height);c.restore();}
      return s.kind+(s.key?'-'+s.key:'');}at-=s.d;}
    return '';
  }
  return {T,sequence,total,draw};
})();
if(typeof module!=='undefined')module.exports=SuitcaseCut3;

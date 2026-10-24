

(() => {
  'use strict';
  // Standalone game: all drawings, effects and sound are generated locally.
  const canvas=document.getElementById('earth'), ctx=canvas.getContext('2d',{alpha:false});
  const dialog=document.getElementById('discovery'), closeButton=document.getElementById('close');
  const continueButton=document.getElementById('continue'), countLabel=document.getElementById('count');
  const restartButton=document.getElementById('restart');
  const makeCanvas=(w,h=w)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  const terrain=makeCanvas(1),scene=makeCanvas(1),tc=terrain.getContext('2d'),sc=scene.getContext('2d');
  const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const TAU=Math.PI*2,seed=(crypto.getRandomValues(new Uint32Array(1))[0]||1234567)>>>0;
  function randomGenerator(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  const random=randomGenerator(seed);
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce-off)').matches;
  let W=1,H=1,ratio=1,cell=16,cols=1,rows=1,radius=34;
  let depth=null,lastErosion=null,imageData,pixels,state='digging',found=null,finishedAt=0;
  let collected=0,firstClick=true,frameId=0,previousTime=0,resizeFrame=0,lastSound=-1000;
  let activePointer=null,lastPointer=null,lastPointerCell=null;
  const particles=[];

  // Seven small, rough ink drawings. No external graphics or fonts.
  function makeRelic(type, objectSeed) {
    const c=makeCanvas(192), g=c.getContext('2d');
    g.scale(1.92,1.92);g.translate(50,50);g.lineJoin='round';g.lineCap='round';
    function line(d, width=1.5, fill=null) {
      const p=new Path2D(d);
      if(fill){g.fillStyle=fill;g.fill(p);}
      g.lineWidth=width;g.strokeStyle='#222';g.stroke(p);
      g.save();g.translate(.55,-.45);g.lineWidth=.55;g.globalAlpha=.45;g.stroke(p);g.restore();
      return p;
    }
    if(type==='bulb') {
      line('M -12 15 C -13 3 -27 -2 -26 -17 C -25 -40 26 -40 26 -17 C 27 -3 13 3 12 15 Z',2.2,'#fff');
      line('M -12 15 L 12 15 L 11 29 L 6 35 L -6 35 L -11 29 Z',2.2,'#fff');
      line('M -11 20 L 11 19 M -10 25 L 10 24 M -5 14 L -8 -11 L 0 -4 L 8 -11 L 5 14',1.3);
    } else if(type==='toothbrush') {
      line('M -5 36 L -6 -7 L -11 -14 L -11 -35 L 10 -35 L 10 -14 L 5 -7 L 5 36 Z',2.8,'#fff');
      line('M -7 -30 L 7 -30 M -7 -24 L 7 -24 M -7 -18 L 7 -18 M -2 0 L -2 28',1.8);
    } else if(type==='cane') {
      line('M -16 -19 L -16 -25 C -16 -42 15 -42 15 -25 L 15 38 L 6 38 L 6 -24 C 6 -30 -7 -30 -7 -24 L -7 -19 Z',2.8,'#fff');
      line('M 6 33 L 15 33',2.6);
    } else if(type==='spool') {
      // 실과 바늘: 나무 실패에 실이 감겨 있고 바늘 하나가 꽂혀 있다.
      line('M 6 -38 L 33 31',2.4);line('M 7 -36 L 10 -30',1);
      line('M -24 -30 L 20 -30 L 20 -24 L -24 -24 Z',2,'#fff');line('M -24 24 L 20 24 L 20 30 L -24 30 Z',2,'#fff');
      line('M -18 -24 L 14 -24 L 14 24 L -18 24 Z',2,'#fff');
      line('M -18 -17 L 14 -14 M -18 -9 L 14 -6 M -18 -1 L 14 2 M -18 7 L 14 10 M -18 15 L 14 18',1.1);
      line('M 14 8 C 30 12 34 -10 22 -24 C 16 -31 10 -38 8 -34',1);
    } else if(type==='suitcase') {
      // 작은 여행가방: 손잡이, 가죽끈 두 줄, 잠금쇠.
      line('M -10 -12 L -10 -23 L 10 -23 L 10 -12',2.6);
      line('M -31 -12 L 31 -12 L 31 29 L -31 29 Z',2.4,'#fff');
      line('M -31 1 L 31 1',1.1);line('M -19 -12 L -19 29 M 19 -12 L 19 29',1.5);
      line('M -4 -3 L 4 -3 L 4 6 L -4 6 Z',1.3,'#fff');line('M -26 29 L -26 34 M 26 29 L 26 34',2);
    } else if(type==='chart') {
      // 접힌 MRI 검사표. 검은 격자와 작은 환자 번호가 남아 있다.
      line('M -25 -35 L 13 -35 L 25 -23 L 25 35 L -25 35 Z',2.3,'#fff');
      line('M 13 -35 L 13 -23 L 25 -23 M -17 -20 L 12 -20 M -17 -13 L 17 -13 M -17 -6 L 9 -6',1.2);
      line('M -17 1 L 17 1 L 17 26 L -17 26 Z M -10 1 L -10 26 M -3 1 L -3 26 M 4 1 L 4 26 M 11 1 L 11 26 M -17 9 L 17 9 M -17 17 L 17 17',.85);
    } else if(type==='coin') {
      line('M 30 1 C 32 18 15 32 -2 30 C -21 30 -32 14 -30 -3 C -31 -22 -14 -31 3 -30 C 22 -31 32 -14 30 1 Z',1.7,'#fff');
      line('M -6 -7 L 7 -6 L 6 7 L -7 6 Z',1.4);
      line('M -22 -2 L -16 -2 M 16 0 L 22 0 M -1 -22 L 0 -16 M 0 17 L 0 23',1.2);
      line('M -24 -12 Q -15 -28 4 -25',.8);
    } else if(type==='vessel') {
      line('M -12 -18 C -34 -30 -36 11 -21 14 M 12 -18 C 35 -28 36 10 20 14',2);
      line('M -10 -29 L -12 -19 C -11 -9 -27 -8 -25 10 C -23 26 -15 30 -10 32 L 10 32 C 14 29 23 26 25 10 C 27 -8 10 -9 12 -20 L 10 -29 Z',1.7,'#fff');
      line('M -12 -28 Q 0 -24 12 -29 M -23 5 Q 0 13 23 5',1.2);
      line('M 7 -21 L 2 -13 L 8 -7 L 4 2 L 9 14 L 4 18 L 5 30',.9);
    } else if(type==='key') {
      line('M -10 -9 C -32 -12 -28 -37 -10 -37 C 10 -36 8 -10 -5 -9 L -5 25 L 15 25 L 15 34 L 8 34 L 8 30 L 2 30 L 2 34 L -11 34 Z',1.7,'#fff');
      line('M -10 -17 C 0 -18 0 -30 -10 -30 C -21 -30 -21 -17 -10 -17 Z',1.3);
      line('M -8 -5 L -8 23',.7);
    } else if(type==='fossil') {
      line('M 27 5 C 35 -19 14 -35 -6 -32 C -31 -29 -36 -7 -28 14 C -17 36 6 33 25 21 L 21 12 Z',1.5,'#fff');
      g.beginPath();
      for(let t=0;t<Math.PI*5.2;t+=.04) { const r=1.5+t*1.5,x=Math.cos(t)*r-2,y=Math.sin(t)*r-2;t===0?g.moveTo(x,y):g.lineTo(x,y); }
      g.strokeStyle='#222';g.lineWidth=1.6;g.stroke();
      for(let a=0;a<TAU;a+=.45) { const x=Math.cos(a),y=Math.sin(a);line('M '+(x*26-2)+' '+(y*26-2)+' L '+(x*21-2)+' '+(y*21-2),.8); }
    } else if(type==='bottle') {
      line('M -7 -35 L 7 -35 L 7 -27 L -7 -27 Z',1.4,'#fff');
      line('M -9 -28 L 9 -28 L 9 -15 C 10 -10 22 -9 23 -1 L 24 28 Q 24 34 17 34 L -17 34 Q -24 34 -24 28 L -23 -1 C -22 -9 -10 -10 -9 -15 Z',1.7,'#fff');
      line('M -9 -21 L 9 -21 M -12 2 L 12 1 L 12 20 L -11 21 Z M -6 8 L 6 7 M -6 13 L 3 13',1);
      line('M -18 0 L -17 23',.7);
    } else if(type==='arrowhead') {
      line('M 0 -37 L 27 22 L 14 20 L 11 31 L -10 31 L -14 20 L -27 22 Z',1.8,'#fff');
      line('M 0 -31 L -5 17 L 0 28 M -13 -4 L -2 0 L 13 -3 M -20 11 L -5 14 L 20 12 M -8 -16 L -1 -13 L 7 -17',1.1);
    } else {
      line('M 24 5 C 25 35 -26 35 -25 5 C -25 -24 25 -24 24 5 Z',1.8,'#fff');
      line('M 16 5 C 16 -12 -16 -12 -16 5 C -16 25 16 25 16 5 Z',1.3);
      line('M -15 -20 L 0 -29 L 16 -20 L 16 -5 L 0 4 L -15 -5 Z',1.5,'#fff');
      line('M -10 -19 L 0 -24 L 10 -18 L 10 -8 L 0 -3 L -10 -9 Z M -10 -19 L 10 -8 M 10 -18 L -10 -9',.9);
    }
    return c;
  }



  const types=['bulb','key','toothbrush','cane','spool','suitcase','chart'];
  // Stable initial objects; discovery order is chosen by the player.
  const items=types.map((type,i)=>{
    const sprite=makeRelic(type,seed+i*1741),mask=makeCanvas(192),mc=mask.getContext('2d');
    return{type,u:(i%4+.4+random()*.25)/4,v:(Math.floor(i/4)+.35+random()*.3)/2,
      angle:random()*TAU,burial:8.5+random()*1.8,sprite,source:sprite.getContext('2d').getImageData(0,0,192,192),
      mask,mc,coverage:0,collected:false,touched:false};
  });

  function gridPoint(x,y){return{x:clamp(Math.floor(x/cell),0,cols-1),y:clamp(Math.floor(y/cell),0,rows-1)};}
  function sample(x,y){const p=gridPoint(x,y);return depth[p.y*cols+p.x];}
  function paintGround(){
    for(let i=0;i<depth.length;i++){
      const z=depth[i],p=i*4;
      const ink=z<=0?255:z<1.6?239:z<3.5?216:z<6?181:z<9?139:z<13?94:z<18?58:35;
      pixels[p]=pixels[p+1]=pixels[p+2]=ink;pixels[p+3]=255;
    }
    tc.putImageData(imageData,0,0);
  }
  function expose(item){
    const size=radius*1.72,cs=Math.cos(item.angle),sn=Math.sin(item.angle);
    const out=item.mc.createImageData(192,192),src=item.source.data,target=out.data;
    let visible=0,total=0;
    for(let y=0;y<192;y++)for(let x=0;x<192;x++){
      const i=(y*192+x)*4;if(src[i+3]<16)continue;
      const lx=(x/192-.5)*size,ly=(y/192-.5)*size;
      const d=sample(item.u*W+lx*cs-ly*sn,item.v*H+lx*sn+ly*cs);
      // Every visible patch is determined by one square grid cell's depth.
      const a=d<item.burial-1?0:d<item.burial? .35:d<item.burial+.8? .72:1;
      total++;visible+=a;
      target[i]=src[i];target[i+1]=src[i+1];target[i+2]=src[i+2];target[i+3]=src[i+3]*a;
    }
    item.coverage=total?visible/total:0;item.mc.putImageData(out,0,0);
  }
  function compose(){
    sc.fillStyle='#fff';sc.fillRect(0,0,W,H);sc.imageSmoothingEnabled=false;
    sc.drawImage(terrain,0,0,cols,rows,0,0,cols*cell,rows*cell);
    // Only excavated cells get a tiny seam. The initial field has no visible grid.
    sc.fillStyle='rgba(255,255,255,.14)';
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(depth[y*cols+x]>0){
      sc.fillRect(x*cell,y*cell,cell,1);sc.fillRect(x*cell,y*cell,1,cell);
    }
    sc.imageSmoothingEnabled=true;
    for(const item of items){
      if(item.collected||(!item.discovered&&item.coverage<.001))continue;
      sc.save();sc.translate(item.u*W,item.v*H);sc.rotate(item.angle);
      const size=radius*1.72;sc.drawImage(item.discovered?item.sprite:item.mask,-size/2,-size/2,size,size);sc.restore();
    }
  }

  // Short layers of filtered noise, a low impact, and tiny stone ticks.
  let audioContext=null, master=null, noiseBuffer=null, audioUnavailable=false;
  function startAudio() {
    if(audioUnavailable) return;
    try {
      if(!audioContext) {
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio) { audioUnavailable=true; return; }
        audioContext=new Audio();master=audioContext.createGain();master.gain.value=.46;
        const compressor=audioContext.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;
        master.connect(compressor);compressor.connect(audioContext.destination);
        noiseBuffer=audioContext.createBuffer(1,audioContext.sampleRate*.7,audioContext.sampleRate);
        const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(audioContext.state==='suspended') audioContext.resume().catch(()=>{});
    } catch (_) { audioUnavailable=true; }
  }
  function sound(u,d,metal=false) {
    if(!audioContext||audioContext.state==='closed')return;
    try {
      const a=audioContext,t=a.currentTime,pan=a.createStereoPanner();pan.pan.value=(u-.5)*1.1;pan.connect(master);
      const n=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();n.buffer=noiseBuffer;
      filter.type='bandpass';filter.frequency.setValueAtTime(950+Math.random()*600-d*13,t);filter.Q.value=.65;
      gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.55,t+.009);gain.gain.exponentialRampToValueAtTime(.001,t+.20);
      n.connect(filter);filter.connect(gain);gain.connect(pan);n.start(t,Math.random()*.25);n.stop(t+.23);
      const o=a.createOscillator(),og=a.createGain();o.type='sine';o.frequency.setValueAtTime(125-d*1.3,t);o.frequency.exponentialRampToValueAtTime(43,t+.12);
      og.gain.setValueAtTime(.28,t);og.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(og);og.connect(pan);o.start(t);o.stop(t+.16);
      if(metal) {
        const tick=a.createOscillator(),tg=a.createGain();tick.type='triangle';tick.frequency.value=1450+Math.random()*300;
        tg.gain.setValueAtTime(.055,t+.015);tg.gain.exponentialRampToValueAtTime(.001,t+.33);tick.connect(tg);tg.connect(pan);tick.start(t+.015);tick.stop(t+.34);
        tick.onended=()=>{tick.disconnect();tg.disconnect();};
      }
      n.onended=()=>{n.disconnect();filter.disconnect();gain.disconnect();};
      o.onended=()=>{o.disconnect();og.disconnect();};setTimeout(()=>pan.disconnect(),600);
    } catch (_) { /* Silent play remains possible if a device has no audio output. */ }
  }
  function discoverySound() {
    if(!audioContext)return;
    const a=audioContext,t=a.currentTime;
    [293.66,440,587.33,880].forEach((f,i)=> {
      const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(.001,t+i*.14);g.gain.exponentialRampToValueAtTime(.07/(1+i*.4),t+.06+i*.14);g.gain.exponentialRampToValueAtTime(.001,t+2.8+i*.14);
      o.connect(g);g.connect(master);o.start(t+i*.14);o.stop(t+3+i*.14);o.onended=()=>{o.disconnect();g.disconnect();};
    });
  }



  function debris(x,y,celebrate=false){
    const n=reducedMotion?2:celebrate?16:4;
    for(let i=0;i<n;i++){
      const a=random()*TAU,s=35+random()*90;
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,age:0,life:.28+random()*.25,
        size:1+Math.floor(random()*3),color:i%3===0?'#222':'#999'});
    }
    if(particles.length>120)particles.splice(0,particles.length-120);
  }
  function seedAt(item,p,burial){
    item.u=clamp(((p.x+.5)*cell+(random()-.5)*cell*.18)/W,.003,.997);
    item.v=clamp(((p.y+.5)*cell+(random()-.5)*cell*.18)/H,.003,.997);
    if(burial!==undefined)item.burial=burial;
  }
  function stopDrag(){
    const id=activePointer;activePointer=null;lastPointer=null;lastPointerCell=null;
    if(id!==null&&canvas.hasPointerCapture(id))try{canvas.releasePointerCapture(id);}catch(_){}
  }
  function showDiscovery(item){
    stopDrag();item.collected=true;collected++;found=item;state='discovery';finishedAt=performance.now();
    countLabel.textContent=collected===items.length?'7 / 7 · 모두 발견':collected+' / 7';
    continueButton.textContent=collected===items.length?'처음부터 다시':'계속 파기';
    dialog.setAttribute('aria-label',collected===items.length?'일곱 개 모두 발견':'발견한 물건');
    closeButton.setAttribute('aria-label',collected===items.length?'닫고 파던 화면으로':'닫고 계속 파기');
    dialog.hidden=false;restartButton.hidden=true;canvas.setAttribute('aria-label','발견한 물건');
    discoverySound();debris(item.u*W,item.v*H,true);closeButton.focus({preventScroll:true});
  }
  function closeDiscovery(){
    if(state!=='discovery')return;
    stopDrag();dialog.hidden=true;found=null;state='digging';particles.length=0;
    restartButton.hidden=collected!==items.length;canvas.setAttribute('aria-label','파던 화면');
    compose();wake();canvas.focus({preventScroll:true});
  }
  function lineCells(a,b){
    const result=[];let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=-Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;
    let error=dx+dy;
    while(true){result.push({x,y});if(x===b.x&&y===b.y)break;const twice=2*error;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}}
    return result;
  }
  function digCells(centers,isClick){
    if(state!=='digging'||!centers.length)return;
    const t=performance.now(),end=centers[centers.length-1],impacts=new Map();
    // Prototype objects stay near the center, regardless of the first click.
    // Unfound objects stay where they were buried.
    // Interpolate spatially, then apply at most one erosion per cell per event.
    // A 75 ms cell cooldown bounds repeated drag passes independently of how
    // frequently the browser emits pointermove. Clicks remain individual hits.
    for(const p of centers)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=p.x+dx,y=p.y+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
      const i=y*cols+x,amount=dx===0&&dy===0?1:dx===0||dy===0?.72:.61;
      impacts.set(i,Math.max(impacts.get(i)||0,amount));
    }
    let changed=false,minX=cols,minY=rows,maxX=0,maxY=0;
    for(const [i,amount]of impacts){
      if(!isClick&&t-lastErosion[i]<75)continue;
      depth[i]+=amount;lastErosion[i]=t;changed=true;
      const x=i%cols,y=Math.floor(i/cols);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    if(!changed)return;
    let contact=false,candidate=null;
    for(const item of items){
      if(item.collected)continue;
      const gx=item.u*W/cell,gy=item.v*H/cell;
      if(gx<minX-3||gx>maxX+3||gy<minY-3||gy>maxY+3)continue;
      const old=item.coverage;expose(item);
      if(item.coverage>.001)item.touched=true;
      if(item.coverage>old+.01&&item.coverage>.05)contact=true;
      if(item.coverage>.9&&!item.discovered&&!candidate)candidate=item;
    }
    if(t-lastSound>=80){sound((end.x+.5)*cell/W,sample((end.x+.5)*cell,(end.y+.5)*cell),contact);lastSound=t;}
    const stride=Math.max(1,Math.ceil(centers.length/5));
    for(let i=0;i<centers.length;i+=stride)debris((centers[i].x+.5)*cell,(centers[i].y+.5)*cell);
    paintGround();if(candidate)showDiscovery(candidate);compose();wake();
  }
  function pointFrom(e){const r=canvas.getBoundingClientRect();return{x:clamp(e.clientX-r.left,0,W-.01),y:clamp(e.clientY-r.top,0,H-.01)};}
  function pointerDown(e){
    if(e.button!==0||e.isPrimary===false||state!=='digging')return;
    e.preventDefault();stopDrag();startAudio();
    const p=pointFrom(e),g=gridPoint(p.x,p.y);activePointer=e.pointerId;lastPointer=p;lastPointerCell=g;
    digCells([g],true);
    if(state==='digging'&&activePointer!==null)canvas.setPointerCapture(e.pointerId);
  }
  function pointerMove(e){
    if(e.pointerId!==activePointer||state!=='digging')return;
    if(e.pointerType==='mouse'&&!(e.buttons&1)){stopDrag();return;}
    e.preventDefault();const p=pointFrom(e),g=gridPoint(p.x,p.y);
    if(g.x===lastPointerCell.x&&g.y===lastPointerCell.y){lastPointer=p;return;}
    const centers=lineCells(lastPointerCell,g);lastPointer=p;lastPointerCell=g;digCells(centers,false);
  }
  function draw(t){
    frameId=0;const dt=Math.min(.034,previousTime?(t-previousTime)/1000:.016);previousTime=t;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.drawImage(scene,0,0,W,H);let active=false;
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=170*dt;
      ctx.globalAlpha=1-smooth(.4,1,p.age/p.life);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);active=true;
    }
    ctx.globalAlpha=1;
    if(found){
      const elapsed=(t-finishedAt)/1000,duration=reducedMotion?.18:.8,f=smooth(0,duration,elapsed),lift=1-Math.pow(1-f,3);
      ctx.fillStyle=`rgba(255,255,255,${f})`;ctx.fillRect(0,0,W,H);
      const x=lerp(found.u*W,W*.5,lift),y=lerp(found.v*H,H*.43,lift),size=lerp(radius*1.72,Math.min(W*.6,H*.43,280),lift);
      ctx.save();ctx.translate(x,y);ctx.rotate(lerp(found.angle,Math.sin(found.angle)*.12,lift));ctx.drawImage(found.sprite,-size/2,-size/2,size,size);ctx.restore();
      if(elapsed<duration+.1)active=true;
    }
    if(active)frameId=requestAnimationFrame(draw);
  }
  function wake(){if(!frameId){previousTime=0;frameId=requestAnimationFrame(draw);}}
  function resize(){
    stopDrag();const old=depth,oldCols=cols,oldRows=rows;
    W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);ratio=Math.min(devicePixelRatio||1,2);cell=clamp(Math.floor(Math.min(W,H)/40),10,16);radius=cell*2.15;
    cols=Math.ceil(W/cell);rows=Math.ceil(H/cell);depth=new Float32Array(cols*rows);lastErosion=new Float64Array(cols*rows);lastErosion.fill(-1000);
    if(old)for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const ox=Math.min(oldCols-1,Math.floor((x+.5)/cols*oldCols)),oy=Math.min(oldRows-1,Math.floor((y+.5)/rows*oldRows));depth[y*cols+x]=old[oy*oldCols+ox];
    }
    canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);scene.width=W;scene.height=H;terrain.width=cols;terrain.height=rows;
    imageData=tc.createImageData(cols,rows);pixels=imageData.data;paintGround();
    for(const item of items)if(!item.collected)expose(item);
    particles.length=0;compose();wake();
  }
  closeButton.addEventListener('click',closeDiscovery);
  continueButton.addEventListener('click',()=>collected===items.length?location.reload():closeDiscovery());
  restartButton.addEventListener('click',()=>location.reload());
  dialog.addEventListener('pointerdown',e=>e.stopPropagation());
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeDiscovery();}
    if(e.key==='Tab'){e.preventDefault();(document.activeElement===closeButton?continueButton:closeButton).focus();}
  });
  canvas.addEventListener('pointerdown',pointerDown,{passive:false});
  canvas.addEventListener('pointermove',pointerMove,{passive:false});
  canvas.addEventListener('pointerup',e=>{if(e.pointerId===activePointer)stopDrag();});
  canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('dblclick',e=>e.preventDefault());
  window.addEventListener('blur',stopDrag);
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);});
  document.addEventListener('visibilitychange',()=>{stopDrag();if(!document.hidden)wake();});
  // Adapter inside the original digging closure; standalone prototypes stay unchanged.
  const demoChannel = 'speedrun-midterm-v1';
  const portal = document.createElement('button');
  portal.type = 'button'; portal.id = 'portal'; portal.hidden = true;
  dialog.append(portal);
  const discoveries = document.createElement('div');
  discoveries.id = 'discovered-objects'; document.body.append(discoveries);
  const labels = { bulb: '전구', key: '열쇠', toothbrush: '칫솔', cane: '지팡이', spool: '실과 바늘', suitcase: '여행가방', chart: '검사표' }, objectButtons = new Map();
  const stageLabels = { bulb: '전구 퍼즐', key: '미로', toothbrush: '기억 속 하루', cane: '한 걸음', spool: '실 꿰기', suitcase: '짐 싸기', chart: 'MRI 검사' };
  const initialPositions = { bulb: [.42, .5], key: [.58, .5], toothbrush: [.5, .32], cane: [.5, .68], spool: [.36, .7], suitcase: [.64, .3], chart: [.72, .72] };
  let portalTimer = null;
  const notifyDemo = (type, object) => parent.postMessage({ channel: demoChannel, type, object }, '*');
  firstClick = false;
  for (const item of items) {
    // Initial demo layout only. Abandoning a minigame still reburies its object randomly.
    [item.u, item.v] = initialPositions[item.type];
    item.discovered = false;
    const button = document.createElement('button');
    button.type = 'button'; button.hidden = true; button.className = 'found-object';
    button.setAttribute('aria-label', `발견한 ${labels[item.type]} 다시 보기`);
    button.addEventListener('click', () => { if (state === 'digging' && item.discovered && !item.collected) showDiscovery(item); });
    discoveries.append(button); objectButtons.set(item.type, button);
  }
  const originalCompose = compose;
  compose = function () {
    originalCompose();
    for (const item of items) {
      const button = objectButtons.get(item.type), size = Math.max(44, radius * 1.72);
      button.hidden = !item.discovered || item.collected;
      button.style.left = `${item.u * W}px`; button.style.top = `${item.v * H}px`;
      button.style.width = button.style.height = `${size}px`;
    }
  };
  showDiscovery = function (item) {
    stopDrag(); clearTimeout(portalTimer);
    const firstDiscovery = !item.discovered;
    item.discovered = true; found = item; state = 'discovery'; finishedAt = performance.now();
    dialog.hidden = false; portal.hidden = false; portal.disabled = true;
    dialog.setAttribute('aria-label', `발견한 ${labels[item.type]}`);
    portal.setAttribute('aria-label', `발견한 ${labels[item.type]} 선택. ${stageLabels[item.type]}로 이동`);
    canvas.inert = true; discoveries.inert = true;
    document.body.dataset.phase = 'discovery'; document.body.dataset.object = item.type;
    if (firstDiscovery) { discoverySound(); debris(item.u * W, item.v * H, true); }
    compose(); wake(); closeButton.focus({ preventScroll: true });
    notifyDemo('found', item.type);
    portalTimer = setTimeout(() => {
      if (state !== 'discovery' || found !== item) return;
      portal.disabled = false;
      if (document.activeElement === closeButton) portal.focus({ preventScroll: true });
    }, reducedMotion ? 200 : 820);
  };
  closeButton.removeEventListener('click', closeDiscovery);
  closeButton.className = 'demo-back';
  closeButton.setAttribute('aria-label', '땅파기 로비로 돌아가기');
  closeDiscovery = function (restoreFocus = true) {
    if (state !== 'discovery') return;
    const item = found;
    stopDrag(); clearTimeout(portalTimer);
    dialog.hidden = true; portal.hidden = true; portal.disabled = false;
    found = null; state = 'digging'; particles.length = 0;
    canvas.inert = false; discoveries.inert = false;
    document.body.dataset.phase = 'digging'; delete document.body.dataset.object;
    compose(); wake();
    if (restoreFocus) {
      notifyDemo('dismiss');
      const button = objectButtons.get(item?.type);
      (button && !button.hidden ? button : canvas).focus({ preventScroll: true });
    }
  };
  closeButton.addEventListener('click', () => closeDiscovery());
  portal.addEventListener('click', () => {
    if (!found || portal.disabled) return;
    portal.disabled = true; stopDrag();
    if (audioContext?.state === 'running') audioContext.suspend();
    notifyDemo('enter', found.type);
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopImmediatePropagation(); event.preventDefault(); closeDiscovery(); }
    if (event.key === 'Tab') {
      event.stopImmediatePropagation(); event.preventDefault();
      const target = portal.disabled || document.activeElement === portal ? closeButton : portal;
      target.focus({ preventScroll: true });
    }
  }, true);
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '땅파기. 클릭하거나 드래그해서 땅을 팝니다. 키보드로는 Enter 또는 Space로 중앙을 팝니다.');
  canvas.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); if (state !== 'digging' || event.repeat) return;
    startAudio(); digCells([gridPoint(W * .5, H * .5)], true);
  });
  function deepestGround(u, v) {
    const halfSize = radius * 1.3;
    const a = gridPoint(u * W - halfSize, v * H - halfSize), b = gridPoint(u * W + halfSize, v * H + halfSize);
    let deepest = 0;
    for (let y = a.y; y <= b.y; y++) for (let x = a.x; x <= b.x; x++) deepest = Math.max(deepest, depth[y * cols + x]);
    return deepest;
  }
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== demoChannel) return;
    if (event.data.type === 'pause') { stopDrag(); if (audioContext?.state === 'running') audioContext.suspend(); }
    if (event.data.type === 'resume') {
      const item = LobbyRules.returnFromGame(items, event.data.object, event.data.outcome, random, deepestGround);
      if (item && !item.collected) expose(item);
      collected = items.filter(entry => entry.collected).length;
      closeDiscovery(false);
      // Never reseed on return, reset the terrain, or move any unrelated object.
      compose(); wake(); canvas.focus({ preventScroll: true });
    }
    if (event.data.type === 'focus') canvas.focus({ preventScroll: true });
  });
  document.body.dataset.phase = 'digging';

  const digCursor = StageGuide.cursor();
  let guideCell = null;
  StageGuide.create({
    duration: 7100,
    step(time, before, reduced) {
      if (state !== 'digging') return;
      const p = GuideRules.diggingPoint(time, reduced), cellPoint = gridPoint(p.u * W, p.v * H);
      for (const stamp of [3100, 3800]) if (before < stamp && time >= stamp) digCells([cellPoint], true);
      if (time >= 4100 && time <= 6400) {
        if (!guideCell || guideCell.x !== cellPoint.x || guideCell.y !== cellPoint.y) digCells(guideCell ? lineCells(guideCell, cellPoint) : [cellPoint], false);
        guideCell = cellPoint;
      }
      document.body.dataset.guideAction = time >= 3100 ? 'digging' : 'approaching';
    },
    render(time, reduced, alpha) {
      digCursor.show(time, t => { const p = GuideRules.diggingPoint(t, reduced); return { x: p.u * W, y: p.v * H, pressed: p.pressed }; }, alpha);
    },
    hide() { digCursor.hide(); },
    stop() { guideCell = null; }
  });

  resize();
})();

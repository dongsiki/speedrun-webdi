/* 엔딩 크레딧 + 이스터에그(2026-10-29 사용자: 「걍춤은 이스터에그로서 작용하는 거. 발견한 게 이 할아버지 춤인거.」)
 * 크레딧이 땅파기 로비와 같은 흰 바닥 위로 올라간다. 바닥은 크레딧 도중에도 팔 수 있고,
 * 할아버지가 묻힌 자리(표시 없음)를 계속 파면 기존 「그냥 춤」(elder-dance)이 파여 나와 춤춘다.
 * 끝나면 부모 창에 {channel:'speedrun-ending-credits-v1', type:'done', found} 를 보낸다(launch.js 참고). */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),body=document.body;
  const ground=$('ground'),ctx=ground.getContext('2d'),lines=$('roll-lines'),leave=$('leave'),world=$('world'),music=$('music');
  const terrain=document.createElement('canvas'),tc=terrain.getContext('2d');
  const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce-off)').matches;
  const ROLL_SECONDS=42;      // 크레딧이 화면 아래에서 위로 다 지나가는 시간
  const BURIAL=6;             // 이만큼 파면 그 칸 아래(할아버지)가 보인다
  const FOUND_SHARE=.38;      // 묻힌 자리 칸의 이만큼이 드러나면 발견
  const NEAR=2.1;             // 묻힌 자리 반지름의 이 배 안쪽을 파면 흙이 아주 살짝 다르게 반응
  const KEEP_DIGGING_MS=3200; // 크레딧이 끝나도 묻힌 자리를 파는 중이면 이만큼 기다린다
  let W=1,H=1,ratio=1,cell=14,cols=1,rows=1,depth=null,lastErosion=null,mask=null,maskCount=1,imageData=null;
  let spot={x:0,y:0,rx:1,ry:1},found=false,ended=false,rollStart=0,rollDone=false,lastSpotDig=-1e9,frame=0,previous=0;
  let pointer=null,lastCell=null,audio=null,lastSound=-1e3;
  const particles=[];

  // 할아버지가 화면에 서는 자리: 기존 game.js 카메라(직교, 중심 높이 .835m)를 그대로 따른다.
  function locateSpot(){
    const viewH=Number(world.dataset.cameraViewHeight)||Math.max(W/H<1?2:2.08,1.08/(W/H));
    const unit=H/viewH,cos=Math.cos(DanceReference.cameraPitch||0);
    spot={x:W/2-.066*unit,y:H/2-(1.255-.835)*cos*unit,rx:.27*unit,ry:.46*unit*cos};
  }
  function buildMask(){
    mask=new Uint8Array(cols*rows);maskCount=0;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const dx=((x+.5)*cell-spot.x)/spot.rx,dy=((y+.5)*cell-spot.y)/spot.ry;
      if(dx*dx+dy*dy<=1){mask[y*cols+x]=1;maskCount++;}
    }
    maskCount=Math.max(1,maskCount);
  }
  function paint(){
    const px=imageData.data;
    for(let i=0;i<depth.length;i++){
      const z=depth[i],p=i*4,ink=z<=0?255:z<1.6?239:z<3.5?216:z<6?181:z<9?139:z<13?94:z<18?58:35;
      px[p]=px[p+1]=px[p+2]=ink;
      px[p+3]=mask[i]&&z>=BURIAL?0:mask[i]&&z>=BURIAL-1.2?150:255;
    }
    tc.putImageData(imageData,0,0);
  }
  function compose(){
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(terrain,0,0,cols,rows,0,0,cols*cell,rows*cell);
    ctx.fillStyle='rgba(255,255,255,.14)';
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const i=y*cols+x;if(depth[i]<=0||(mask[i]&&depth[i]>=BURIAL))continue;
      ctx.fillRect(x*cell,y*cell,cell,1);ctx.fillRect(x*cell,y*cell,1,cell);
    }
    for(const p of particles){ctx.globalAlpha=1-clamp((p.age/p.life-.4)/.6);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);}
    ctx.globalAlpha=1;
  }
  function resize(){
    pointer=null;lastCell=null;
    const old=depth,oc=cols,or=rows;
    W=Math.max(1,innerWidth);H=Math.max(1,innerHeight);ratio=Math.min(devicePixelRatio||1,2);
    cell=clamp(Math.floor(Math.min(W,H)/40),10,16);cols=Math.ceil(W/cell);rows=Math.ceil(H/cell);
    depth=new Float32Array(cols*rows);lastErosion=new Float64Array(cols*rows).fill(-1e3);
    if(old)for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)depth[y*cols+x]=old[Math.min(or-1,Math.floor((y+.5)/rows*or))*oc+Math.min(oc-1,Math.floor((x+.5)/cols*oc))];
    ground.width=Math.round(W*ratio);ground.height=Math.round(H*ratio);terrain.width=cols;terrain.height=rows;
    imageData=tc.createImageData(cols,rows);locateSpot();buildMask();paint();compose();
  }

  // 소리: 땅파기 로비처럼 짧은 흙 소리. 묻힌 자리 근처에선 조금 더 둔하게.
  function startAudio(){
    if(audio)return;try{audio=new (window.AudioContext||window.webkitAudioContext)();}catch(_){audio=null;}
  }
  function scrape(near){
    if(!audio||audio.state==='closed')return;if(audio.state==='suspended')audio.resume();
    const t=audio.currentTime,len=Math.floor(audio.sampleRate*.05),buffer=audio.createBuffer(1,len,audio.sampleRate),d=buffer.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
    const src=audio.createBufferSource(),band=audio.createBiquadFilter(),gain=audio.createGain();
    src.buffer=buffer;band.type='bandpass';band.frequency.value=near?380:1100;band.Q.value=.9;
    gain.gain.value=near?.09:.05;src.connect(band).connect(gain).connect(audio.destination);src.start(t);
  }
  function debris(x,y,near,celebrate=false){
    const n=reducedMotion?2:celebrate?26:near?6:4;
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,s=(near?25:35)+Math.random()*(near?60:90);
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,age:0,life:(near?.4:.28)+Math.random()*.25,
        size:1+Math.floor(Math.random()*3),color:near&&i%2===0?'#555':i%3===0?'#222':'#999'});
    }
    if(particles.length>160)particles.splice(0,particles.length-160);
  }

  function cellAt(e){const r=ground.getBoundingClientRect();return{x:clamp(Math.floor((e.clientX-r.left)/cell),0,cols-1),y:clamp(Math.floor((e.clientY-r.top)/cell),0,rows-1)};}
  function lineCells(a,b){
    const out=[];let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=-Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;let err=dx+dy;
    for(;;){out.push({x,y});if(x===b.x&&y===b.y)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y+=sy;}}
    return out;
  }
  function dig(centers,isClick){
    if(found||ended||!centers.length)return;
    const t=performance.now(),hits=new Map();
    for(const p of centers)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=p.x+dx,y=p.y+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
      const i=y*cols+x;hits.set(i,Math.max(hits.get(i)||0,dx===0&&dy===0?1:dx===0||dy===0?.72:.61));
    }
    let changed=false;
    for(const [i,amount] of hits){if(!isClick&&t-lastErosion[i]<75)continue;depth[i]+=amount;lastErosion[i]=t;changed=true;}
    if(!changed)return;
    const end=centers[centers.length-1],ex=(end.x+.5)*cell,ey=(end.y+.5)*cell;
    const r=Math.hypot((ex-spot.x)/spot.rx,(ey-spot.y)/spot.ry),near=r<NEAR;
    if(r<1.15)lastSpotDig=t;
    if(t-lastSound>=80){scrape(near);lastSound=t;}
    const stride=Math.max(1,Math.ceil(centers.length/5));
    for(let i=0;i<centers.length;i+=stride)debris((centers[i].x+.5)*cell,(centers[i].y+.5)*cell,near);
    paint();
    let open=0;for(let i=0;i<mask.length;i++)if(mask[i]&&depth[i]>=BURIAL)open++;
    ground.dataset.uncovered=(open/maskCount).toFixed(3);
    if(open/maskCount>=FOUND_SHARE)reveal();
    wake();
  }
  ground.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.isPrimary===false||found||ended)return;
    e.preventDefault();startAudio();pointer=e.pointerId;lastCell=cellAt(e);dig([lastCell],true);
    if(pointer!==null&&!found)try{ground.setPointerCapture(e.pointerId);}catch(_){}
  },{passive:false});
  ground.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer||found)return;
    if(e.pointerType==='mouse'&&!(e.buttons&1)){pointer=null;return;}
    e.preventDefault();const c=cellAt(e);if(c.x===lastCell.x&&c.y===lastCell.y)return;
    const path=lineCells(lastCell,c);lastCell=c;dig(path,false);
  },{passive:false});
  const release=e=>{if(e.pointerId===pointer)pointer=null;};
  ground.addEventListener('pointerup',release);ground.addEventListener('pointercancel',release);

  // 발견: 땅과 크레딧이 걷히고 기존 춤 화면이 그대로 재생된다.
  function reveal(){
    if(found)return;found=true;pointer=null;
    debris(spot.x,spot.y,false,true);
    body.classList.add('found');body.dataset.found='true';
    ground.setAttribute('aria-hidden','true');$('roll').setAttribute('aria-hidden','true');leave.hidden=false;
    $('play').click(); // 기존 game.js의 재생 버튼(사용자가 파는 동작 안에서 눌러 음악이 막히지 않는다)
    window.dispatchEvent(new CustomEvent('ending-credits-found'));
    wake();
  }
  function finish(){
    if(ended)return;ended=true;
    try{music.pause();}catch(_){}
    body.dataset.ended='true';
    const message={channel:'speedrun-ending-credits-v1',type:'done',found};
    if(parent!==window)parent.postMessage(message,'*');
    window.dispatchEvent(new CustomEvent('ending-credits-done',{detail:{found}}));
  }
  leave.addEventListener('click',e=>{e.preventDefault();finish();});
  // 발견 전에는 기존 춤 화면의 스페이스(재생) 단축키가 땅 아래에서 음악을 켜지 않게 막는다.
  window.addEventListener('keydown',e=>{if(!found&&e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();}},true);

  function tick(t){
    frame=0;const dt=Math.min(.034,previous?(t-previous)/1000:.016);previous=t;let active=false;
    if(!found&&!rollDone){
      if(!rollStart)rollStart=t;
      const k=clamp((t-rollStart)/1000/ROLL_SECONDS),h=lines.offsetHeight;
      lines.style.transform=`translateY(${(H-(H+h)*k).toFixed(1)}px)`;body.dataset.roll=k.toFixed(3);
      if(k>=1)rollDone=true;else active=true;
    }
    if(rollDone&&!found&&!ended){
      if(t-lastSpotDig>KEEP_DIGGING_MS)finish();else active=true;
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=170*dt;active=true;}
    if(!found||particles.length)compose();
    if(active)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame){previous=0;frame=requestAnimationFrame(tick);}}
  addEventListener('resize',()=>{resize();wake();});
  resize();wake();
  window.EndingCreditsScene={reveal,finish,get found(){return found;},get spot(){return {...spot};}};
})();

(()=>{'use strict';
  const R=SuitcaseRules,A=SuitcaseScene,$=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false}),channel='speedrun-midterm-v1';
  const embedded=parent!==window,buttons=new Map();let g,state,drag=null,paused=false,last=0,raf=0,audio=null;
  // 10/29 페이즈(Claude Code): 1페 = 그대로, 2페 = 게임 비활성화(가방이 잠겨 아무것도 못 함), 3페 = 닫은 뒤 더 깊은 컷씬(cut3.js).
  // 페이즈는 #phase=2 주소, window.SUITCASE_PHASE, 또는 부모의 {type:'phase',phase} 메시지로 정한다. 없으면 1페.
  const A3=Object.assign({},A,{items:R.ITEMS}),LOCK=4.2;
  let P=(()=>{let p=1;try{const m=/(?:^#|[#&])phase=([123])/.exec(window.location.hash);if(m)p=+m[1];}catch{}const w=Number(window.SUITCASE_PHASE);return [1,2,3].includes(w)?w:p;})();
  function fresh(){return {stagePhase:P,knock:-10,phase:P===2?'locked':'pack',selected:[],placed:[],elapsed:0,t:0,returns:0,overflows:0,blocked:'',blockedAt:-10,reported:false,sequence:[],cut:0,hover:'',guide:0};}
  function speak(text){$('status').textContent=text;}
  function sound(soft=false){try{if(!audio)audio=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{});const o=audio.createOscillator(),a=audio.createGain();o.type='triangle';o.frequency.value=soft?185:340;a.gain.setValueAtTime(.018,audio.currentTime);a.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.1);o.connect(a).connect(audio.destination);o.start();o.stop(audio.currentTime+.12);}catch{}}
  function point(e){return {x:(e.clientX-g.ox)/g.scale,y:(e.clientY-g.oy)/g.scale};}
  function location(id){
    const i=R.ITEMS.findIndex(x=>x.id===id),p=state.placed.find(x=>x.id===id);
    if(!p)return {x:g.home[i][0],y:g.home[i][1],size:116,angle:(i%2?1:-1)*.065};
    const box={photo:[.8,.86],bear:[.7,.95],clock:[.88,.85],keys:[.68,.82],cloth:[.88,.58],pills:[.49,.87],book:[.8,.88],cassette:[.94,.62],letter:[.86,.62],pencil:[.68,.78]}[id];
    const dims=p.rotated?[box[1],box[0]]:box,w=p.w*g.grid.cell*.86,h=p.h*g.grid.cell*.86,size=Math.min(w/dims[0],h/dims[1]);
    return {x:g.grid.x+(p.x+p.w/2)*g.grid.cell,y:g.grid.y+(p.y+p.h/2)*g.grid.cell,size,angle:p.rotated?Math.PI/2:0,stretchX:Math.min(1.22,w/(size*dims[0])),stretchY:Math.min(1.22,h/(size*dims[1]))};
  }
  function sync(){
    for(const item of R.ITEMS){const b=buttons.get(item.id),p=location(item.id),size=Math.max(48,p.size*g.scale);b.style.left=(g.ox+p.x*g.scale-size/2)+'px';b.style.top=(g.oy+p.y*g.scale-size/2)+'px';b.style.width=b.style.height=size+'px';b.disabled=state.phase!=='pack';b.hidden=state.phase!=='pack';b.setAttribute('aria-pressed',String(state.selected.includes(item.id)));b.setAttribute('aria-label',item.name+' · '+item.w*item.h+'칸 · '+(state.selected.includes(item.id)?'꺼내기':'가방에 넣기'));}
    const c=$('close'),s=Math.max(48,66*g.scale);c.style.left=(g.ox+g.close.x*g.scale-s/2)+'px';c.style.top=(g.oy+g.close.y*g.scale-s/2)+'px';c.style.width=c.style.height=s+'px';c.hidden=state.phase!=='pack';
  }
  function toggle(id,want){
    if(state.phase!=='pack')return false;
    const inside=state.selected.includes(id);if(want===undefined)want=!inside;if(want===inside)return true;
    const next=want?[...state.selected,id]:state.selected.filter(x=>x!==id),placed=R.arrange(next);
    if(!placed){state.overflows++;state.blocked=id;state.blockedAt=state.elapsed;speak('가방에 더 들어가지 않습니다. 다른 물건을 꺼낼 수 있습니다.');sound(true);return false;}
    if(inside&&!want)state.returns++;state.selected=next;state.placed=placed;state.guide=3;
    speak(R.ITEMS.find(x=>x.id===id).name+(want?'을 가방에 넣었습니다.':'을 다시 꺼냈습니다.'));sound();sync();return true;
  }
  function closeCase(){if(state.phase!=='pack')return;drag=null;state.phase='closing';state.t=0;state.sequence=R.memories(state.selected);sound(true);sync();speak('가방을 닫았습니다.');}
  function report(type){if(state.reported)return;state.reported=true;if(P!==2)parent.postMessage(R.result(state,type),'*');parent.postMessage({channel,type},'*');}
  function reset(){state=fresh();drag=null;paused=false;last=0;$('again').hidden=true;sync();canvas.dataset.stagePhase=String(P);speak(P===2?'가방이 잠겨 있습니다.':'열린 가방과 열 가지 물건이 있습니다.');}
  function knock(){if(state.phase!=='locked')return;state.knock=state.elapsed;sound(true);}
  for(const item of R.ITEMS){
    const b=document.createElement('button');b.type='button';b.dataset.item=item.id;$('objects').append(b);buttons.set(item.id,b);
    b.addEventListener('click',e=>{if(e.detail===0)toggle(item.id);});
    b.addEventListener('pointerdown',e=>{if(state.phase!=='pack'||!e.isPrimary||e.button>0)return;const p=point(e);drag={id:item.id,start:p,p,move:false};b.setPointerCapture(e.pointerId);});
    b.addEventListener('pointermove',e=>{state.hover=item.id;if(!drag||drag.id!==item.id)return;drag.p=point(e);if(Math.hypot(drag.p.x-drag.start.x,drag.p.y-drag.start.y)>9)drag.move=true;});
    b.addEventListener('pointerleave',()=>{state.hover='';});
    b.addEventListener('pointerup',e=>{if(!drag||drag.id!==item.id)return;const d=drag;drag=null;if(d.move){const p=point(e),inBag=p.x>g.bag.x&&p.x<g.bag.x+g.bag.w&&p.y>g.bag.y&&p.y<g.bag.y+g.bag.h;toggle(item.id,inBag);}else toggle(item.id);});
    b.addEventListener('pointercancel',()=>{drag=null;});
    b.addEventListener('focus',()=>{state.hover=item.id;});b.addEventListener('blur',()=>{state.hover='';});
  }
  $('close').addEventListener('click',closeCase);canvas.addEventListener('pointerdown',knock);$('again').addEventListener('click',reset);
  $('back').addEventListener('click',()=>{if(state.reported&&embedded)return;state.phase='left';paused=true;drag=null;if(audio)audio.suspend().catch(()=>{});if(embedded)report('back');else reset();sync();});
  function drawPack(closed=0){
    A.bag(ctx,g,closed);
    if(closed<.8)for(const p of state.placed){if(drag?.id===p.id&&drag.move)continue;const l=location(p.id);ctx.save();ctx.translate(l.x,l.y);ctx.scale(l.stretchX,l.stretchY);A.object(ctx,p.id,0,0,l.size,l.angle);ctx.restore();}
    for(const item of R.ITEMS){if(state.selected.includes(item.id)||drag?.id===item.id&&drag.move)continue;const p=location(item.id),shake=state.blocked===item.id&&state.elapsed-state.blockedAt<.5?Math.sin((state.elapsed-state.blockedAt)*44)*7:0;A.object(ctx,item.id,p.x+shake,p.y,p.size,p.angle);}
    if(drag?.move)A.object(ctx,drag.id,drag.p.x,drag.p.y,110,.05);
    if(state.phase==='pack'&&state.elapsed<5.4&&state.guide<3&&Math.floor(state.elapsed/.9)%2===0){
      const p=state.elapsed<2.7?location('photo'):g.close;ctx.save();ctx.strokeStyle='#000';ctx.lineWidth=1.5;ctx.setLineDash([2,6]);ctx.beginPath();ctx.ellipse(p.x,p.y,state.elapsed<2.7?78:40,state.elapsed<2.7?80:33,-.15,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  function padlock(){
    const k=g.close,dt=state.elapsed-state.knock,sh=dt<.35?Math.sin(dt*60)*4*(1-dt/.35):0;
    ctx.save();ctx.translate(k.x+sh,k.y+4);A.stroke(ctx,'M -13 -8 L -13 -22 Q -13 -36 0 -36 Q 13 -36 13 -22 L 13 -8',5);
    A.path(ctx,'M -20 -10 L 20 -10 L 20 22 L -20 22 Z','#000',1);A.oval(ctx,0,3,3.5,3.5,'#fff',0);A.stroke(ctx,'M 0 5 L 0 13',0);ctx.fillStyle='#fff';ctx.fillRect(-1.5,4,3,9);ctx.restore();
  }
  function update(dt){
    state.elapsed+=dt;state.t+=dt;const T=R.TIMING;
    if(state.phase==='locked'&&state.t>=LOCK){state.phase='fade';state.t=0;}
    else if(state.phase==='closing'&&state.t>=T.close){state.phase=P===3?'cut3':'memory';state.t=0;state.cut=0;}
    else if(state.phase==='cut3'&&state.t>=SuitcaseCut3.total(state.selected)){state.phase='fade';state.t=0;sync();}
    else if(state.phase==='memory'){
      const key=state.sequence[state.cut],duration=key==='departure'?T.departure:key.startsWith('combination-')?T.combination:T.memory;
      if(state.t>=duration){state.t=0;state.cut++;if(state.cut>=state.sequence.length){state.phase='fade';sync();}}
    }else if(state.phase==='fade'&&state.t>=T.fade&&state.preview){reset();}
    else if(state.phase==='fade'&&state.t>=T.fade){state.phase='done';report('complete');$('again').hidden=embedded;speak(P===2?'가방은 열리지 않았습니다.':'남은 물건을 두고 떠났습니다.');}
  }
  function draw(){
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    const q=A.STYLE.pixel;ctx.setTransform(q*g.scale,0,0,q*g.scale,q*g.ox,q*g.oy);ctx.lineJoin='round';ctx.lineCap='round';
    if(state.phase==='pack')drawPack();
    else if(state.phase==='locked'){drawPack(1);padlock();}
    else if(state.phase==='cut3'){canvas.dataset.scene=SuitcaseCut3.draw(A3,ctx,state.t,g,state.selected);}
    else if(state.phase==='fade'&&P===3){ctx.fillStyle='#fff';ctx.fillRect(-g.ox/g.scale,-g.oy/g.scale,g.w/g.scale,g.h/g.scale);}
    else if(state.phase==='closing')drawPack(Math.min(1,state.t/R.TIMING.close));
    else if(state.phase==='memory'){
      const key=state.sequence[state.cut];canvas.dataset.scene=key;
      if(key==='departure')drawPack(1);else A.memory(ctx,key.startsWith('memory-')?key.slice(7):key,state.t,g,state.selected);
      // A short stippled edge joins memories without an explanatory title.
      if(state.t<.13){ctx.save();ctx.globalAlpha=1-state.t/.13;ctx.fillStyle='#fff';ctx.fillRect(0,0,g.vw,g.vh);ctx.restore();}
    }else if(state.phase==='fade'){drawPack(1);if(P===2)padlock();ctx.fillStyle=`rgba(255,255,255,${Math.min(1,state.t/R.TIMING.fade)})`;ctx.fillRect(-g.ox/g.scale,-g.oy/g.scale,g.w/g.scale,g.h/g.scale);}
    canvas.dataset.phase=state.phase;canvas.dataset.selected=state.selected.join(',');canvas.dataset.signature=R.signature(state.selected);
  }
  function resize(){g=A.layout(innerWidth,innerHeight);canvas.width=Math.max(1,Math.round(innerWidth*A.STYLE.pixel));canvas.height=Math.max(1,Math.round(innerHeight*A.STYLE.pixel));drag=null;sync();draw();}
  function frame(now){raf=requestAnimationFrame(frame);const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(paused||document.hidden)return;if(state.phase!=='done'&&state.phase!=='left')update(dt);draw();}
  window.addEventListener('resize',resize);window.addEventListener('blur',()=>{drag=null;last=0;});
  document.addEventListener('visibilitychange',()=>{drag=null;last=0;if(audio&&document.hidden)audio.suspend().catch(()=>{});});
  window.addEventListener('message',e=>{if(e.source!==parent||e.data?.channel!==channel)return;if(e.data.type==='pause'){paused=true;drag=null;if(audio)audio.suspend().catch(()=>{});}else if(e.data.type==='focus'){paused=false;last=0;}else if(['restart','reset'].includes(e.data.type))reset();});
  // 10/31 개발자용 컷신 버튼: 부모의 {type:'cutscene'} 메시지로 게임 없이 이 페이즈 컷신만 본다(1페 기억 장면·3페 깊은 컷신, 2페는 없음). 끝나면 처음 화면으로.
  window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='cutscene'||P===2)return;reset();state.preview=true;state.selected=R.ITEMS.slice(0,4).map(x=>x.id);state.sequence=R.memories(state.selected);state.phase=P===3?'cut3':'memory';state.t=0;state.cut=0;drag=null;sound(true);sync();});
  window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='phase'||![1,2,3].includes(Number(e.data.phase)))return;P=Number(e.data.phase);reset();});
  window.addEventListener('pagehide',()=>{paused=true;cancelAnimationFrame(raf);if(audio)audio.close().catch(()=>{});});
  state=fresh();resize();raf=requestAnimationFrame(frame);
  window.SuitcaseTest=Object.freeze({get phase(){return P;},setPhase(n){P=n;reset();},get state(){return JSON.parse(JSON.stringify(state));},get geometry(){return g;},get catalog(){return R.ITEMS;},snapshot:()=>R.result(state,state.phase)});
})();

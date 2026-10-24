(function (root) {
  'use strict';
  const sprite = Object.freeze({ width:512, height:1024, frames:5, anchor:Object.freeze({x:272,y:8}), rasterWidth:128, rasterHeight:256,
    sourceWidth:396, sourceHeight:793, sourceLeft:Object.freeze([0,390,780,1170,1562]) });
  const motion = Object.freeze({followSeconds:1.2,celSeconds:.18,curledHold:.42,openHold:.62,settleDistance:.3});
  function near(point,rect,wasNear=false) {
    const dx=Math.max(rect.left-point.x,0,point.x-rect.right),dy=Math.max(rect.top-point.y,0,point.y-rect.bottom);
    return Math.hypot(dx,dy)<=(wasNear?38:24);
  }
  function layout(point,viewport) {
    const height=Math.max(600,viewport.height*1.22),scale=height/sprite.height;
    return {x:point.x-sprite.anchor.x*scale,y:point.y-sprite.anchor.y*scale,width:sprite.width*scale,height};
  }
  function advance(state,target,rect,dt,reduced=false) {
    const amount=reduced?1:1-Math.exp(-Math.min(.064,Math.max(0,dt))/motion.followSeconds);
    state.x+=(target.x-state.x)*amount;state.y+=(target.y-state.y)*amount;
    const distance=Math.hypot(target.x-state.x,target.y-state.y);
    if(distance<motion.settleDistance){state.x=target.x;state.y=target.y;}
    const wasNear=state.near;
    state.near=near(state,rect,wasNear);
    if(state.near!==wasNear){state.goal=state.near?sprite.frames-1:0;state.celTime=0;state.holdTime=0;}
    if(reduced){state.goal=state.near?sprite.frames-1:0;state.frame=state.goal;state.celTime=0;state.holdTime=0;}
    else if(state.frame!==state.goal){
      state.celTime+=Math.min(.064,Math.max(0,dt));
      while(state.celTime>=motion.celSeconds&&state.frame!==state.goal){state.celTime-=motion.celSeconds;state.frame+=Math.sign(state.goal-state.frame);}
    }else if(state.near){
      state.holdTime=(state.holdTime||0)+Math.min(.064,Math.max(0,dt));
      const hold=state.frame===0?motion.openHold:motion.curledHold;
      if(state.holdTime>=hold){state.goal=state.frame===0?sprite.frames-1:0;state.holdTime=0;state.celTime=0;}
    }else{state.celTime=0;state.holdTime=0;}
    return distance>=motion.settleDistance||state.frame!==state.goal||(!reduced&&state.near);
  }
  function oneBit(data,width) {
    const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]<128){data[i]=data[i+1]=data[i+2]=data[i+3]=0;continue;}
      const p=i/4,x=p%width,y=Math.floor(p/width),threshold=128+(bayer[(y%4)*4+x%4]-7.5)*4;
      const ink=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)>=threshold?255:0;
      data[i]=data[i+1]=data[i+2]=ink;data[i+3]=255;
    }
    return data;
  }
  function rasterize(art,doc) {
    return Array.from({length:sprite.frames},(_,i)=>{
      const cel=doc.createElement('canvas');cel.width=sprite.rasterWidth;cel.height=sprite.rasterHeight;
      const ctx=cel.getContext('2d',{willReadFrequently:true}),scale=art.naturalHeight/sprite.sourceHeight;
      // Keep the wrist registered between cels despite small margins in the generated sheet.
      ctx.drawImage(art,sprite.sourceLeft[i]*scale,0,sprite.sourceWidth*scale,art.naturalHeight,0,0,cel.width,cel.height);
      const pixels=ctx.getImageData(0,0,cel.width,cel.height);oneBit(pixels.data,cel.width);ctx.putImageData(pixels,0,0);return cel;
    });
  }
  function mount(intro,button,hand,art,canvas,env=root) {
    const doc=env.document,fine=env.matchMedia('(any-pointer: fine)'),reduced=env.matchMedia('(prefers-reduced-motion:reduce-off)'),ctx=canvas.getContext('2d');
    let ready=false,point=null,state=null,frames=[],drawn=-1,raf=0,lastTime=0,keyboard=false,outside=false,disposed=false;
    const cleanups=[];
    function listen(target,name,listener,options){target.addEventListener(name,listener,options);cleanups.push(()=>target.removeEventListener(name,listener,options));}
    function stop(){if(raf)env.cancelAnimationFrame(raf);raf=0;lastTime=0;}
    function hide(){stop();hand.hidden=true;intro.classList.remove('hand-tracking');hand.dataset.active='false';}
    function allowed(){return !disposed&&ready&&!keyboard&&!outside&&!doc.hidden&&!intro.hidden&&doc.body.dataset.stage==='intro'&&!button.disabled&&button.getAttribute('aria-checked')==='true'&&(point||fine.matches);}
    function target(rect){const p=point||{x:Math.min(env.innerWidth-20,rect.right+38),y:rect.bottom+46};return {x:Math.max(0,Math.min(env.innerWidth-1,p.x)),y:Math.max(0,Math.min(env.innerHeight-1,p.y))};}
    function paint(aim){
      const box=layout(state,{width:env.innerWidth,height:env.innerHeight});
      hand.style.width=box.width+'px';hand.style.height=box.height+'px';hand.style.transform=`translate3d(${Math.round(box.x)}px,${Math.round(box.y)}px,0)`;
      if(drawn!==state.frame){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(frames[state.frame],0,0);drawn=state.frame;}
      Object.assign(hand.dataset,{active:'true',pose:state.frame===0?'open':state.frame===4?'curled':'bending',frame:String(state.frame),targetX:aim.x.toFixed(2),targetY:aim.y.toFixed(2),followX:state.x.toFixed(2),followY:state.y.toFixed(2),mode:point?'following':'waiting'});
      hand.hidden=false;intro.classList.add('hand-tracking');
    }
    function tick(time){
      raf=0;if(!allowed()){hide();return;}
      const rect=button.getBoundingClientRect(),aim=target(rect),dt=lastTime?(time-lastTime)/1000:1/60;lastTime=time;
      const moving=advance(state,aim,rect,dt,reduced.matches);paint(aim);
      if(moving)raf=env.requestAnimationFrame(tick);else lastTime=0;
    }
    function render(){
      if(!allowed()){hide();return;}
      const aim=target(button.getBoundingClientRect());if(!state)state={...aim,frame:0,near:false,goal:0,celTime:0};
      paint(aim);if(!raf)raf=env.requestAnimationFrame(tick);
    }
    function track(event){
      if(event.pointerType==='touch'){point=null;keyboard=true;hide();return;}
      if(event.pointerType&&event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
      point={x:event.clientX,y:event.clientY};keyboard=false;outside=false;render();
    }
    function loaded(){try{frames=rasterize(art,doc);ready=art.naturalWidth>0;drawn=-1;render();}catch(_){ready=false;hide();}}
    listen(art,'load',loaded);listen(art,'error',()=>{ready=false;hide();});
    for(const name of ['pointermove','pointerenter','pointerdown'])listen(intro,name,track,{passive:true});
    listen(intro,'pointerleave',()=>{outside=true;hide();});listen(doc,'keydown',()=>{keyboard=true;hide();},true);listen(env,'blur',()=>{outside=true;hide();});
    listen(doc,'visibilitychange',()=>{if(doc.hidden)hide();else render();});listen(env,'resize',render);listen(fine,'change',render);listen(reduced,'change',render);
    const observer=new env.MutationObserver(render);
    observer.observe(button,{attributes:true,attributeFilter:['aria-checked','disabled']});observer.observe(intro,{attributes:true,attributeFilter:['hidden']});observer.observe(doc.body,{attributes:true,attributeFilter:['data-stage']});
    function dispose(){if(disposed)return;disposed=true;hide();observer.disconnect();cleanups.splice(0).forEach(fn=>fn());frames=[];}
    listen(env,'pagehide',event=>{if(event.persisted)hide();else dispose();});listen(env,'pageshow',render);
    if(art.complete)loaded();return {dispose,render};
  }
  const api={sprite,motion,near,layout,advance,oneBit,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.document){root.IntroHand=api;const $=id=>root.document.getElementById(id);mount($('intro'),$('ai-switch'),$('ai-hand'),$('ai-hand-art'),$('ai-hand-pixels'));}
})(typeof window==='undefined'?globalThis:window);

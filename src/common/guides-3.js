(() => {
  'use strict';
  const $=id=>document.getElementById(id),frame=$('stage'),channel='speedrun-midterm-v1';
  const motion=matchMedia('(prefers-reduced-motion:reduce-off)'),rewind=FailureRewind.create($('failure-rewind'),motion);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let busy=false,playing=false,loaded=false;
  function send(type,detail={}){frame.contentWindow?.postMessage({channel,type,...detail},'*');}
  function start(){
    if(busy)return;
    playing=false;loaded=false;rewind.watch(null);$('finish').hidden=true;frame.hidden=false;
    document.body.dataset.phase='loading';$('status').textContent='';
    frame.srcdoc=DevStage.html;
  }
  frame.addEventListener('load',()=>{
    if(loaded||!frame.contentDocument?.getElementById('stage-back'))return;
    loaded=true;playing=true;document.body.dataset.phase='playing';
    frame.contentWindow.focus();send('focus');
    send('interference-state',{used:false});send('maze-state',{collisionLineSeen:false});
    frame.contentDocument.addEventListener('pointerdown',rewind.armAudio,{once:true});
    frame.contentDocument.addEventListener('keydown',rewind.armAudio,{once:true});
    rewind.watch(frame);send('guide');
  });
  async function finish(outcome){
    if(!playing||busy)return;
    busy=true;playing=false;document.body.dataset.phase=outcome;send('pause');
    if(outcome==='fail')await rewind.cover(frame);
    else{rewind.watch(null);$('whiteout').classList.add('covered');await sleep(motion.matches?110:440);}
    frame.hidden=true;$('finish').hidden=false;
    if(outcome==='fail')await rewind.reveal();
    else{$('whiteout').classList.remove('covered');await sleep(motion.matches?110:440);}
    busy=false;$('again').focus({preventScroll:true});
  }
  window.addEventListener('message',event=>{
    if(event.source!==frame.contentWindow||event.data?.channel!==channel)return;
    if(['back','complete','fail'].includes(event.data.type))finish(event.data.type);
  });
  $('again').addEventListener('click',start);
  window.addEventListener('pagehide',()=>{send('pause');rewind.watch(null);});
  window.addEventListener('pageshow',event=>{if(event.persisted)start();});
  start();
})();

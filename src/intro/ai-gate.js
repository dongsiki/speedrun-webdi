/* A finite play-only gate. Release invokes the original switch exactly once. */
(()=>{'use strict';
 if(window.AIOffGate)return;
 const CONFIG=Object.freeze({holdMs:1350,moveMs:430});
 const $=id=>document.getElementById(id),button=$('ai-switch'),control=button.closest('.ai-control'),paper=$('ai-gate-paper'),dismiss=$('ai-gate-dismiss'),speech=$('ai-gate-speech'),manual=$('ai-gate-stop');
 let phase='ready',moved=false,holding=false,started=0,raf=0,kind='',released=false,wasIntro=document.body.dataset.stage==='intro';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function set(next){phase=next;document.body.dataset.aiGate=next;}
 function announce(text){$('ai-gate-a11y').textContent=text;}
 function hide(){paper.hidden=speech.hidden=manual.hidden=true;}
 function fit(el,x,y){const r=el.getBoundingClientRect();el.style.left=Math.round(clamp(x,16,Math.max(16,innerWidth-r.width-16)))+'px';el.style.top=Math.round(clamp(y,14,Math.max(14,innerHeight-r.height-14)))+'px';}
 function position(){
   if(holding)cancelHold();
   if(moved){const r=button.getBoundingClientRect(),transform=getComputedStyle(control).transform,currentY=transform==='none'?0:new DOMMatrixReadOnly(transform).m42,dx=-Math.min(180,Math.max(0,(innerWidth-r.width)/2-22)),dy=innerHeight<480?0:Math.min(88,Math.max(0,innerHeight-(r.bottom-currentY)-180));control.style.transform=`translate(${dx}px,${dy}px)`;}
   const r=button.getBoundingClientRect(),cx=(r.left+r.right)/2;
   if(phase==='paper')fit(paper,cx-paper.getBoundingClientRect().width/2,r.top-28);
   if(!speech.hidden)fit(speech,cx-speech.getBoundingClientRect().width/2,innerHeight<480?r.top-48:r.bottom+3);
   if(!manual.hidden)fit(manual,cx-manual.getBoundingClientRect().width/2,innerHeight<480?r.bottom+2:r.bottom+44);
 }
 function message(text){speech.textContent=text;speech.hidden=false;position();}
 function firstBlock(){set('paper');paper.hidden=false;speech.hidden=manual.hidden=true;position();dismiss.focus({preventScroll:true});announce('AI가 쪽지로 스위치를 가렸습니다. 직접 할게요를 누르면 치울 수 있습니다.');}
 function moveOnce(){if(phase!=='paper')return;paper.hidden=true;moved=true;set('moved');message('굳이 직접 하실 필요 없어요.');position();setTimeout(()=>{if(phase==='moved'){position();button.focus({preventScroll:true});}},CONFIG.moveMs+10);announce('쪽지를 치웠습니다. 스위치가 한 번 이동했습니다.');}
 function finalBlock(){set('hold');manual.hidden=false;manual.style.setProperty('--hold',0);message('제가 하면 더 편하실 텐데요.');position();manual.focus({preventScroll:true});announce('수동 종료를 길게 누르세요. 스페이스나 엔터를 계속 누르는 방법도 같습니다.');}
 function eligible(target){return target===button||button.contains(target)||target===manual||manual.contains(target);}
 function cancelHold(){if(!holding)return;holding=false;cancelAnimationFrame(raf);raf=0;manual.style.setProperty('--hold',0);set('hold');}
 function release(){
   if(released)return;released=true;holding=false;raf=0;set('done');paper.hidden=manual.hidden=true;speech.textContent='이제 직접 하세요.';speech.hidden=false;position();announce('AI를 직접 종료했습니다.');
   // The existing app performs OFF, stores the run, and loads the digging lobby.
   button.click();
 }
 function tick(now){if(!holding)return;if(document.hidden){cancelHold();return;}const p=clamp((now-started)/CONFIG.holdMs,0,1);manual.style.setProperty('--hold',p.toFixed(3));if(p>=1)release();else raf=requestAnimationFrame(tick);}
 function beginHold(input){if(!['hold','holding'].includes(phase)||holding)return;holding=true;kind=input;started=performance.now();set('holding');raf=requestAnimationFrame(tick);}
 function click(e){
   if(document.body.dataset.stage!=='intro'||phase==='done')return;
   if(e.target.closest?.('#ai-gate-dismiss')){e.preventDefault();e.stopImmediatePropagation();moveOnce();return;}
   if(!eligible(e.target))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(phase==='ready')firstBlock();else if(phase==='moved')finalBlock();
   else if(phase==='paper')dismiss.focus({preventScroll:true});
   else announce('길게 눌러 직접 끌 수 있습니다.');
 }
 function down(e){if(document.body.dataset.stage!=='intro'||!['hold','holding'].includes(phase)||!eligible(e.target)||!e.isPrimary||e.button>0)return;e.preventDefault();e.stopImmediatePropagation();beginHold('pointer');}
 function keydown(e){
   if(document.body.dataset.stage!=='intro')return;
   if(e.key==='Escape'){if(phase==='paper'){e.preventDefault();moveOnce();}else cancelHold();return;}
   if(['hold','holding'].includes(phase)&&eligible(e.target)&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)beginHold('key');}
 }
 function keyup(e){if(kind==='key'&&(e.code==='Space'||e.code==='Enter')){if(holding){e.preventDefault();e.stopImmediatePropagation();cancelHold();}}}
 function pointermove(e){if(!holding||kind!=='pointer')return;const r=manual.getBoundingClientRect(),b=button.getBoundingClientRect(),inside=t=>e.clientX>=t.left-22&&e.clientX<=t.right+22&&e.clientY>=t.top-22&&e.clientY<=t.bottom+22;if(!inside(r)&&!inside(b))cancelHold();}
 function reset(){cancelHold();hide();moved=released=false;control.style.transform='';manual.style.setProperty('--hold',0);set('ready');}
 document.addEventListener('click',click,true);document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',pointermove,true);
 document.addEventListener('pointerup',cancelHold,true);document.addEventListener('pointercancel',cancelHold,true);document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',keyup,true);
 window.addEventListener('blur',cancelHold);window.addEventListener('resize',position);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHold();});
 const observer=new MutationObserver(()=>{const intro=document.body.dataset.stage==='intro';if(!intro){cancelHold();hide();}else if(!wasIntro)reset();wasIntro=intro;});observer.observe(document.body,{attributes:true,attributeFilter:['data-stage']});
 window.addEventListener('pagehide',()=>{cancelHold();observer.disconnect();});
 window.AIOffGate=Object.freeze({get phase(){return phase;},get holding(){return holding;},get released(){return released;},CONFIG});reset();
})();

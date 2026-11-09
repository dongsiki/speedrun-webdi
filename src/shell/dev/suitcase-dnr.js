/* 개발자용 02 짐 싸기: 2페(잠긴 가방) 때 가방 옆에 「연명치료 거부」 서류가 놓여 있다(11/07 AI 집착 단서, ai-cling.js의 서류 그림). 본편 01에는 없다.
   페이즈는 02 위쪽 버튼이 보내는 {type:'phase', phase} 또는 window.SUITCASE_PHASE(짐 싸기 game.js와 같은 방법)로 안다. */
(() => {
  'use strict';
  const spot = document.createElement('div');
  spot.id = 'suitcase-dnr'; spot.hidden = true;
  spot.style.cssText = 'position:fixed;left:29vw;top:13vh;width:min(140px,15vw);z-index:5;pointer-events:none;font-size:clamp(5px,.75vw,8px)';
  const sheet = AiCling.paper(-7); sheet.style.width = '100%'; sheet.style.fontSize = 'clamp(5px,.55vw,7px)'; sheet.style.boxShadow = '2px 3px 0 rgba(0,0,0,.15)';
  spot.append(sheet);
  const set = p => { spot.hidden = Number(p) !== 2; };
  const mount = () => { document.body.append(spot); set(window.SUITCASE_PHASE || (/(?:^#|[#&])phase=([123])/.exec(location.hash) || [])[1] || 1); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
  addEventListener('message', e => { if (e.data && e.data.type === 'phase') set(e.data.phase); });
})();

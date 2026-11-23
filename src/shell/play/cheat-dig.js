/* 01(실제 플레이용) 치트: 땅파기 물건을 모래 위에 보이기(2026-11-24, Claude Code).
   사용자 11/24 00:00 「치트활성화 되면 모래에 숨겨져있는 오브젝트들이 모래위로 보여서 선택하면 바로 해당 게임으로 가게끔 해줘」,
   되묻기(P 키로 치트 버튼이 보이는 동안 아직 안 깬 물건을 묻힌 자리 모래 위에 그림으로, 누르면 파지 않고 바로 그 게임,
   P로 끄면 원래대로)에 「ㅇㅇ」.
   땅파기 문서(DemoDocuments.digging)에 작은 코드를 끼워 넣는다. 1·2페(phase.js)·3페(dig3.js) 땅파기가 모두 이 문서에서 나오므로
   그것들이 문서를 읽기 전(documents.js 바로 뒤)에 실행한다. 치트가 켜졌는지는 phase-buttons.js의 window.PlayCheat로 본다.
   누르면 원래 발견 → 포털과 같은 길(found → enter)로 들어간다. 02의 땅파기 소스(src/stages/digging/game.js)는 그대로. */
(() => {
  'use strict';
  if (typeof DemoDocuments === 'undefined' || typeof DemoDocuments.digging !== 'string') return;
  const anchor = "  window.addEventListener('message', event => {\n    if (event.source !== parent || event.data?.channel !== demoChannel) return;";
  if (!DemoDocuments.digging.includes(anchor)) return;
  const hook = `  {
    // 01 치트(src/shell/play/cheat-dig.js): 치트가 켜져 있으면 아직 안 깬 물건을 모래 위에, 누르면 바로 그 게임으로
    const cheatLayer = document.createElement('div');
    cheatLayer.id = 'cheat-objects'; cheatLayer.hidden = true;
    cheatLayer.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none';
    document.body.append(cheatLayer);
    const cheatOn = () => { try { return !!(parent.PlayCheat && parent.PlayCheat.on); } catch (_) { return false; } };
    const cheatButtons = new Map();
    const renderCheat = () => {
      const on = cheatOn() && state === 'digging';
      cheatLayer.hidden = !on;
      if (!on) return;
      const size = Math.max(44, radius * 1.72);
      for (const item of items) {
        let b = cheatButtons.get(item);
        if (!b) {
          b = document.createElement('button'); b.type = 'button'; b.className = 'cheat-object'; b.dataset.object = item.type;
          b.setAttribute('aria-label', labels[item.type] + ' · ' + stageLabels[item.type] + '로 바로 가기');
          b.style.cssText = 'position:absolute;transform:translate(-50%,-50%);padding:0;border:0;background:none;cursor:pointer;pointer-events:auto';
          const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.src = item.sprite.toDataURL();
          img.style.cssText = 'display:block;width:100%;height:100%';
          b.append(img);
          b.addEventListener('click', event => {
            event.stopPropagation();
            if (state !== 'digging' || item.collected) return;
            showDiscovery(item); clearTimeout(portalTimer); portal.disabled = false; portal.click();
          });
          cheatLayer.append(b); cheatButtons.set(item, b);
        }
        b.hidden = !!item.collected;
        b.style.left = item.u * W + 'px'; b.style.top = item.v * H + 'px';
        b.style.width = b.style.height = size + 'px';
      }
    };
    const composeBeforeCheat = compose;
    compose = function () { composeBeforeCheat(); renderCheat(); };
    window.addEventListener('message', event => { if (event.data && event.data.channel === 'speedrun-play-cheat') renderCheat(); });
    renderCheat();
  }
`;
  DemoDocuments.digging = DemoDocuments.digging.replace(anchor, () => hook + anchor);
})();

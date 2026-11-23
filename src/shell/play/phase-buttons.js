/* 01(실제 플레이용) 화면 위쪽 「1페」「2페」「3페」 버튼(2026-11-23, Claude Code).
   사용자 11/23 「웹디 실제플레이용에서 치트모드인가 그거 쓸수있게 해줘」, 되묻기(02에만 있는 1페·2페·3페 버튼을 01에도,
   누르면 그 페이즈 처음부터)에 「ㅇㅇ」. 모양은 02의 src/shell/dev/phase-bar.css와 같다.
   누르면 페이즈 기록(early.js SpeedrunPhase)을 그 페이즈 처음 상태로 바꾸고 새로고침한다.
   1페 = 3페 화면의 「처음으로(1페이즈)」와 같은 상태, 2페 = 1페를 두 번 깬 뒤와 같은 상태,
   3페 = 2페 점프스케어 뒤와 같은 상태(phase.js endPhase2 · from-dev.js AfterScare).
   스타트 화면·첫 플레이 연출 등은 window에서 모든 클릭·키를 가로채므로, 버튼은 작은 액자(iframe) 안에 두고
   누른 것만 메시지로 받는다(그 화면들 동작은 그대로).
   11/23 사용자 「따로 키를 설정해야 하는 걸로 해」 「치트버튼키는 다른 걸로 해봐」, 되묻기(P 키로 켜고 같은 키로 끔)에 「ㅇㅋ」:
   버튼은 평소 숨김, P 키(e.code KeyP, 한글 입력 상태도 같은 자리)로 나타남·숨김. 새로고침하면 다시 숨김.
   01은 P 키를 쓰지 않는다(Space·Enter·Esc·Tab·방향키·A·D·W·S·E·Q). 미니게임 화면(iframe) 안에서 눌러도 된다.
   이 파일은 early.js 바로 뒤라 스타트 화면·인트로의 키 가로채기보다 먼저 받아, P 키로 스타트 화면이 넘어가지 않게 한다. */
(() => {
  'use strict';
  const P = window.SpeedrunPhase;
  if (!P) return;
  const channel = 'speedrun-play-phase-buttons';
  const now = (() => { const p = P.state.phase; return p >= 3 ? 3 : p >= 2 ? 2 : 1; })(); // 1.5페는 1페 버튼
  const css = 'html,body{margin:0;height:100%;background:transparent;overflow:hidden}'
    + 'div{display:flex;gap:0;border:1.5px solid #000;background:#fff;box-sizing:border-box;height:100%}'
    + 'button{flex:1;min-height:0;padding:0 14px;font:700 14px/1 "Malgun Gothic",sans-serif;border:0;background:#fff;color:#000;cursor:pointer}'
    + 'button+button{border-left:1.5px solid #000}'
    + 'button[aria-pressed="true"]{background:#000;color:#fff}';
  const buttons = [1, 2, 3].map(p => `<button type="button" data-p="${p}" aria-pressed="${p === now}">${p}페</button>`).join('');
  const frame = document.createElement('iframe');
  frame.id = 'play-phase-bar';
  frame.title = '페이즈 바로 시작';
  frame.hidden = true;
  frame.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;width:156px;height:35px;border:0;background:transparent;box-shadow:0 0 0 1.5px #fff';
  frame.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${css}</style></head><body><div role="group" aria-label="페이즈">${buttons}</div>`
    + `<script>document.addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(b)parent.postMessage({channel:'${channel}',phase:Number(b.dataset.p)},'*');});`
    + `document.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey)parent.postMessage({channel:'${channel}',toggle:true},'*');});<\/script></body></html>`;
  document.body.append(frame);
  const bar = () => document.getElementById('play-phase-bar');
  // 11/24: 치트가 켜져 있는 동안(버튼이 보일 때) 땅파기 물건을 모래 위에 보인다(cheat-dig.js). 켜고 끌 때 모든 화면에 알린다.
  window.PlayCheat = Object.freeze({ get on() { const f = bar(); return !!f && !f.hidden; } });
  function broadcast(win) {
    try { for (const f of win.document.querySelectorAll('iframe')) { if (f.id === 'play-phase-bar') continue; f.contentWindow?.postMessage({ channel: 'speedrun-play-cheat' }, '*'); broadcast(f.contentWindow); } } catch (_) {}
  }
  const toggle = () => { const f = bar(); if (f) f.hidden = !f.hidden; broadcast(window); };
  const isToggleKey = e => e.code === 'KeyP' && !e.ctrlKey && !e.altKey && !e.metaKey;
  function onKey(e) {
    if (!isToggleKey(e)) return;
    e.stopImmediatePropagation(); // 스타트 화면·인트로가 P 키를 「아무 키」로 받지 않게(이 창에서만 먼저 받음)
    if (e.type === 'keydown' && !e.repeat) toggle();
  }
  // 이 창과 그 안의 미니게임 화면(iframe, 같은 출처)마다 P 키를 듣는다. 버튼 액자는 자기 문서에서 따로 알린다.
  function hook(win) {
    try {
      if (!win || win.__playPhaseKey) return;
      win.__playPhaseKey = true;
      win.addEventListener('keydown', onKey, true); win.addEventListener('keyup', onKey, true);
      const doc = win.document;
      const scan = () => doc.querySelectorAll('iframe').forEach(f => {
        if (f.id === 'play-phase-bar') return;
        if (!f.__playPhaseLoad) { f.__playPhaseLoad = true; f.addEventListener('load', () => hook(f.contentWindow)); }
        hook(f.contentWindow);
      });
      const hasFrame = n => n.nodeType === 1 && (n.tagName === 'IFRAME' || (n.querySelector && n.querySelector('iframe')));
      new win.MutationObserver(list => { if (list.some(r => [...r.addedNodes].some(hasFrame))) scan(); }).observe(doc, { childList: true, subtree: true });
      scan();
    } catch (_) { /* 다른 출처 화면은 건너뜀 */ }
  }
  hook(window);
  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.channel !== channel || e.source !== bar()?.contentWindow) return;
    if (d.toggle) { toggle(); return; }
    const p = Number(d.phase);
    if (p === 3) {
      try { sessionStorage.removeItem('speedrun-intro-seen'); sessionStorage.setItem('speedrun-first-run-seen', '1'); } catch (_) {}
      // 2페를 다 깬 뒤 상태(early.js 발표용 바로가기 scare와 같은 바뀐 게임 4곳) + 3페
      P.set({ phase: 3, run2: [...(P.games2 || [])], corrupted: ['maze', 'routine', 'limb', 'mri'], swapUsed: true });
    } else if (p === 1 || p === 2) P.set({ phase: p, corrupted: [], run2: [], swapUsed: false });
    else return;
    location.reload();
  });
})();

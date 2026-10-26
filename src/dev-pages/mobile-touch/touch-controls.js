/* 휴대폰 터치 조작(개발자용 새 항목).
 * 키보드가 꼭 필요한 게임(마지막 걸음·미로)에 화면 버튼을 얹는다.
 * 게임 소스는 고치지 않는다. 같은 출처의 게임 문서를 찾아 그 안에 버튼을 넣고,
 * 버튼을 누르면 게임이 원래 받는 키 입력(keydown/keyup)을 그대로 보낸다.
 * 나머지 게임(전구·기억·실 꿰기·짐 싸기·MRI·땅파기)은 원래 터치로 조작된다. */
(() => {
  'use strict';
  const KEY = { KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', KeyE: 'e', Space: ' ', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight' };
  const LAYOUTS = {
    walk: {
      match: canvas => /^마지막 걸음/.test(canvas.getAttribute('aria-label') || ''),
      buttons: [
        { code: 'KeyA', label: '왼발', cls: 'big', style: 'left:max(14px,env(safe-area-inset-left));bottom:calc(max(22px,env(safe-area-inset-bottom)) + 76px)' },
        { code: 'KeyD', label: '오른발', cls: 'big', style: 'right:max(14px,env(safe-area-inset-right));bottom:calc(max(22px,env(safe-area-inset-bottom)) + 76px)' },
        { code: 'Space', label: '숨', cls: 'wide', style: 'left:50%;bottom:calc(max(22px,env(safe-area-inset-bottom)) + 76px);transform:translateX(-50%)' },
        { code: 'KeyE', label: '눈', cls: 'small', style: 'right:max(14px,env(safe-area-inset-right));bottom:calc(max(22px,env(safe-area-inset-bottom)) + 174px)' }
      ]
    },
    maze: {
      match: canvas => /^미로/.test(canvas.getAttribute('aria-label') || ''),
      buttons: [
        { code: 'KeyW', label: '▲', cls: 'pad', style: 'left:calc(max(14px,env(safe-area-inset-left)) + 62px);bottom:calc(max(22px,env(safe-area-inset-bottom)) + 124px)' },
        { code: 'KeyA', label: '◀', cls: 'pad', style: 'left:max(14px,env(safe-area-inset-left));bottom:calc(max(22px,env(safe-area-inset-bottom)) + 62px)' },
        { code: 'KeyD', label: '▶', cls: 'pad', style: 'left:calc(max(14px,env(safe-area-inset-left)) + 124px);bottom:calc(max(22px,env(safe-area-inset-bottom)) + 62px)' },
        { code: 'KeyS', label: '▼', cls: 'pad', style: 'left:calc(max(14px,env(safe-area-inset-left)) + 62px);bottom:max(22px,env(safe-area-inset-bottom))' },
        { code: 'ArrowLeft', label: '↶', cls: 'pad turn', style: 'right:calc(max(14px,env(safe-area-inset-right)) + 70px);bottom:max(22px,env(safe-area-inset-bottom))' },
        { code: 'ArrowRight', label: '↷', cls: 'pad turn', style: 'right:max(14px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom))' }
      ]
    }
  };
  const CSS = `
#speedrun-touch{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif}
#speedrun-touch button{position:absolute;pointer-events:auto;display:grid;place-items:center;margin:0;padding:0;border:2px solid #000;border-radius:50%;
 background:rgba(255,255,255,.72);color:#000;font-family:inherit;font-weight:700;font-size:17px;line-height:1;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
 -webkit-tap-highlight-color:transparent;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
#speedrun-touch button.big{width:86px;height:86px}
#speedrun-touch button.small{width:58px;height:58px;font-size:15px}
#speedrun-touch button.wide{width:120px;height:62px;border-radius:31px}
#speedrun-touch button.pad{width:58px;height:58px;font-size:20px;border-radius:12px}
#speedrun-touch button.turn{border-radius:50%}
#speedrun-touch button[data-on="1"]{background:#000;color:#fff}`;

  function send(canvas, type, code, repeat) {
    const win = canvas.ownerDocument.defaultView;
    canvas.dispatchEvent(new win.KeyboardEvent(type, { key: KEY[code], code, repeat, bubbles: true, cancelable: true, composed: true }));
  }
  function inject(win, canvas, layout) {
    const doc = win.document;
    if (doc.getElementById('speedrun-touch')) return;
    const style = doc.createElement('style'); style.id = 'speedrun-touch-style'; style.textContent = CSS;
    const box = doc.createElement('div'); box.id = 'speedrun-touch'; box.dataset.layout = layout;
    const timers = new Map();
    const release = (button, code) => {
      if (!timers.has(code)) return;
      clearInterval(timers.get(code)); timers.delete(code);
      button.dataset.on = '0'; send(canvas, 'keyup', code, false);
    };
    for (const spec of LAYOUTS[layout].buttons) {
      const button = doc.createElement('button');
      button.type = 'button'; button.tabIndex = -1; button.className = spec.cls; button.textContent = spec.label;
      button.dataset.code = spec.code; button.setAttribute('aria-label', spec.label + ' (' + spec.code + ')');
      button.style.cssText = spec.style;
      button.addEventListener('pointerdown', event => {
        // 기본 동작을 막아 캔버스 포커스가 빠지지 않게 한다(빠지면 게임이 누른 키를 지움).
        event.preventDefault(); event.stopPropagation();
        try { button.setPointerCapture(event.pointerId); } catch (_) { /* 이미 끝난 터치 */ }
        if (timers.has(spec.code)) return;
        button.dataset.on = '1'; send(canvas, 'keydown', spec.code, false);
        // 누르고 있는 동안 반복 신호를 보내 혹시 지워진 키를 되살린다(반복 신호는 새 걸음으로 치지 않음).
        timers.set(spec.code, setInterval(() => send(canvas, 'keydown', spec.code, true), 120));
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => { event.stopPropagation(); release(button, spec.code); });
      for (const type of ['mousedown', 'click', 'contextmenu']) button.addEventListener(type, event => { event.preventDefault(); event.stopPropagation(); });
      button.addEventListener('touchstart', event => event.preventDefault(), { passive: false });
      box.appendChild(button);
    }
    const releaseAll = () => box.querySelectorAll('button').forEach(button => release(button, button.dataset.code));
    win.addEventListener('blur', releaseAll); win.addEventListener('pagehide', releaseAll);
    doc.head.appendChild(style); doc.body.appendChild(box);
  }
  function visit(win, found) {
    let doc;
    try { doc = win.document; if (!doc || !doc.body) return; } catch (_) { return; }
    for (const canvas of doc.querySelectorAll('canvas[aria-label]')) {
      for (const [name, layout] of Object.entries(LAYOUTS)) if (layout.match(canvas)) found.push({ win, canvas, layout: name });
    }
    for (const frame of doc.querySelectorAll('iframe')) {
      const box = frame.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) visit(frame.contentWindow, found);
    }
  }
  /** root 창 아래의 모든 게임 문서를 주기적으로 살펴 필요한 곳에 버튼을 붙인다. */
  function attach(getRoot, onChange) {
    let last = '';
    setInterval(() => {
      const found = []; const root = getRoot();
      if (root) visit(root, found);
      for (const item of found) inject(item.win, item.canvas, item.layout);
      const now = found.map(item => item.layout).join(',') || 'none';
      if (now !== last) { last = now; onChange?.(now); }
    }, 250);
  }
  window.SpeedrunTouch = Object.freeze({ attach, LAYOUTS });
})();

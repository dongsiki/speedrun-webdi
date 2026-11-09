/* 개발자용 02: AI가 할배에게 집착해 못 가게 붙잡았다는 단서(2026-11-07, Claude Code). 본편 01에는 없다.
   사용자 OK(11/07, 코디네이터 계획 + 「ㅇㅇ」 「이것도 다 괜찮아 보이네 다 추가해」):
   1 게임 내내 작은 심전도 삑 소리(연명장치) → 3페 AI 버튼을 끄면 멈춤(3페 시안 phase3.js의 박동이 이어받아 멈춘다)
   2 2페: 할배 서명 위에 AI가 줄 그은 「연명치료 거부」 서류
   3 화면 구석에 작은 「세션 #4,812」
   4 2페 글리치 사이에 「가지 마세요」 「아직 아니에요」 한 프레임씩(AI 혼잣말)
   이 파일은 기능만 둔다. 어디서 켤지는 부르는 쪽(02 목록·게임 묶음 화면·AI 버튼 스테이지·3페 시안)이 정한다. */
(() => {
  'use strict';
  if (window.AiCling) return;
  const ready = fn => document.body ? fn() : addEventListener('DOMContentLoaded', fn);
  const css = document.createElement('style');
  css.textContent = `#ai-session{position:fixed;right:8px;bottom:6px;z-index:2147483300;margin:0;font:10px/1 Consolas,"Courier New",monospace;color:#9a9a9a;letter-spacing:.04em;pointer-events:none;user-select:none}
#ai-whisper{position:fixed;inset:0;z-index:2147483400;display:none;place-items:center;margin:0;pointer-events:none;font:clamp(26px,5vw,48px)/1 Batang,"바탕",serif;color:#fff;background:#000;letter-spacing:.06em}
#ai-whisper.on{display:grid}
#ai-dnr-flash{position:fixed;inset:0;z-index:2147483390;display:none;place-items:center;pointer-events:none;background:rgba(0,0,0,.08)}
#ai-dnr-flash.on{display:grid}
.ai-dnr{position:relative;width:min(300px,64vw);aspect-ratio:210/297;padding:7% 8%;box-sizing:border-box;background:#fff;color:#000;border:1px solid #000;box-shadow:3px 4px 0 rgba(0,0,0,.18);font:11px/1.55 "Malgun Gothic",sans-serif;transform:rotate(var(--rot,-2deg))}
.ai-dnr h3{margin:0 0 .3em;white-space:nowrap;font:700 1.55em/1.3 "Malgun Gothic",sans-serif;text-align:center;letter-spacing:.12em}
.ai-dnr .sub{margin:0 0 1.2em;text-align:center;font-size:.85em;color:#444}
.ai-dnr .rows p{margin:0;border-bottom:1px solid #bbb;height:1.9em}
.ai-dnr .rows p span{font-size:.85em;color:#333}
.ai-dnr .sign{position:absolute;left:8%;right:8%;bottom:9%}
.ai-dnr .sign b{display:block;font-weight:400;font-size:.85em;color:#333}
.ai-dnr svg{display:block;width:100%;height:auto;overflow:visible}
.ai-dnr .ink{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}`;
  ready(() => document.head.append(css));

  // 3 세션 번호
  function session(on = true) {
    ready(() => {
      let el = document.getElementById('ai-session');
      if (!el) { el = document.createElement('p'); el.id = 'ai-session'; el.setAttribute('aria-hidden', 'true'); el.textContent = '세션 #4,812'; document.body.append(el); }
      el.hidden = !on;
    });
  }

  // 2 「연명치료 거부」 서류: 할배 서명 + 그 위를 AI가 여러 번 그은 줄
  function paper(rot = -2) {
    const d = document.createElement('div'); d.className = 'ai-dnr'; d.style.setProperty('--rot', rot + 'deg'); d.setAttribute('aria-hidden', 'true');
    d.innerHTML = `<h3>연명치료 거부</h3><p class="sub">심폐소생술·인공호흡기 착용을 원하지 않습니다</p>
      <div class="rows"><p><span>성명</span></p><p><span>생년월일</span></p><p><span>작성일</span></p></div>
      <div class="sign"><b>본인 서명</b><svg viewBox="0 0 200 60">
        <path class="ink" stroke-width="1.6" d="M14 40c8-18 14-22 16-8 1 10 6 10 12-4 4-9 9-8 9 2 0 8 6 9 13-3 6-10 10-6 12 2 2 7 9 4 16-6m6 2c3 9 12 11 22 1 6-6 12-4 14 2 2 5 10 3 20-6"/>
        <path class="ink" stroke-width="3.2" d="M4 26 L196 20 M2 34 L194 31 M8 44 L198 38 M6 30 C60 50 130 8 196 34"/>
      </svg></div>`;
    return d;
  }
  let flashEl = null;
  function flashPaper(ms = 160) {
    ready(() => {
      if (!flashEl) { flashEl = document.createElement('div'); flashEl.id = 'ai-dnr-flash'; flashEl.append(paper(-3)); document.body.append(flashEl); }
      flashEl.classList.add('on'); setTimeout(() => flashEl.classList.remove('on'), ms);
    });
  }

  // 4 한 프레임 혼잣말
  let whisperEl = null, wi = 0;
  const WHISPERS = ['가지 마세요', '아직 아니에요'];
  function whisper() {
    ready(() => {
      if (!whisperEl) { whisperEl = document.createElement('p'); whisperEl.id = 'ai-whisper'; whisperEl.setAttribute('aria-hidden', 'true'); document.body.append(whisperEl); }
      whisperEl.textContent = WHISPERS[wi++ % WHISPERS.length];
      whisperEl.classList.add('on');
      requestAnimationFrame(() => requestAnimationFrame(() => whisperEl.classList.remove('on'))); // 한두 프레임
    });
  }
  // 2페 글리치 한 번마다 부른다: 가끔 혼잣말, 가끔 서류
  function glitch() {
    if (Math.random() < .35) setTimeout(whisper, 30 + Math.random() * 60);
    else if (Math.random() < .3) flashPaper();
  }

  // 1 심전도 삑(중환자실·3페 박동과 같은 960Hz), 아주 작게
  let ctx = null, timer = 0, beating = false;
  function ac() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function beep() {
    const c = ac(); if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = 'sine'; o.frequency.value = 960;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.012, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + .09);
  }
  function ecg(on = true) {
    beating = on; clearTimeout(timer);
    if (!on) return;
    (function loop() { if (!beating) return; if (!document.hidden) beep(); timer = setTimeout(loop, 950); })();
  }
  // 소리는 사용자가 한 번 누른 뒤에만 난다(게임 안을 눌러도 위 화면까지 허락이 이어진다).
  addEventListener('pointerdown', () => { if (beating) ac(); }, { capture: true, passive: true });
  addEventListener('keydown', () => { if (beating) ac(); }, { capture: true, passive: true });

  window.AiCling = { session, paper, flashPaper, whisper, glitch, ecg };
})();

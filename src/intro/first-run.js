/* 첫 플레이 연출(2026-10-31, Claude Code). 본편 01에서 1페이즈이고 스타트 화면을 눌렀을 때만.
   사용자 원문(10/31): 「가장 처움에는 인트로 이후 수타트 화면을 클릭할때 바로 클리어 화면 나오게 하고. 클리어 이후에 이제 ai버튼이 나타나는 그런 느낌」
   「스타트 이후 클리어 회면 1초 띄우다가 . 더시 또 지혼자 인트로 회면 나오고 마유스거 지 알아서 인트로 건너뛰기 클릭하고. 그 이후에 ai버튼이 나오는 식으로」
   순서: 스타트 클릭 → 클리어 화면 1초 → 변신 인트로가 저절로 다시 → 마우스 커서가 저절로 「인트로 건너뛰기」를 누름 → AI 버튼.
   보여 주기만 하는 연출이라 클리어 수·페이즈·저장은 바꾸지 않는다. 연출 중에는 사용자 입력을 막는다. */
(() => {
  'use strict';
  if (window.FirstRunGag) return;
  const VIDEO = 'assets/video/elder-transformation-10s.mp4?v=13eb1e890d6b';
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const kinds = ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu', 'keydown', 'keyup'];
  const block = e => { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); };
  const CURSOR = '<svg viewBox="0 0 24 34" width="30" height="42" aria-hidden="true"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L21.5 19.5 Z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>';

  // 10/31 사용자: 「그니까 저 프로세스가 딱 처음 시작할 때 딱 한 번 만 저 프로세스로 하게 해.」
  // 게임 저장(페이즈)과 같은 기준: 이 탭에서 한 번. RE?로 다시 시작하거나 새로고침해도 다시 안 나온다. 새 탭은 새 게임이라 다시 나온다.
  const SEEN = 'speedrun-first-run-seen';
  function wanted() {
    if (window.FirstRunForce) return true; // 개발자용 「첫 플레이 연출」 항목: 매번
    try { if (sessionStorage.getItem(SEEN) === '1') return false; } catch (_) {}
    const P = window.SpeedrunPhase;
    return !P || !P.state || P.state.phase === 1;
  }

  async function play() {
    if (!wanted()) return 'skipped';
    try { sessionStorage.setItem(SEEN, '1'); } catch (_) {}
    const body = document.body, main = document.querySelector('body > main');
    const prevInert = main ? main.inert : false;
    if (main) main.inert = true;
    for (const k of kinds) window.addEventListener(k, block, { capture: true, passive: false });
    body.dataset.firstRun = 'clear';
    try {
      // ① 클리어 화면 1초(한 판을 다 끝냈을 때의 클리어 화면과 같은 모양, 글자만)
      const clear = document.createElement('section');
      clear.id = 'first-run-clear'; clear.setAttribute('aria-label', '클리어');
      clear.innerHTML = '<p class="rc-word">클리어</p>';
      body.append(clear);
      await wait(1000);

      // ② 변신 인트로가 저절로 다시 나온다
      body.dataset.firstRun = 'intro';
      const dialog = document.createElement('dialog');
      dialog.className = 'transformation-intro first-run-intro';
      dialog.setAttribute('aria-label', '변신 인트로');
      const video = document.createElement('video');
      video.src = VIDEO; video.muted = true; video.defaultMuted = true; video.playsInline = true; video.preload = 'auto';
      video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
      const skip = document.createElement('button');
      skip.type = 'button'; skip.className = 'first-run-skip'; skip.textContent = '인트로 건너뛰기'; skip.tabIndex = -1;
      const cursor = document.createElement('div');
      cursor.className = 'first-run-cursor'; cursor.innerHTML = CURSOR;
      dialog.append(video, skip, cursor);
      body.append(dialog);
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      dialog.addEventListener('cancel', block);
      clear.remove();
      let music = null;
      try { if (window.IntroMusic) { music = window.IntroMusic.create(video, dialog); music.unlock && music.unlock(); } } catch (_) { music = null; }
      const start = () => video.play().catch(() => {});
      if (music && music.prepare) await music.prepare(1500).then(start, start); else await start();
      await wait(1400);

      // ③ 마우스 커서가 저절로 「인트로 건너뛰기」로 가서 누른다
      body.dataset.firstRun = 'cursor';
      const r = skip.getBoundingClientRect();
      const from = { x: innerWidth * .52, y: innerHeight * .62 }, to = { x: r.left + r.width * .45, y: r.top + r.height * .55 };
      cursor.style.translate = `${from.x}px ${from.y}px`; cursor.classList.add('show');
      await wait(250);
      const t0 = performance.now(), dur = 950;
      await new Promise(done => {
        const step = now => {
          const t = Math.min(1, (now - t0) / dur), u = t * t * (3 - 2 * t);
          const x = from.x + (to.x - from.x) * u, y = from.y + (to.y - from.y) * u - Math.sin(t * Math.PI) * 40;
          cursor.style.translate = `${x}px ${y}px`;
          if (t >= .85) skip.classList.add('hover');
          if (t < 1) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      await wait(300);
      skip.classList.add('press'); cursor.classList.add('press');
      await wait(180);
      if (music) try { music.stop(true); } catch (_) {}
      video.pause(); video.removeAttribute('src'); video.load();
      if (dialog.open && dialog.close) dialog.close();
      dialog.remove();
    } finally {
      for (const k of kinds) window.removeEventListener(k, block, { capture: true });
      if (main) main.inert = prevInert;
      delete body.dataset.firstRun;
    }
    // ④ 그 뒤 AI 버튼(원래 화면)이 보인다
    return 'played';
  }
  window.FirstRunGag = Object.freeze({ play });
})();

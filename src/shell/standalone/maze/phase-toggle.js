/* 개발자용 02 미로: 위쪽 「1페」「2페」 버튼(2026-10-27, Claude Code). 본편 01에는 없다.
   10/27 사용자: 「미로 딱 들어가면 위쪽에 1페,2페 버튼 있게 하고, 2페 버튼 누르면 글리치된 미로로 바뀌는 거」
   「2페이즈라면 화면 자체에도 글리치가 있어야겠지」
   2페 = 본편 2페이즈에서 미로가 바뀌었을 때와 같게: 길 막힘(phase.js와 같은 치환) · 색 반전 · 미로 소리 깨짐 ·
   순간 찢김/반전 · 지직 소리 · 낮은 웅웅 · 들어가면 깨진 자막 한 줄. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), body = document.body;
  const original = DevStage.html;
  // phase.js applyMaps()의 미로 치환과 같다. 미로 맵이 바뀌어 치환이 안 먹으면 버튼에 표시한다.
  const blocked = original.replace("'#.#########.#########'", "'#.###################'").replace("'#.....#...#.........#'", "'#.....#.............#'");
  const glitched = blocked.replace(/<head>/i, () => '<head><script>(' + phaseStageAudioGlitch.toString() + ')();<' + '/script>');
  const LINE = '매일 걷던 길이 어느 날부터 매일 달라졌다.'; // rebellion.js 열쇠(미로) story[1], 본편 2페이즈 자막과 같은 줄

  const FX = window.PhaseFX;
  const tear = document.createElement('div'); tear.id = 'phase-tear'; tear.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('p'); caption.id = 'phase-caption'; caption.setAttribute('aria-live', 'polite');
  const bar = document.createElement('div'); bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈');
  bar.innerHTML = '<button type="button" data-p="1">1페</button><button type="button" data-p="2">2페</button>';
  if (blocked === original) bar.dataset.broken = '1';
  body.append(tear, caption, bar);

  let phase = 1, burstTimer = 0, captionTimer = 0;
  function burst(strength = 1) {
    if (phase !== 2) return;
    body.style.setProperty('--gx', `${(Math.random() - .5) * 40 * strength}px`);
    body.style.setProperty('--gy', `${(Math.random() - .5) * 14 * strength}px`);
    body.style.setProperty('--gb', `${Math.floor(Math.random() * 80)}%`);
    body.style.setProperty('--gh', `${4 + Math.random() * 18}%`);
    body.dataset.burst = Math.random() < .45 ? 'invert' : 'tear';
    FX?.crackle(.1 + Math.random() * .25, .17);
    if (Math.random() < .22) FX?.moan(.095);
    setTimeout(() => { delete body.dataset.burst; }, 90 + Math.random() * 220);
  }
  function schedule() {
    clearTimeout(burstTimer);
    if (phase !== 2) return;
    burstTimer = setTimeout(() => { burst(1.15); schedule(); }, 2500 + Math.random() * 7100);
  }
  function say(text, ms = 4200) {
    caption.textContent = text; caption.classList.add('show');
    clearTimeout(captionTimer); captionTimer = setTimeout(() => caption.classList.remove('show'), ms);
  }
  function set(next) {
    phase = next;
    body.dataset.devPhase = String(next);
    for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === String(next)));
    DevStage.html = next === 2 ? glitched : original;
    clearTimeout(burstTimer); delete body.dataset.burst; caption.classList.remove('show');
    if (next === 2) FX?.droneOn(.047); else FX?.droneOff(true);
    $('again').click(); // 같은 판을 새로 연다(guides-3.js start)
  }
  $('stage').addEventListener('load', () => {
    if (phase !== 2) return;
    schedule();
    setTimeout(() => { burst(2); say(LINE); }, 700);
  });
  bar.addEventListener('click', event => {
    const b = event.target.closest('button[data-p]');
    if (b) set(Number(b.dataset.p));
  });
  for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === '1'));
  body.dataset.devPhase = '1';
})();

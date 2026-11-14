/* 개발자용 02 미로: 위쪽 「1페」「2페」「3페」 버튼(2026-10-27, Claude Code). 본편 01에는 없다.
   10/27 사용자: 「미로 딱 들어가면 위쪽에 1페,2페 버튼 있게 하고, 2페 버튼 누르면 글리치된 미로로 바뀌는 거」
   「2페이즈라면 화면 자체에도 글리치가 있어야겠지」
   2페 = 본편 2페이즈에서 미로가 바뀌었을 때와 같게: 길 막힘(phase.js와 같은 치환) · 미로 소리 깨짐 ·
   순간 찢김/반전 · 지직 소리 · 낮은 웅웅 · 들어가면 깨진 자막 한 줄.
   10/29 사용자 미로 2·3(records\todo.md 원문) → 2페: 원래 EXIT가 글리치로 막히고, 그걸 제대로 보면 검은 배경·음산·스토커·더 어려운 맵
   (maze-phase2.js). 3페: 바닥·벽 화살표와 막다른 길마다 기억의 단편 그림(maze-phase3.js, memory-art.js). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), body = document.body;
  const original = DevStage.html;
  const source = id => document.getElementById(id)?.textContent || '';
  const atEnd = (html, code) => { const i = html.toLowerCase().lastIndexOf('</body>'); const tag = '<script>' + code + '<' + '/script>'; return i < 0 ? html + tag : html.slice(0, i) + tag + html.slice(i); };
  // phase.js applyMaps()의 미로 치환과 같다. 미로 맵이 바뀌어 치환이 안 먹으면 버튼에 표시한다.
  const blocked = original.replace("'#.#########.#########'", "'#.###################'").replace("'#.....#...#.........#'", "'#.....#.............#'");
  // 11/14 추격전 프로토타입(maze-chaser.js): 1페 = 코너마다 뒤에서 따라오는 암시, 2페 = 검게 바뀐 뒤 같은 그림이 변형되어 추격. 3페는 그대로.
  const chaser = mode => 'window.MAZE_CHASER_MODE=' + mode + ';window.MAZE_CHASER_ART=' + JSON.stringify($('maze-chaser-art')?.getAttribute('src') || '') + ';\n' + source('maze-chaser-src');
  const calm = atEnd(original, chaser(1));
  const glitched = atEnd(blocked.replace(/<head>/i, () => '<head><script>(' + phaseStageAudioGlitch.toString() + ')();<' + '/script>'), source('maze-phase2-src') + '\n' + chaser(2));
  const story = atEnd(original, source('maze-memory-art-src') + '\n' + source('maze-phase3-src'));
  const LINE = '매일 걷던 길이 어느 날부터 매일 달라졌다.'; // rebellion.js 열쇠(미로) story[1], 본편 2페이즈 자막과 같은 줄

  const FX = window.PhaseFX;
  const tear = document.createElement('div'); tear.id = 'phase-tear'; tear.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('p'); caption.id = 'phase-caption'; caption.setAttribute('aria-live', 'polite');
  const bar = document.createElement('div'); bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈');
  bar.innerHTML = '<button type="button" data-p="1">1페</button><button type="button" data-p="2">2페</button><button type="button" data-p="3">3페</button>';
  if (blocked === original) bar.dataset.broken = '1';
  body.append(tear, caption, bar);

  let phase = 1, burstTimer = 0, captionTimer = 0, dreadTimer = 0, darkTimers = [];
  function burst(strength = 1) {
    if (phase !== 2) return;
    window.AiCling?.glitch(); // 11/07 AI 집착 단서: 가끔 「가지 마세요」「아직 아니에요」 한 프레임, 가끔 「연명치료 거부」 서류(src/shell/dev/ai-cling.js)
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
  // 검은 배경 뒤: 가끔 낮은 신음이나 속삭임
  function dread() {
    clearTimeout(dreadTimer);
    if (phase !== 2 || !body.dataset.mazeDark) return;
    dreadTimer = setTimeout(() => { if (Math.random() < .5) FX?.moan(.11); else FX?.whisper(1.1, .16); dread(); }, 8000 + Math.random() * 8000);
  }
  function say(text, ms = 4200) {
    caption.textContent = text; caption.classList.add('show');
    clearTimeout(captionTimer); captionTimer = setTimeout(() => caption.classList.remove('show'), ms);
  }
  function quiet() {
    clearTimeout(burstTimer); clearTimeout(dreadTimer); for (const t of darkTimers) clearTimeout(t); darkTimers = [];
    delete body.dataset.burst; delete body.dataset.mazeDark; caption.classList.remove('show');
  }
  function set(next) {
    phase = next;
    body.dataset.devPhase = String(next);
    for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === String(next)));
    DevStage.html = next === 2 ? glitched : next === 3 ? story : calm;
    quiet();
    if (next === 2) FX?.droneOn(.047); else FX?.droneOff(true);
    $('again').click(); // 같은 판을 새로 연다(guides-3.js start)
  }
  $('stage').addEventListener('load', () => {
    quiet();
    if (phase !== 2) return;
    FX?.droneOn(.047);
    schedule();
    setTimeout(() => { burst(2); say(LINE); }, 700);
  });
  // 미로 화면 안(maze-phase2.js)이 알려 주는 것
  window.addEventListener('message', event => {
    if (event.source !== $('stage').contentWindow || event.data?.channel !== 'speedrun-maze-dev-phase' || phase !== 2) return;
    const type = event.data.type;
    if (type === 'dark') {
      // 0.6초 동안 크게 깨지고, 그 뒤로 검은 배경 유지
      for (let i = 0; i < 6; i++) darkTimers.push(setTimeout(() => burst(2.4), i * 100));
      FX?.sting?.(.35);
      darkTimers.push(setTimeout(() => { body.dataset.mazeDark = '1'; FX?.droneOff(true); FX?.droneOn(.085); dread(); }, 600));
    }
    if (type === 'stalker-seen') FX?.whisper(.7, .12);
    if (type === 'stalker-gone') { burst(1.4); FX?.crackle(.22, .3); }
    if (type === 'chaser-on') { burst(2.2); FX?.sting?.(.3); }
    if (type === 'chaser-caught') { for (let i = 0; i < 4; i++) setTimeout(() => burst(2.6), i * 90); }
  });
  // 1페 암시: 들켜서 숨을 때 아주 작은 속삭임(1페에는 글리치 없음)
  window.addEventListener('message', event => {
    if (event.source !== $('stage').contentWindow || event.data?.channel !== 'speedrun-maze-dev-phase' || phase === 3) return;
    if (event.data.type === 'chaser-hint-seen') FX?.whisper?.(.6, .07);
  });
  bar.addEventListener('click', event => {
    const b = event.target.closest('button[data-p]');
    if (b) set(Number(b.dataset.p));
  });
  for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === '1'));
  body.dataset.devPhase = '1';
  DevStage.html = calm; $('again').click(); // 처음 여는 판도 1페 암시가 들어간 판으로
})();

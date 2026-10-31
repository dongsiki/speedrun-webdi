/* 개발자용 02 전구 퍼즐: 위쪽 「1페」「2페」「3페」 버튼 연결(2026-10-29, Claude Code). 본편 01에는 없다.
   02 목록 화면의 공용 버튼(shell/dev/phase-bar.js, #dev-phase-bar)을 눌러 바꾼다. 이 화면만 따로 열면 같은 모양의 버튼을 직접 띄운다.
   {channel:'speedrun-offline-developer-v1', type:'dev-phase', phase:n} 메시지로도 바꿀 수 있다.
   2페 = 암전마다 전구 개수가 바뀌는 판 + 본편 2페이즈와 같은 게임 소리 깨짐·화면 찢김·깨진 자막 한 줄.
   3페 = 큰 전구 일곱 개 한 줄, 켜진 전구 안에 이야기 그림. 판 내용은 src/stages/switches/phases.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), body = document.body;
  const original = DevStage.html;
  const inject = (html, code) => html.replace(/<head>/i, () => '<head><script>' + code + '<' + '/script>');
  const glitchAudio = '(' + phaseStageAudioGlitch.toString() + ')();';
  const pages = {
    1: original,
    2: inject(original, 'window.SwitchDevPhase=2;' + glitchAudio),
    3: inject(original, 'window.SwitchDevPhase=3;')
  };
  const LINE = '그 방의 불은 늘 켜져 있었다. 밤에도, 아무도 없을 때도.'; // rebellion.js 전구 story[1], 본편 2페이즈 자막과 같은 줄
  const FX = window.PhaseFX;
  const tear = document.createElement('div'); tear.id = 'phase-tear'; tear.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('p'); caption.id = 'phase-caption'; caption.setAttribute('aria-live', 'polite');
  body.append(tear, caption);

  // 02 공용 버튼을 쓴다. 없으면(단독 실행) 같은 모양으로 직접 만든다.
  let bar = null, own = false;
  try { bar = parent !== window ? parent.document.getElementById('dev-phase-bar') : null; } catch (_) { bar = null; }
  if (!bar) {
    own = true;
    bar = document.createElement('div'); bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈');
    bar.innerHTML = '<button type="button" data-p="1">1페</button><button type="button" data-p="2">2페</button><button type="button" data-p="3">3페</button>';
    body.append(bar);
  }
  const off = new AbortController();

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
  function mark(next) {
    for (const b of bar.querySelectorAll('button[data-p]')) b.setAttribute('aria-pressed', String(b.dataset.p === String(next)));
  }
  function set(next) {
    if (!pages[next]) return;
    phase = next; body.dataset.devPhase = String(next); mark(next);
    DevStage.html = pages[next];
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
    const b = event.target.closest?.('button[data-p]');
    if (b) set(Number(b.dataset.p));
  }, { signal: off.signal });
  addEventListener('message', event => {
    if (event.data?.channel === 'speedrun-offline-developer-v1' && event.data.type === 'dev-phase') set(Number(event.data.phase));
  });
  // 목록으로 나가면 공용 버튼에 남긴 연결을 걷고 1페 표시로 되돌린다.
  addEventListener('pagehide', () => { off.abort(); clearTimeout(burstTimer); FX?.droneOff(true); if (!own) mark(1); });
  body.dataset.devPhase = '1'; mark(1);
})();

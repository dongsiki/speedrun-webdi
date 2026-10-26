/* 1→2페이즈와 2페이즈 끝 점프스케어(2026-10-26, Claude Code).
   - 1페이즈 첫 전체 클리어: 결과 화면 3.5초·7.0초에 공포 컷 각 0.5초, 딱 두 번.
   - 2페이즈: 미니게임마다 글리치·이상한 소리. 클리어 하나마다 아직 안 깬 게임 하나의 맵이 바뀐다.
     새 맵·새 그림 없이 기존 맵을 코드로 비튼다(뒤집기·반전·길 막기). 한 번은 들어간 곳이 다른 곳으로 이어진다.
   - 2페이즈에서 일곱 곳을 다 깨면: AI 경고 → 점프스케어 → 첫 화면(3페이즈, 구현 예정).
   기존 게임 규칙·저장(반항 기록)·스테이지 소스는 바꾸지 않는다. */
(() => {
  'use strict';
  const P = window.SpeedrunPhase, FX = window.PhaseFX;
  if (!P || !FX) return;
  const $ = id => document.getElementById(id), body = document.body, channel = 'speedrun-midterm-v1';
  const games = P.games;
  // 클리어할 때마다 이 순서로 아직 안 깬 게임 하나가 바뀐다.
  const ORDER = ['maze', 'routine', 'switches', 'limb', 'suitcase', 'needle', 'mri'];
  const storyLine = id => { const a = (window.RebellionLog?.achievements || []).find(x => x.id === id); return a?.story?.[1] || ''; };
  const idle = () => !['white', 'failure'].includes(body.dataset.transition);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  FX.face(); // 얼굴 장면을 미리 잘라 둔다

  // --- 맵 바꾸기: 미로는 원래 지나던 통로(11,10)를 벽으로 막고 (10,11)을 연다 → 시작 쪽으로 크게 돌아가야 한다 ---
  // 10/26 사용자: 점프스케어가 나오는 클리어 한 게임 전부터는 글리치 없이.
  // 「'아 정상화'됐나보다 생각하게 될 때즘에 빡 조지는 거지」 → 마지막 한 판은 맵·소리·화면 모두 1페이즈처럼 정상.
  const calm = () => P.state.phase === 2 && P.state.run2.length >= games.length - 1;
  const has = typeof DemoDocuments !== 'undefined';
  const originals = {}; if (has) for (const g of games) originals[g] = DemoDocuments[g];
  // 10/26 사용자 「그래」: 맵이 바뀐 게임은 그 게임 원래 소리도 깨진다(바뀐 게임이 늘수록 깨지는 소리도 늘어남).
  const soundGlitch = html => html.replace(/<head>/i, () => '<head><script>(' + phaseStageAudioGlitch.toString() + ')();<' + '/script>');
  function applyMaps() {
    const s = P.state, quiet = calm(), on = s.phase >= 2 && !quiet;
    if (quiet) body.dataset.calm = '1'; else delete body.dataset.calm;
    body.dataset.corrupt = s.phase >= 2 ? s.corrupted.join(' ') : '';
    body.dataset.corruptn = String(s.phase >= 2 ? s.corrupted.length : 0);
    if (!has) return;
    for (const g of games) {
      let html = originals[g];
      if (on && s.corrupted.includes(g)) {
        if (g === 'maze') { // 원래 지나던 통로(11,10)를 막고 (10,11)을 연다 → 시작 쪽으로 크게 돌아가야 한다
          html = html.replace("'#.#########.#########'", "'#.###################'").replace("'#.....#...#.........#'", "'#.....#.............#'");
          body.dataset.mazeBlocked = html !== originals[g] ? 'yes' : 'no';
        }
        html = soundGlitch(html);
      }
      DemoDocuments[g] = html;
    }
  }
  applyMaps();

  // --- 2페이즈 글리치: 보이는 화면이 순간 찢기고 반전된다 ---
  const tear = document.createElement('div'); tear.id = 'phase-tear'; tear.setAttribute('aria-hidden', 'true');
  const caption = document.createElement('p'); caption.id = 'phase-caption'; caption.setAttribute('aria-live', 'polite');
  document.querySelector('main').append(tear, caption);
  let burstTimer = 0;
  function burst(strength = 1) {
    if (P.state.phase < 2 || calm() || body.dataset.stage === 'intro' || body.dataset.phaseEnding) return;
    const n = P.state.corrupted.length;
    body.style.setProperty('--gx', `${(Math.random() - .5) * 40 * strength}px`);
    body.style.setProperty('--gy', `${(Math.random() - .5) * 14 * strength}px`);
    body.style.setProperty('--gb', `${Math.floor(Math.random() * 80)}%`);
    body.style.setProperty('--gh', `${4 + Math.random() * 18}%`);
    body.dataset.burst = Math.random() < .45 ? 'invert' : 'tear';
    FX.crackle(.1 + Math.random() * .25, .14 + n * .03);
    if (Math.random() < .22) FX.moan(.08 + n * .015);
    setTimeout(() => { delete body.dataset.burst; }, 90 + Math.random() * (180 + n * 40));
  }
  function scheduleBursts() {
    clearTimeout(burstTimer);
    if (P.state.phase < 2 || calm()) return;
    const n = P.state.corrupted.length;
    burstTimer = setTimeout(() => { burst(1 + n * .15); scheduleBursts(); }, 2500 + Math.random() * Math.max(1500, 8000 - n * 900));
  }
  function sound() {
    if (P.state.phase >= 2 && !calm() && body.dataset.stage !== 'intro' && !body.dataset.phaseEnding) FX.droneOn(.035 + P.state.corrupted.length * .012);
    else FX.droneOff();
  }
  let captionTimer = 0;
  function say(text, ms = 4200) {
    if (!text) return;
    caption.textContent = text; caption.classList.add('show');
    clearTimeout(captionTimer); captionTimer = setTimeout(() => caption.classList.remove('show'), ms);
  }

  // --- 들어간 곳이 다른 곳으로 이어진다(2페이즈, 두 번째 클리어 뒤 한 번) ---
  let swapRestore = null;
  addEventListener('message', event => {
    const data = event.data;
    if (!data || data.channel !== channel) return;
    const source = ['digging', ...games].find(name => $(name)?.contentWindow === event.source);
    if (!source || source !== body.dataset.stage) return;
    const s = P.state;
    if (s.phase === 2 && source === 'digging' && data.type === 'enter' && !s.swapUsed && s.run2.length >= 2 && !calm() && DemoFlow.destinations[data.object]) {
      const own = DemoFlow.destinations[data.object];
      const others = games.filter(g => g !== own && !s.run2.includes(g));
      if (others.length) {
        const to = others.find(g => s.corrupted.includes(g)) || others[0];
        DemoFlow.destinations[data.object] = to;
        swapRestore = () => { DemoFlow.destinations[data.object] = own; swapRestore = null; };
        setTimeout(() => swapRestore && swapRestore(), 0);
        P.set({ swapUsed: true });
        burst(2.4); FX.sting(.35);
      }
    }
    if (s.phase === 2 && games.includes(source) && data.type === 'complete' && !s.run2.includes(source)) {
      const run2 = [...s.run2, source];
      const target = ORDER.find(g => !s.corrupted.includes(g) && !run2.includes(g)) || ORDER.find(g => !s.corrupted.includes(g));
      P.set({ run2, corrupted: target ? [...s.corrupted, target] : s.corrupted });
      applyMaps(); scheduleBursts(); sound();
      if (run2.length >= games.length) endPhase2();
    }
  }, true);

  // --- 화면이 바뀔 때 ---
  let stageNow = null;
  function onStage() {
    const stage = body.dataset.stage;
    if (stage === stageNow) return;
    stageNow = stage;
    sound(); scheduleBursts();
    if (P.state.phase === 2 && !calm() && P.state.corrupted.includes(stage)) {
      setTimeout(() => { burst(2); say(storyLine(stage)); }, 700);
    }
    if (P.state.phase === 2 && !calm() && stage === 'digging' && P.state.corrupted.length) setTimeout(() => burst(1.6), 500);
    // 발표용: 1페이즈 결과 화면 바로 보기
    if (P.demo === 'finale1' && stage === 'digging' && !body.dataset.demoFinale) {
      body.dataset.demoFinale = '1';
      setTimeout(() => { body.dataset.completed = games.join(','); }, 600);
    }
    // 발표용: 점프스케어 직전의 마지막 한 게임(정상화된 전구 퍼즐)으로 바로 들어간다
    if (P.demo === 'phase2-last' && stage === 'digging' && !body.dataset.demoEnter) {
      body.dataset.demoEnter = '1';
      setTimeout(() => {
        const send = m => $('digging').contentWindow.eval('parent.postMessage(' + JSON.stringify({ channel, ...m }) + ", '*')");
        try { send({ type: 'found', object: 'bulb' }); setTimeout(() => send({ type: 'enter', object: 'bulb' }), 150); } catch (_) {}
      }, 900);
    }
    if (P.demo === 'scare' && stage === 'digging' && !body.dataset.phaseEnding) setTimeout(endPhase2, 900);
    if (stage === 'intro') todoPanel();
    todoTags();
  }

  // --- 1페이즈 끝: 첫 결과 화면의 공포 컷 두 번 ---
  async function cut() {
    const c = await FX.face();
    const layer = document.createElement('div'); layer.className = 'phase-cut'; layer.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas'); canvas.width = c.width; canvas.height = c.height;
    const g = canvas.getContext('2d'); g.drawImage(c, 0, 0);
    // 눈 높이를 가로로 한 줄 밀어 낸다
    g.drawImage(c, 0, 190, c.width, 70, 26, 190, c.width, 70);
    layer.append(canvas); document.body.append(layer);
    FX.sting(.8);
    setTimeout(() => layer.remove(), 500);
  }
  function watchFinale() {
    const finale = $('run-clear');
    if (!finale || finale.dataset.phaseSeen) return;
    finale.dataset.phaseSeen = '1';
    if (P.state.phase === 1) {
      P.set({ phase: 2, corrupted: [], run2: [], swapUsed: false });
      setTimeout(cut, 3500); setTimeout(cut, 7000);
    } else if (body.dataset.phaseEnding) { // 2페이즈 끝: 평범한 클리어 화면으로 안심시킨다(누를 수는 없게)
      finale.querySelectorAll('button').forEach(b => { b.disabled = true; b.tabIndex = -1; });
    } else if (P.state.phase >= 2) finale.remove();
  }

  // --- 2페이즈 끝: AI 경고 → 점프스케어 → 첫 화면 ---
  async function endPhase2() {
    if (body.dataset.phaseEnding) return;
    body.dataset.phaseEnding = 'wait';
    for (let i = 0; i < 200 && !(body.dataset.stage === 'digging' && idle()); i++) await sleep(100);
    clearTimeout(burstTimer); FX.droneOff(true);
    const face = await FX.face();
    // 1) 평범한 클리어 화면(1페이즈와 똑같이). 2~3초 뒤 경고.
    body.dataset.completed = games.join(',');
    await sleep(400);
    if (!$('run-clear')) { // 같은 판에서 이미 결과 화면을 쓴 경우를 위한 대체(같은 모양)
      const f = document.createElement('section'); f.id = 'run-clear'; f.innerHTML = '<p class="rc-word">클리어</p><button class="rc-again" type="button" disabled>RE?</button>';
      document.querySelector('main').append(f); requestAnimationFrame(() => { f.classList.add('show'); f.querySelectorAll('p,button').forEach(x => x.classList.add('show')); });
    }
    watchFinale();
    await sleep(3400); // 클리어 화면을 3초쯤 보여 안심시킨 뒤
    body.dataset.phaseEnding = 'on';
    const stage = document.createElement('section'); stage.id = 'phase-end'; stage.setAttribute('aria-label', '경고');
    const noiseCanvas = document.createElement('canvas'), text = document.createElement('p');
    stage.append(noiseCanvas, text); document.body.append(stage);
    const g = noiseCanvas.getContext('2d');
    let mode = 'dark', raf = 0, t0 = performance.now();
    function draw(now) {
      raf = requestAnimationFrame(draw);
      const W = noiseCanvas.width = innerWidth, H = noiseCanvas.height = innerHeight;
      if (mode === 'static') { // 화면 전체가 지직거리며 무너진다
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 90; i++) { g.fillStyle = Math.random() < .5 ? '#fff' : '#000'; g.fillRect(Math.random() * W, Math.random() * H, Math.random() * W * .6, 1 + Math.random() * 18); }
      } else if (mode === 'dark') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
      else if (mode === 'scare') { // 얼굴이 화면을 꽉 채우고 미친 듯이 흔들린다
        const k = (now - t0) / 1000;
        // 처음 한 장은 얼굴 전체가 화면 높이를 꽉 채우고, 점점 코앞으로 다가온다.
        const z = 1.08 + Math.min(.75, k * k * .9) + Math.sin(now / 23) * .05;
        const s = H / (face.height * .8) * z;
        const w = face.width * s, h = face.height * s;
        const x = (W - w) / 2 + (Math.random() - .5) * 70 * (1 + k), y = (H - h) / 2 + (Math.random() - .5) * 70 * (1 + k);
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        const inv = k > .35 && Math.floor(now / 60) % 3 === 0;
        g.filter = inv ? 'invert(1) contrast(2.2)' : 'contrast(2.2)';
        g.drawImage(face, x, y, w, h);
        for (let i = 0; i < (k < .15 ? 0 : 6); i++) { // 찢어진 띠(첫 순간은 얼굴이 또렷하게)
          const sy = Math.random() * face.height, sh = 10 + Math.random() * 60, dx = (Math.random() - .5) * 220;
          g.drawImage(face, 0, sy, face.width, sh, x + dx, y + sy * s, w, sh * s);
        }
        g.filter = 'none';
        if (k > .2 && Math.random() < .12) { g.fillStyle = Math.random() < .5 ? '#fff' : '#000'; g.fillRect(0, 0, W, H); }
      }
    }
    raf = requestAnimationFrame(draw);
    await sleep(700); // 갑자기 까만 화면. 소리 없음.
    // 경고(손글씨 메모 원문 조각: 「당신 누구야」 「나가」 「너의 기억에서」. 최종 대사는 미정)
    const lines = ['당신 누구야.', '나가.', '너의 기억에서.'];
    for (const line of lines) {
      text.textContent = ''; text.className = 'show';
      for (const ch of line) { text.textContent += ch; await sleep(110); }
      await sleep(1250);
    }
    text.className = 'show hold';
    await sleep(1400);
    text.className = '';
    mode = 'dark'; await sleep(650);
    // 점프스케어
    mode = 'scare'; t0 = performance.now(); stage.classList.add('scare');
    FX.scream(1.5);
    await sleep(1450);
    mode = 'dark'; stage.classList.remove('scare'); FX.droneOff(true);
    await sleep(900);
    cancelAnimationFrame(raf);
    P.set({ phase: 3 });
    location.reload();
  }

  // --- 구현 예정 표시(발표용): 구현된 것과 구분해 화면 위에 짧게 적는다 ---
  const TODO = {
    intro: ['휴대폰 터치 조작·실기기 실행', '추가 보이스(내레이션 음성)', '처음 10초 이해·5분 완주로 다듬기'],
    digging: ['도전과제 옆 메뉴를 처음부터 공개', '물건이 바뀌어 AI가 있다는 걸 눈치채게 하는 단서'],
    routine: ['침실에 할아버지의 꾸미는 취향 반영', '학창 시절 괴롭힘 회상 장면', '윤곽선 깜빡임 횟수 제한(필요한 물건 3번)'],
    limb: ['전체 클리어 뒤 중환자실 엔딩 컷신'],
  };
  const tags = document.createElement('aside'); tags.id = 'phase-todo'; tags.setAttribute('aria-label', '구현 예정');
  document.body.append(tags);
  function todoTags() {
    const list = body.dataset.phaseEnding ? [] : (TODO[body.dataset.stage] || []);
    tags.hidden = !list.length || body.dataset.todoHidden === '1';
    tags.innerHTML = list.map(t => `<p><b>구현 예정</b>${t}</p>`).join('') + '<button type="button" aria-label="구현 예정 표시 숨기기">×</button>';
    tags.querySelector('button').onclick = () => { body.dataset.todoHidden = '1'; tags.hidden = true; };
  }
  function todoPanel() {
    if (P.state.phase < 3 || $('phase3-panel')) return;
    const panel = document.createElement('section'); panel.id = 'phase3-panel'; panel.setAttribute('aria-label', '3페이즈 구현 예정');
    panel.innerHTML = '<p class="p3-tag">구현 예정 · 3페이즈</p>'
      + '<ol><li>첫 화면을 계속 눌러도 진행되지 않는다</li><li>AI가 플레이어에게 도와 달라고 한다</li><li>지금까지 숨겨 온 이야기가 드러난다(진엔딩)</li></ol>'
      + '<button type="button" class="p3-reset">처음으로(1페이즈)</button>';
    panel.querySelector('.p3-reset').onclick = () => { P.set({ phase: 1, corrupted: [], run2: [], swapUsed: false }); location.reload(); };
    $('intro').append(panel);
  }

  new MutationObserver(() => { onStage(); watchFinale(); }).observe(body, { attributes: true, attributeFilter: ['data-stage', 'data-transition', 'data-completed'] });
  new MutationObserver(watchFinale).observe(document.querySelector('main'), { childList: true });
  onStage();
  window.PhaseDebug = { endPhase2, cut, burst, applyMaps };
})();

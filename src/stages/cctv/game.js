/* 빈건물 CCTV(2026-11-05, Claude Code). 빈건물 CCTV(라이트아웃, src/stages/switches는 그대로 보관) 자리에 들어가는 게임.
   사용자 11/05: 「빈건물cctv가 나은 거 같아. 약간 프레디느낌이잖아 이거」 → 감시 카메라 공포 분위기만 참고(다른 게임의 캐릭터·그림·이름 안 씀).
   할배는 사람을 안 만나도 되는 빈 건물 야간 경비. 화면 4개를 지켜보며 밤 12시부터 아침 6시까지 버틴다.
   - 1페(병맛): 화면에 뭔가 움직이면 그 화면을 눌러 「확인」. 고양이·비닐봉지·춤추는 마네킹·청소 로봇. AI가 서툴게 칭찬한다.
   - 2페(공포): 화면이 지직거리고, 사람 그림자가 확인할수록 가까워진다. AI가 플레이어를 막아 화면을 가린다. 교복 치마 떡밥.
   - 3페(감동): AI가 「제가 못 보는 걸 봐 주세요」. 할배가 건물을 떠나는 모습을 화면으로 지켜본다(2026-11-24, 아래 P3).
   페이즈: window.SwitchDevPhase(개발자용 02의 1·2·3페 버튼이 문서 앞에 심어 줌). 본편 01은 늘 1페. */
(() => {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  const phase = [2, 3].includes(globalThis.SwitchDevPhase) ? globalThis.SwitchDevPhase : 1;
  const $ = id => document.getElementById(id);
  const main = $('experience'), clockEl = $('clock'), radio = $('radio'), status = $('status');
  main.dataset.devPhase = String(phase);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // --- 방 그림(흰 선, 320×200) ---
  const CAMS = [
    { id: 'hall', tag: 'CAM 1 복도', floor: 168,
      room: '<path d="M0 0L128 72M320 0L192 72M0 200L128 128M320 200L192 128"/><rect x="128" y="72" width="64" height="56"/><path d="M38 34V176L70 160V54ZM282 34V176L250 160V54Z"/><path d="M150 26h20M160 26v8"/><path d="M60 110h4M256 110h4"/>' },
    { id: 'stairs', tag: 'CAM 2 계단', floor: 172,
      room: '<path d="M10 190H70V165H120V140H170V115H220V90H270V65H320"/><path d="M30 150L300 26M60 150V132M120 125V105M180 98V79M240 71V52"/><path d="M0 190H320"/>' },
    { id: 'lobby', tag: 'CAM 3 로비', floor: 176,
      room: '<path d="M0 180H320"/><rect x="112" y="38" width="96" height="142"/><path d="M160 38V180M150 110h-6M170 110h6"/><rect x="138" y="16" width="44" height="12"/><path d="M18 150H74M18 150V128M74 150V180M18 150V180M232 150H300M300 150V180M232 150V180M232 150V128"/>' },
    { id: 'store', tag: 'CAM 4 창고', floor: 178,
      room: '<path d="M20 36H136M20 86H136M20 136H136M20 36V188M136 36V188"/><rect x="30" y="58" width="30" height="28"/><rect x="70" y="64" width="40" height="22"/><rect x="34" y="108" width="44" height="28"/><rect x="200" y="140" width="56" height="44"/><rect x="214" y="104" width="40" height="36"/><rect x="262" y="150" width="40" height="34"/><path d="M0 188H320"/>' }
  ];

  // 11/10 사용자 「3d로 해」「싹 다 3d로 해」「움직이는 거 말고, 모델이 걍 그대로 멈춰있는 걸로 해」: 화면 속 것들은 3D 모델(rooms3d.js), 멈춰 있음.
  // 「한 화면에 cctv 4개 싹다 하지말고, 넘기는 걸로 하고」「방향키나 wasd의 ad에 할당」「둘 다 할당되도록해」: 화면 하나씩, ← → / A·D로 넘긴다.
  const STAIRS = /* @json assets/models/cctv/stairs.json */ null;
  let current = 0;

  // --- 화면 만들기 ---
  const grid = $('monitors');
  const cams = CAMS.map((info, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'cam'; button.dataset.cam = info.id;
    button.setAttribute('aria-label', `${info.tag} 화면 확인`);
    button.innerHTML = `<canvas class="view3d" aria-hidden="true"></canvas>`
      + `<span class="tag">${info.tag}</span><span class="rec"></span><span class="static"><canvas width="80" height="50"></canvas></span><span class="block">차단됨</span><span class="stamp">확인</span>`;
    grid.append(button);
    const cam = { index, info, button, canvas: button.querySelector('.static canvas'), canvas3d: button.querySelector('canvas.view3d'), scene: Cctv3D.build(info.id, STAIRS), event: null, markTimer: 0 };
    button.addEventListener('click', () => look(cam));
    return cam;
  });

  // --- 시계(00:00 → 06:00) ---
  let minutes = phase === 3 ? 300 : 0, running = false, done = false, last = 0, raf = 0;
  // 11/15 사용자 「2분까지 되도록 해」(코디네이터 되물음 「1페와 2페의 시계가 00:00에서 06:00까지 가는 시간을 2분으로」에 「어 맞아. 작업해」·「ㅇㅇ」):
  //   1페 46초·2페 54초였던 밤을 둘 다 120초로(두 바퀴 비우는 동안 00:00에 멈춰 있는 것은 그대로, 시계가 가기 시작한 뒤부터 120초).
  const RATE = phase === 1 || phase === 2 ? 360 / 120 : 0; // 1초에 몇 분
  function showClock() {
    const m = Math.max(0, Math.min(360, Math.round(minutes)));
    clockEl.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  let radioTimer = 0;
  function say(text, ms = 2800) {
    radio.textContent = text; radio.classList.add('show'); status.textContent = text;
    clearTimeout(radioTimer); radioTimer = setTimeout(() => radio.classList.remove('show'), ms);
  }
  function beep(freq = 880, len = .08) {
    try {
      const ctx = beep.ctx || (beep.ctx = new AudioContext());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = freq; g.gain.value = .035;
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + len);
    } catch (_) { /* 소리가 안 나도 게임은 그대로 */ }
  }
  function mark(cam, kind, text, ms = 800) {
    cam.button.dataset.mark = kind; cam.button.querySelector('.stamp').textContent = text;
    clearTimeout(cam.markTimer); cam.markTimer = setTimeout(() => { delete cam.button.dataset.mark; }, ms);
  }

  // --- 화면 속 것(3D 모델, 멈춰 있음) ---
  function place(cam, kind, opts = {}) {
    cam.event = { kind, born: performance.now(), life: opts.life ?? 4500, near: opts.near ?? 0 };
    Cctv3D.stand(cam.scene, kind, cam.event.near); paint(cam);
  }
  function clear(cam) { cam.event = null; Cctv3D.stand(cam.scene, null); paint(cam); }
  function draw() {}
  function paint(cam) { if (cam.index === current) Cctv3D.render(cam.scene, cam.canvas3d); }
  // 11/15 사용자(코디네이터 되물음 「한 화면을 10초 보면 저절로 다음 카메라로 … 이전 카메라로는 돌아가지 못하게 … 네 화면을 두 바퀴 돌 때까지는 아무것도 나타나지 않고」에 「ㅇㅇ」):
  //   한 화면을 10초 보면 저절로 다음 카메라. → / D로 기다리지 않고 다음으로 건너뛰기. ← / A(이전으로)는 뺌.
  //   네 화면을 한 번씩 보면 한 바퀴, 두 바퀴 동안은 아무것도 안 나옴(「그래야 유저가 보기에 이게 기본상태구나임을 알지」). 그동안 시계도 00:00에 멈춰 있음.
  const HOLD = 10000, QUIET_VIEWS = CAMS.length * 2;
  let views = 0, held = 0, quiet = true;
  function showCam(i) {
    current = (i + cams.length) % cams.length;
    views++; held = 0;
    cams.forEach(c => { c.button.dataset.current = String(c.index === current); });
    paint(cams[current]); cams[current].button.focus({ preventScroll: true });
    main.dataset.lap = String(Math.min(3, Math.ceil(views / CAMS.length)));
    if (quiet && views > QUIET_VIEWS) { quiet = false; begin(); }
  }
  function nextCam() { if (running && !done) showCam(current + 1); }
  addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (k === 'arrowright' || k === 'd') { e.preventDefault(); nextCam(); } });
  addEventListener('resize', () => paint(cams[current]));
  function noise(cam) {
    const c = cam.canvas, ctx = c.getContext('2d'), img = ctx.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() < .5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  }

  // --- 1페 대사(AI 서툰 칭찬) ---
  const P1 = {
    start: '오늘도 아무도 안 와요. 사람 안 만나셔도 돼요!',
    ok: { cat: ['침입자 확인! …고양이네요. 잘하셨어요!', '고양이도 손님이에요. 아마도요.'], bag: ['비닐봉지도 위험할 수 있어요. 아마도요.', '봉지를 막으셨어요! 대단해요!'], mannequin: ['마네킹이 춤을 추네요. 기분 좋은 밤이에요!', '저 마네킹도 외로웠나 봐요.'], robot: ['청소 로봇이에요. 동료가 생겼어요!', '로봇도 혼자 일해요. 같네요!'] },
    miss: ['괜찮아요! 다음엔 잘하실 거예요.', '놓쳐도 괜찮아요. 시간은 많아요.'],
    empty: ['거긴 아무도 없어요. 그래도 잘 보셨어요!', '빈 화면도 소중해요!'],
    end: '06:00 퇴근'
  };
  // --- 2페 대사(AI가 플레이어를 막음) ---
  const P2 = {
    start: '이상해요. 오늘은 당신이 할아버지 같지 않아요.',
    block: ['여긴 보시면 안 돼요.', '당신… 누구예요?', '그 화면은 제가 볼게요.'],
    ok: ['…또 왔어요.', '가까워지고 있어요.', '저건 기록에 없어요.'],
    miss: ['보지 마세요.', '못 본 걸로 할게요.']
  };
  // --- 3페(AI가 도와 달라고 함) ---
  // 2026-11-24 사용자 「cctv에서 3페에서 할배가 가는 모습을 cctv로 보는 걸로 가자고 했잖아」 「3페는 하고」 → 되묻기(10:31)에 「ㅇㅇ」:
  //   멈춘 할배 4명 찾기 대신, 할배가 창고 → 계단 → 복도 → 로비 순서로 출구 쪽에 서 있다(카메라를 등짐, 멈춘 모델 그대로, 걷는 동작 없음).
  //   그 화면을 확인하면 다음 화면에 한 칸 더 출구 가까이 있고, 마지막 로비에서는 문 밖으로 사라진 뒤 아침이 온다.
  const P3 = {
    start: '제가 못 보는 걸 봐 주세요.',
    scenes: [
      { cam: 3, kind: 'elderGo', line: '여기 계셨네요.' },
      { cam: 1, kind: 'elderGo', line: '내려가시네요.' },
      { cam: 0, kind: 'elderGo', line: '문 쪽으로 가세요.' },
      { cam: 2, kind: 'elderGo', line: '이제 가세요.', gone: '이제 아침이에요.' }
    ]
  };

  // --- 1·2페 진행 ---
  let spawnTimer = 0, extraTimer = 0, blockTimer = 0, sightings = 0, caught = 0;
  function freeCam() {
    const free = cams.filter(c => !c.event && c.button.dataset.block !== 'on');
    return free.length ? pick(free) : null;
  }
  // 11/15 사용자(코디네이터 되물음 「CCTV 나오는 횟수를 1페 16번쯤, 2페 23번쯤으로 줄여 2분에 고르게 퍼뜨립니다」에 「ㅇㅇ」):
  //   밤을 2분으로 늘린 뒤 간격을 그대로 둬서 1페 약 43번·2페 약 51번 나오던 것을, 시계(00:00→06:00)에 맞춰 1페 16번·2페 23번만 고르게 나오게.
  //   한 칸(1페 22.5분·2페 약 15.7분)마다 하나씩, 칸 안에서 조금씩만 앞뒤로 흔들어 똑같은 박자로 들리지 않게. 빈 화면이 없으면 다음 프레임에 다시 시도(횟수는 그대로).
  const SPAWNS = phase === 1 ? 16 : phase === 2 ? 23 : 0;
  let spawnIndex = 0, spawnAt = Infinity;
  function spawnTime(k) { const step = 360 / SPAWNS; return step * (k + rand(.3, .7)); }
  function resetSpawns() { spawnIndex = 0; spawnAt = SPAWNS ? spawnTime(0) : Infinity; }
  function spawnByClock() {
    if (spawnIndex >= SPAWNS || minutes < spawnAt) return;
    if (!spawn()) return;
    spawnIndex++; spawnAt = spawnIndex < SPAWNS ? spawnTime(spawnIndex) : Infinity;
  }
  function spawn() {
    if (!running || done) return false;
    const cam = freeCam();
    if (!cam) return false;
    {
      if (phase === 1) place(cam, pick(['cat', 'bag', 'mannequin', 'robot']), { life: rand(6000, 7500) });
      else {
        sightings++;
        // 확인할수록 가까워진다: 처음엔 작게 멀리, 나중엔 화면 가운데 크게 멈춰 선다.
        const near = Math.min(1, caught / 6);
        place(cam, 'shadow', { life: rand(4500, 5500), near });
        cam.button.dataset.static = 'on'; noise(cam); setTimeout(() => { delete cam.button.dataset.static; }, 160);
        beep(140, .18);
      }
    }
    return true;
  }
  function glitchStatic() {
    if (!running || done) return;
    const cam = pick(cams);
    cam.button.dataset.static = 'on'; noise(cam);
    // 11/01 떡밥(전구 2페에 있던 것을 옮김): 지직거리는 화면 구석에 교복 치마가 잠깐 비친다.
    const hint = Math.random() < .34; // 지직거림이 걷히는 순간 교복 치마(3D)가 0.4초 서 있다
    const id = setInterval(() => noise(cam), 60);
    setTimeout(() => { clearInterval(id); delete cam.button.dataset.static;
      if (hint) { Cctv3D.addSkirt(cam.scene, true); paint(cam); setTimeout(() => { Cctv3D.addSkirt(cam.scene, false); paint(cam); }, 400); } }, rand(250, 1100));
    if (Math.random() < .25) minutes = Math.max(0, minutes - 15); // 시계가 뒤로 튄다
    extraTimer = setTimeout(glitchStatic, rand(1800, 4200));
  }
  function aiBlock() {
    if (!running || done) return;
    const cam = pick(cams.filter(c => !c.event)) || pick(cams);
    cam.button.dataset.block = 'on'; say(pick(P2.block));
    setTimeout(() => { delete cam.button.dataset.block; }, 2600);
    blockTimer = setTimeout(aiBlock, rand(8000, 12000));
  }

  function look(cam) {
    if (!running || done) return;
    if (cam.button.dataset.block === 'on') { beep(200, .12); return; }
    if (phase === 3) return lookPhase3(cam);
    if (cam.event) {
      const kind = cam.event.kind; clear(cam); caught++;
      mark(cam, 'ok', '확인'); beep(phase === 1 ? 1040 : 300, .09);
      say(phase === 1 ? pick(P1.ok[kind]) : pick(P2.ok));
    } else if (phase === 1) say(pick(P1.empty), 2000);
  }
  // 11/15 사용자 「한 번 틀릴 때마다 목숨이 하나 깎이게 해서, 각 페이즈당 3번의 기회를 주게끔 해」(되물음: 놓칠 때마다 하나, 다 쓰면 그 페이즈 처음부터, 놓쳤을 때 시계가 뒤로 가던 것은 없앰 → 「어 맞아. 작업해」·「ㅇㅇ」).
  //   목숨은 시계 옆에 ♥로. 2페 지직거림 때 가끔 15분 뒤로 가는 것(glitchStatic)은 말씀에 없어 그대로 둠.
  //   3페는 할배 화면이 사라지지 않아 「놓친다」가 없으므로 목숨을 넣지 않음.
  const LIVES = 3;
  let lives = LIVES, restartTimer = 0;
  const livesEl = phase === 3 ? null : document.createElement('div');
  if (livesEl) { livesEl.id = 'lives'; clockEl.after(livesEl); }
  function showLives() {
    if (!livesEl) return;
    livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(LIVES - lives);
    livesEl.setAttribute('aria-label', `목숨 ${lives}`);
  }
  function missed(cam) {
    if (!running || done) return;
    clear(cam);
    mark(cam, 'miss', phase === 1 ? '놓침' : '…', 900);
    lives = Math.max(0, lives - 1); showLives();
    if (lives === 0) return restartPhase();
    say(phase === 1 ? pick(P1.miss) : pick(P2.miss));
  }
  // 목숨을 다 쓰면 그 페이즈를 처음부터: 처음 들어왔을 때와 똑같이(시계 00:00, 목숨 3, CAM 1부터, 두 바퀴 비우기도 다시).
  function restartPhase() {
    running = false; stopTimers();
    restartTimer = setTimeout(() => {
      cams.forEach(c => { clear(c); delete c.button.dataset.block; delete c.button.dataset.static; delete c.button.dataset.mark; });
      minutes = 0; lives = LIVES; caught = 0; sightings = 0; views = 0; held = 0; quiet = true;
      showLives(); showClock(); showCam(0); start();
    }, 1200);
  }

  // --- 3페 ---
  let scene = -1;
  function nextScene() {
    scene++;
    if (scene >= P3.scenes.length) return dawn();
    const s = P3.scenes[scene];
    cams.forEach(c => { c.button.dataset.dim = String(c.index !== s.cam && c.button.dataset.ray !== 'on'); });
    place(cams[s.cam], s.kind, { life: 1e9 });
  }
  function lookPhase3(cam) {
    const s = P3.scenes[scene];
    if (!s || cam.index !== s.cam || !cam.event) return;
    cam.button.dataset.ray = 'on'; beep(660, .2);
    say(s.line, 3200);
    minutes = Math.min(360, 300 + (scene + 1) * 15); showClock();
    // 앞 화면의 할배는 다음 화면으로 옮겨 가므로 지운다. 마지막(로비)은 문 밖으로 나가 화면에서 사라진 뒤 아침.
    if (s.gone) { setTimeout(() => { clear(cam); say(s.gone, 3200); setTimeout(nextScene, 1600); }, 1800); return; }
    setTimeout(() => { clear(cam); nextScene(); }, 1800);
  }
  function dawn() {
    cams.forEach(c => { c.button.dataset.dim = 'false'; });
    main.dataset.dawn = 'true'; minutes = 360; showClock();
    finish(3800, '');
  }

  // --- 끝 ---
  const endCard = $('shift-end');
  function finish(delay, text) {
    if (done) return;
    done = true; running = false; stopTimers();
    main.dataset.phase = 'complete';
    cams.forEach(c => { c.button.disabled = true; });
    if (text) { endCard.innerHTML = text; endCard.classList.add('show'); }
    setTimeout(() => parent.postMessage({ channel, type: 'complete' }, '*'), delay);
  }
  function stopTimers() { clearTimeout(spawnTimer); clearTimeout(extraTimer); clearTimeout(blockTimer); clearTimeout(restartTimer); cancelAnimationFrame(raf); raf = 0; }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(100, now - last) : 0; last = now;
    if (RATE && !quiet && !document.hidden) minutes += RATE * dt / 1000;
    if (!quiet && phase !== 3) spawnByClock();
    if (!document.hidden) { held += dt; if (held >= HOLD) showCam(current + 1); }
    for (const cam of cams) {
      if (!cam.event) continue;
      draw(cam, now);
      if (phase !== 3 && now - cam.event.born > cam.event.life) missed(cam);
    }
    showClock();
    if (phase !== 3 && minutes >= 360) {
      cams.forEach(clear); minutes = 360; showClock();
      if (phase === 2) {
        // 2페 끝: 네 화면 한꺼번에 그림자가 정면으로 선다(0.4초) → 아침.
        main.dataset.scare = 'on';
        cams.forEach(c => place(c, 'shadow', { near: 1.5, life: 1e9 }));
        beep(90, .4);
        setTimeout(() => { cams.forEach(clear); delete main.dataset.scare; }, 420);
        return finish(1600, '06:00');
      }
      return finish(2400, `${P1.end}<small>오늘도 아무도 안 왔다.</small>`);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || done) return;
    running = true; last = 0; main.dataset.phase = 'playing';
    say(phase === 1 ? P1.start : phase === 2 ? P2.start : P3.start, 3600);
    if (!quiet) begin();
    raf = requestAnimationFrame(frame);
  }
  // 두 바퀴가 끝나고 셋째 바퀴 첫 화면이 열릴 때 한 번: 전과 같은 간격으로 나타나기 시작.
  function begin() {
    if (!running || done) return;
    if (phase === 1 || phase === 2) resetSpawns();
    if (phase === 2) { extraTimer = setTimeout(glitchStatic, 900); blockTimer = setTimeout(aiBlock, 6000); }
    if (phase === 3) setTimeout(nextScene, 1500);
  }
  function pause() { running = false; stopTimers(); }

  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    if (event.data.type === 'pause') pause();
    if (event.data.type === 'focus') cams[current].button.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', () => { last = 0; });
  showClock();
  showLives();
  showCam(0);
  start();
  globalThis.CctvGame = { get phase() { return phase; }, get minutes() { return minutes; }, get current() { return current; }, get views() { return views; }, get quiet() { return quiet; }, get lives() { return lives; }, get running() { return running; }, cams, finish: () => finish(0, '') };
})();

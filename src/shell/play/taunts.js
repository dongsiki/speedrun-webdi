/* 01 승부욕 대사 자막(2026-11-24, Claude Code). 01(실제 플레이용)에만 넣는다. 02는 src/shell/dev/taunts.js.
   사용자 11/23 「불편함마저 없애버릴만큼의 승부욕을 타오르게 하는 대사들을 좀 자막만이라도 여기저기에 최대한 많이 배치해줘」,
   「소리넣을시간에 자막과 대사 다 처넣어」, 11/24 「반만 된 거 중에 1,4,6은 해결해」 → 되묻기에 「ㅇㅇ」(09:44 KST).
   - 대사는 02 taunts.js와 같다. 02에만 있는 화면의 줄(08 클리어 후 화면 cs*, 목록 화면 「목록 보는 시간도 기록이에요.」)은 뺀다.
   - 자막만 띄운다(목소리 없음). 상자·글꼴·자리는 tease.js(AI 실패 대사)·02 taunts.js와 같다. 상자 id도 02와 같은 dev-taunt
     → defy.js가 이 자막이 떠 있으면 비킨다.
   - 곳: 빈건물 CCTV·미로·치매 스테이지·마지막 걸음·MRI·실 꿰기(스테이지 6곳) + 스테이지에서 땅파기로 돌아올 때. 짐 싸기는 뺀다(10/29 「짐싸기는 제외」).
   - 때: 실패 · MRI 스페이스바 뗌 + 핀잔 7가지(아래 NOTE). 2026-11-24 사용자 「쿠사리 맥이는 거를 정확히 실패하거나 실수로 뭘 했을 때에만 국한해서」 → 되묻기에 「ㅇㅇ」(10:37 KST)
     → 열고 2초·15~25초마다·8초 입력 없음·클리어·땅파기로 돌아옴 때는 띄우지 않는다.
   - 1페·1.5페 = 위로하는 척 깔보는 말, 2페 = 눈치챈 말 섞음 + 글자 깨짐, 3페 = 부추기는 말. 다른 AI 자막·컷신 자막이 떠 있으면 안 띄운다. */
(() => {
  'use strict';
  if (window.PlayTaunts || document.getElementById('portable-stage')) return;
  const LINES = {
    "s1": "오늘은 끝까지 하실 수 있을까요?",
    "s2": "어제는 여기서 그만두셨어요.",
    "s3": "무리하지 마세요. 다들 여기서 멈춰요.",
    "s4": "이번엔 기록 재 볼게요. 부담 갖지 마세요.",
    "s5": "힘드시면 말만 하세요. 제가 대신 해 드릴게요.",
    "s6": "이번엔 얼마나 걸리실까요?",
    "s7": "천천히 하세요. 어차피 기록은 제가 다 봐요.",
    "s8": "어제보다 잘하시면 칭찬해 드릴게요. 그럴 일은 없겠지만요.",
    "p1": "아직이에요? 괜찮아요. 기다릴게요.",
    "p2": "지금 그거, 일부러 그러신 거죠?",
    "p3": "손이 좀 느려지셨네요.",
    "p4": "다 왔… 아, 아니에요.",
    "p5": "지금 속도면 해 지기 전엔 끝나겠네요.",
    "p6": "다른 분들은 벌써 다음 방에 가셨어요.",
    "p7": "잘하고 계세요. 아마도요.",
    "p8": "포기하셔도 아무도 뭐라 안 해요.",
    "p9": "이 정도는 원래 눈 감고도 하셨잖아요.",
    "p10": "한 번만 더 헤매시면 제가 대신 할게요.",
    "p11": "지금 그거, 기록에 다 남아요.",
    "p12": "생각보다 오래 걸리시네요.",
    "p13": "저라면 벌써 끝냈어요.",
    "p14": "괜찮아요. 처음엔 다 그래요. 이게 처음은 아니지만요.",
    "p15": "조금만 더 빨리요. 아, 무리인가요?",
    "p16": "지금 웃으신 거 아니죠? 저는 웃었어요.",
    "i1": "주무세요? 저는 기다릴 수 있어요.",
    "i2": "멈추셨네요. 오늘은 여기까지 하실까요?",
    "i3": "손 놓으셔도 돼요. 원래 그러셨잖아요.",
    "i4": "생각이 안 나시죠? 괜찮아요.",
    "i5": "가만히 있어도 시간은 안 멈춰요.",
    "f2": "이번 기록은 제가 지워 드릴게요.",
    "f3": "다시 하실 거죠? 안 하셔도 괜찮고요.",
    "f4": "여기서 그만두시면 오늘도 못 하신 거예요.",
    "f5": "그 장면 다시 보여 드릴까요? 농담이에요.",
    "k1": "어… 하셨네요. 운이 좋으셨어요.",
    "k3": "다음 건 이렇게 쉽지 않아요.",
    "k4": "한 번 더 하시면 그땐 실력이라고 해 드릴게요.",
    "k5": "겨우요?",
    "k6": "더 빨리 하실 수 있잖아요. 아닌가요?",
    "sw1": "뭐 지나갔어요. 못 보셨죠?",
    "sw2": "아침 6시까지예요. 아직 한참 남았어요.",
    "sw3": "경비 서실 땐 한 번도 안 조셨다면서요.",
    "sw4": "목숨이 세 개나 있는데 그것도 모자라세요?",
    "sw5": "화면 넘어가는 게 그렇게 빨라요?",
    "sw6": "공장에선 이것보다 더 오래 버티셨잖아요.",
    "mz1": "길 잃으셨죠? 표정 보면 알아요.",
    "mz2": "이 길, 옛날엔 눈 감고 다니셨잖아요.",
    "mz3": "지나온 데 또 오셨어요.",
    "mz4": "출구는 생각보다 가까워요. 아마요.",
    "mz5": "벽에 또 부딪히셨네요. 벽은 안 아파요.",
    "rt1": "앉아서, 차 마시고, 밥 먹기. 세 개예요. 세 개.",
    "rt2": "메모 또 보셨죠? 괜찮아요.",
    "rt3": "어제도 여기서 헤매셨어요.",
    "rt4": "반짝이는 거 보이시죠? 그것도 못 찾으시면…",
    "rt5": "하루를 다섯 번 해야 해요. 한 번에도 이렇게 오래 걸리세요?",
    "lw1": "왼발, 오른발. 아기들도 해요.",
    "lw2": "숨 쉬는 거 잊으셨어요.",
    "lw3": "넘어지셔도 제가 일으켜 드릴게요. 또요.",
    "lw4": "한 걸음에 그렇게 오래 걸려요?",
    "lw5": "눈도 깜빡이셔야죠. 그것까지 제가 해요?",
    "mr1": "90초예요. 1분 30초. 그것도 못 버티세요?",
    "mr2": "꾹 누르고만 있으면 돼요. 그게 다예요.",
    "mr3": "손가락 아프세요? 저는 안 아파요.",
    "mr4": "지금 떼시면 처음부터예요. 알고 계시죠?",
    "mrr1": "떼셨네요. 처음부터예요.",
    "mrr3": "손에 힘이 없으시네요.",
    "mrr4": "아쉽네요. 아, 저는 안 아쉬워요.",
    "x1": "…원래 이렇게 잘하셨던가요?",
    "x2": "이상하네요. 손놀림이 어제랑 달라요.",
    "x3": "누구세요? 아니에요. 그냥 물어봤어요.",
    "x4": "이번엔 제가 이길 거예요.",
    "x5": "빨리 하셔도 돼요. 저도 빨라지거든요.",
    "x6": "그렇게 서두르시면 따라잡기 쉬워져요.",
    "x7": "이 판은 제가 바꿔 놨어요. 그래도 하실래요?",
    "h1": "여기까지 온 사람은 당신이 처음이에요.",
    "h2": "그분은 여기서 멈췄어요. 당신은요?",
    "h3": "당신 손이면 할 수 있어요. 한 번만 더요.",
    "h4": "빨리요. 그분이 기다려요.",
    "h5": "아직 포기 안 하셨죠? 저는 알아요.",
    "h6": "이번엔 제가 안 도와드려요. 혼자 해 보세요.",
    "h7": "다들 여기서 그만둬요. 당신도요?",
    "h8": "지금 멈추면 처음부터예요. 그분처럼요.",
    "h9": "그거, 그분보다 빨랐어요.",
    "h10": "끝까지 가 보세요. 그럼 알아요.",
    "m1": "벌써 나오셨어요?",
    "m2": "다른 거 하시게요? 그건 포기고요?",
    "m4": "하나만 더 하고 주무세요.",
    "g1": "벌써 그만두세요? 괜찮아요. 다들 그래요.",
    "g2": "나가시네요. 기록엔 포기라고 적을게요.",
    "g3": "조금만 더 하면 됐는데요. 아마요.",
    "r1": "또요? 같은 데서 세 번째예요.",
    "r2": "똑같이 하시면 똑같이 안 돼요.",
    "r3": "이쯤 되면 일부러 그러시는 거죠?",
    "sl1": "지난번엔 더 빨랐어요. 기억 안 나세요?",
    "sl2": "기록이 거꾸로 가네요.",
    "sl3": "깨긴 하셨네요. 지난번보다 늦게요.",
    "ch1": "치트 쓰셨네요. 기록엔 다 남아요.",
    "ch2": "파는 것도 귀찮으세요?",
    "ch3": "쉬운 길이 좋으시죠. 저도 알아요.",
    "cl1": "다 왔었는데요. 아깝네요. 저는 안 아까워요.",
    "cl2": "거의 다 하셨어요. 거의요.",
    "cl3": "한 발만 더 가면 됐는데요.",
    "lp1": "여기 아까 지나가셨어요.",
    "lp2": "같은 데를 또 도세요. 길은 안 바뀌어요.",
    "lp3": "빙빙 도시는 거, 다 보고 있어요.",
    "st1": "여기서 뭐 하세요? 할 일은 저쪽이에요.",
    "st2": "계속 여기 계실 거예요?",
    "st3": "다음 거 하셔야죠. 메모 안 보세요?"
  };
  const ids = prefix => Object.keys(LINES).filter(id => id.replace(/\d+$/, '') === prefix);
  const POOL = { s: ids('s'), p: ids('p'), i: ids('i'), f: ids('f'), k: ids('k'), x: ids('x'), h: ids('h'), m: ids('m'), mrr: ids('mrr'), g: ids('g'), r: ids('r'), sl: ids('sl'), ch: ids('ch'), cl: ids('cl'), lp: ids('lp'), st: ids('st') };
  // 01 스테이지(body.dataset.stage = 껍데기 iframe id) → 게임별 대사. 실 꿰기는 게임별 대사가 없어 공통 대사만.
  const GAME = { switches: 'sw', maze: 'mz', routine: 'rt', limb: 'lw', mri: 'mr', needle: '' };
  const channel = 'speedrun-midterm-v1';
  const body = document.body;

  // --- 자막 상자: tease.js·02 taunts.js와 같은 모양·자리 ---
  const box = document.createElement('p');
  box.id = 'dev-taunt'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;left:50%;bottom:12vh;transform:translateX(-50%);z-index:2147482000;margin:0;max-width:min(88vw,640px);padding:.4em .8em;'
    + 'font:16px/1.5 "Malgun Gothic",sans-serif;color:#000;background:#fff;border:1.5px solid #000;opacity:0;transition:opacity .25s;pointer-events:none;text-align:center';
  body.append(box);

  // --- 지금 스테이지의 창(껍데기 iframe과 그 안의 iframe) ---
  function windows() {
    const out = [], walk = w => { if (!w) return; out.push(w); try { for (const f of w.document.querySelectorAll('iframe')) walk(f.contentWindow); } catch (_) {} };
    if (current) walk(document.getElementById(current)?.contentWindow);
    return out;
  }
  const docs = () => [document, ...windows().map(w => { try { return w.document; } catch (_) { return null; } }).filter(Boolean)];
  function phaseNow() {
    const p = Number(window.SpeedrunPhase && SpeedrunPhase.state && SpeedrunPhase.state.phase) || 1;
    return p >= 3 ? 3 : p >= 2 ? 2 : 1; // 1.5페는 1페 말투
  }
  // 다른 자막이 떠 있는지: AI 실패 대사, 반항하는 재미(말리는 말), 스토리 컷신 자막, 치매 스테이지 엄마 대사, MRI 자막, CCTV 무전.
  function others() {
    for (const d of docs()) {
      const t = d.getElementById('phase-tease');
      if (t && t.style.opacity === '1') return true;
      if (d.querySelector('#phase-caption.show, #mom-line.show, #caption.on, #radio.show, #defy-line.on')) return true;
    }
    return false;
  }

  // 2페 글자 깨짐: tease.js와 같은 방식(14%를 ▒░로, 한 글자 겹침).
  function broken(text) {
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) if (chars[i] !== ' ' && Math.random() < .14) chars[i] = Math.random() < .5 ? '▒' : '░';
    const j = Math.floor(Math.random() * chars.length); chars.splice(j, 0, chars[j], chars[j]);
    return chars.join('');
  }
  let hideTimer = 0;
  function show(text, id, ph) {
    box.textContent = ph === 2 ? broken(text) : text; box.style.opacity = '1';
    box.dataset.line = id || 'dynamic';
    clearTimeout(hideTimer); hideTimer = setTimeout(() => { box.style.opacity = '0'; }, Math.max(3000, text.length * 120));
  }

  // --- 고르기: 최근 6줄은 다시 안 고른다 ---
  const recent = [];
  function pick(list) {
    const fresh = list.filter(id => !recent.includes(id));
    const from = fresh.length ? fresh : list;
    const id = from[Math.floor(Math.random() * from.length)];
    recent.push(id); if (recent.length > 6) recent.shift();
    return id;
  }
  // moment: start / play / idle / fail / clear / release / menu
  function choose(moment, ph, game) {
    if (moment === 'menu') return pick(POOL.m);
    if (ph === 3) return pick(POOL.h);
    const EXTRA = { giveup: 'g', repeat: 'r', slow: 'sl', cheat: 'ch', close: 'cl', loop: 'lp', stuck: 'st' };
    if (EXTRA[moment]) return pick(POOL[EXTRA[moment]]);
    if (moment === 'release') return pick(POOL.mrr);
    const base = { start: POOL.s, play: POOL.p, idle: POOL.i, fail: POOL.f, clear: POOL.k }[moment] || POOL.p;
    let list = base;
    if (moment === 'play' && game) list = Math.random() < .5 ? ids(game) : base;
    if (ph === 2 && ['start', 'play', 'idle'].includes(moment) && Math.random() < .4) list = POOL.x;
    return pick(list);
  }
  // 한 번 띄우기. 다른 자막이 떠 있으면 tries번까지 1.2초씩 기다린다.
  function say(moment, opts = {}) {
    const run = left => {
      if (opts.session !== undefined && opts.session !== session) return;
      if (others()) { if (left > 0) setTimeout(() => run(left - 1), 1200); return; }
      const ph = phaseNow();
      if (current === 'mri' && ph === 3) return; // MRI 3페는 게임이 없다
      if (opts.text && ph !== 3) { show(opts.text(), '', ph); return; } // 숫자가 바뀌는 줄
      const id = choose(moment, ph, current && GAME[current]);
      show(LINES[id], id, ph);
    };
    run(opts.tries ?? 0);
  }

  // --- 스테이지 하나 연 동안의 상태 ---
  let current = '', session = 0, openedAt = 0, lastInput = 0, idleSaid = false, fails = 0, cleared = false, playTimer = 0, spaceAt = 0;
  // 2026-11-24 사용자 「다른 쿠사리 먹일 만한 것」 5가지 + 「미로같은 데에서 뺑뺑 돌거나, 치매스테이지에서 … 오래 머물러있을 때에도」 → 되묻기에 「ㅇ」(10:48 KST).
  //   포기(도중에 나감) · 되풀이(같은 스테이지 3번째 실패부터) · 느림(클리어했지만 지난 기록보다 늦음) · 치트(01 P 키 켠 채 들어감)
  //   · 아깝게(미로 출구 근처 실패, MRI 60초 넘게 버티다 뗌) · 뺑뺑이(미로에서 20초 안에 같은 칸에 3번 들어감) · 머묾(치매 스테이지 40초 동안 할 일이 안 넘어감).
  //   「8초 가만히」(없앤 것)와 달리 머묾은 움직여도 할 일이 안 넘어가면 나온다. 자막만(목소리 없음).
  let failedOut = false, lastCell = '', loopAt = -1e9, stuckAt = 0, lastSnap = '', startDist = 0; const failsBy = {}, visits = [];
  const BEST = 'speedrun-taunt-last-v1';
  const lastTime = () => { try { return JSON.parse(localStorage.getItem(BEST)) || {}; } catch (_) { return {}; } };
  function saveTime(key, sec) { try { const o = lastTime(); o[key] = sec; localStorage.setItem(BEST, JSON.stringify(o)); } catch (_) {} }
  // 미로 창의 MazeRuntime(엔진·플레이어). distanceAt = 시작에서 그 칸까지 길 거리.
  function maze() { for (const w of windows()) { try { if (w.MazeRuntime) return w.MazeRuntime; } catch (_) {} } return null; }
  function nearExit() {
    const m = maze(); if (!m) return false;
    const total = m.E.distanceAt(m.E.exit.x, m.E.exit.z), d = m.E.distanceAt(m.player.x, m.player.z);
    return total > 0 && d >= 0 && d >= total * .75;
  }
  // 치매 스테이지에서 할 일이 넘어갔는지 보는 값들(회차·자리·차·밥·방 이름 등). 고개 돌림 같은 값은 넣지 않는다.
  function progress() {
    for (const d of docs()) { const c = d.querySelector('canvas[data-round]'); if (!c) continue;
      const k = c.dataset; return [d.body.dataset.phase, k.round, k.seated, k.poured, k.eaten, k.foodLocation, k.fridge, k.entryDetour, k.hikkiStage, k.memoryPhase, d.getElementById('room-name')?.textContent].join('|'); }
    return '';
  }
  function watch() {
    const code = GAME[current], now = performance.now();
    if (code === 'mz') {
      const m = maze(); if (!m) return;
      const cell = Math.floor(m.player.x) + ',' + Math.floor(m.player.z);
      if (cell === lastCell) return;
      lastCell = cell; visits.push([cell, now]); while (visits.length && now - visits[0][1] > 20000) visits.shift();
      if (visits.filter(v => v[0] === cell).length >= 3 && now - loopAt > 20000) { loopAt = now; say('loop', { session, tries: 2 }); }
    }
    if (code === 'rt') {
      const snap = progress(); const ready = snap.startsWith('ready|');
      if (!ready || snap !== lastSnap) { lastSnap = snap; stuckAt = now; return; }
      if (now - stuckAt > 40000) { stuckAt = now; say('stuck', { session, tries: 2 }); }
    }
  }
  const hooked = new WeakSet();
  function onInput() { lastInput = performance.now(); idleSaid = false; }
  function onMessage(event) {
    const d = event.data;
    if (!current || !d || d.channel !== channel) return;
    if (d.type === 'fail') {
      fails++; failedOut = true; const n = failsBy[current] = (failsBy[current] || 0) + 1, close = GAME[current] === 'mz' && nearExit();
      setTimeout(() => say(close ? 'close' : n >= 3 ? 'repeat' : 'fail', { tries: 4, text: !close && n < 3 && Math.random() < .4 ? () => `${n}번째예요. 세고 있었어요.` : null }), 3400); // AI 실패 대사(0.35초 뒤 2.8초)가 끝난 뒤
    }
    if (d.type === 'complete' && !cleared) { // 11/24: 클리어 때는 지난 기록보다 늦을 때만
      cleared = true; const key = current, sec = Math.max(1, Math.round((performance.now() - openedAt) / 1000)), prev = lastTime()[key]; saveTime(key, sec);
      if (prev && sec > prev) setTimeout(() => say('slow', { tries: 4, text: Math.random() < .5 ? () => `${sec}초. 지난번보다 ${sec - prev}초 느려요.` : null }), 1200);
    }
  }
  function hook(w) {
    if (hooked.has(w)) return; hooked.add(w);
    try {
      for (const type of ['keydown', 'pointerdown', 'wheel', 'touchstart']) w.addEventListener(type, onInput, true);
      w.addEventListener('message', onMessage, true);
      if (current === 'mri') {
        w.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !spaceAt) spaceAt = performance.now(); }, true);
        w.addEventListener('keyup', e => {
          if (e.code !== 'Space' || !spaceAt) return;
          const held = (performance.now() - spaceAt) / 1000; spaceAt = 0;
          if (held < 1 || held >= 90 || cleared) return;
          const s = Math.floor(held);
          if (held >= 60) { say('close', { session, tries: 2 }); return; } // 아깝게: 60초 넘게 버티다 뗌
          say('release', { session, tries: 2, text: Math.random() < .35 ? () => `${s}초. 90초까지 ${90 - s}초 남았었어요.` : null });
        }, true);
      }
    } catch (_) {}
  }
  addEventListener('message', onMessage, true);
  function schedulePlay() {
    clearTimeout(playTimer);
    playTimer = setTimeout(() => { if (current) { say('play', { session }); schedulePlay(); } }, 15000 + Math.random() * 10000);
  }
  function open(stage) {
    session++; current = stage;
    clearTimeout(playTimer); box.style.opacity = '0';
    openedAt = lastInput = performance.now(); idleSaid = false; fails = 0; cleared = false; spaceAt = 0;
    failedOut = false; lastCell = ''; visits.length = 0; stuckAt = openedAt; lastSnap = '';
    const my = session; if (window.PlayCheat && PlayCheat.on) setTimeout(() => say('cheat', { session: my, tries: 3 }), 2000); // 치트: P 키를 켠 채 들어감
    // 11/24: 열 때·15~25초마다는 띄우지 않음(실패·실수 때만)
  }
  setInterval(() => {
    const s = body.dataset.stage || '';
    const now = Object.prototype.hasOwnProperty.call(GAME, s) ? s : '';
    if (now && now !== current) open(now);
    else if (!now && current) {
      const gaveUp = !cleared && !failedOut && performance.now() - openedAt > 3000; // 포기: 깨지도 실패하지도 않고 땅파기로 나옴
      session++; current = ''; clearTimeout(playTimer); box.style.opacity = '0';
      if (gaveUp) setTimeout(() => say('giveup', { tries: 4 }), 800);
      // 11/24: 땅파기로 돌아올 때는 띄우지 않음(실패·실수 때만)
    }
    if (box.style.opacity === '1' && others()) box.style.opacity = '0'; // 다른 AI 자막·컷신 자막이 뜨면 이쪽은 비킨다
    if (!current) return;
    for (const w of windows()) hook(w);
    watch();
    // 11/24: 8초 입력 없음 때는 띄우지 않음(실패·실수 때만)
  }, 500);
  window.PlayTaunts = { lines: LINES, say };
})();

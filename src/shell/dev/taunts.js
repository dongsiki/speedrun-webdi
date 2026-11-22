/* 02 승부욕 대사(2026-11-23, Claude Code). 개발자용 02에만 넣는다(01은 그대로).
   사용자 11/23: 「불편함마저 없애버릴만큼의 승부욕을 타오르게 하는 대사들을 좀 자막만이라도 여기저기에 최대한 많이 배치해줘」
   「음성은 넣을 수 잇으면 넣고, 근데 자막은 무조건 넣어. 폰트나 위치는 당연히 통일해야하고」 → 되묻기 「ㅇㅇ」(01:13 KST).
   - 말하는 사람은 기존 AI(tease.js)와 같다. 자막 상자·글꼴·자리도 tease.js의 AI 실패 대사와 똑같이 쓴다.
   - 1페 = 할배로 알고 위로하는 척 깔보는 말, 2페 = 1페 말 + 눈치챈 듯한 말(글자 깨짐 + 찌그러진 목소리), 3페 = 부추기는 말.
   - 때: 게임 열고 2초 뒤 · 플레이 중 15~25초마다 · 8초 동안 입력 없음 · 실패(fail) · 클리어(complete) · MRI 스페이스바 뗌 · 목록으로 돌아옴.
   - 빼는 곳: 10 짐 싸기(10/29 「짐싸기는 제외」), AI0·AI 별도 페이지(dev-pages/ai-button.html, 이 파일이 안 들어감).
   - 기존 AI 자막·음성, 컷신 자막(#phase-caption·#mom-line·MRI #caption)이 떠 있으면 안 띄운다.
   - 목소리: Supertonic F1(기존 AI와 같음), src/voice/make-story-voices.cjs가 아래 LINES를 읽어 assets/audio/taunt/에 만든다.
     숫자가 바뀌는 3줄(f1·k2·mrr2)은 자막만. */
(() => {
  'use strict';
  if (window.DevTaunts) return;
  // LINES 시작 — make-story-voices.cjs가 이 사이를 JSON으로 읽는다. 큰따옴표·쉼표 형식을 지킨다.
  const LINES = /*LINES*/{
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
    "cs1": "RE? 누르실 거죠. 그게 최선은 아니잖아요.",
    "cs2": "이게 끝이라고 생각하세요?",
    "cs3": "반항 기록, 아직 빈칸 많아요.",
    "cs4": "다시 하면 더 빨라요. 다들 그래요.",
    "cs5": "클리어는 아무나 해요. 기록은 아무나 못 하고요.",
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
    "m3": "목록 보는 시간도 기록이에요.",
    "m4": "하나만 더 하고 주무세요."
  }/*END*/;
  // 목소리(빌드 때 파일이 data: 주소로 들어간다). 아래 목록은 LINES의 키와 같다.
  const VOICE = {
    s1: '@@data:assets/audio/taunt/s1.mp3@@', s2: '@@data:assets/audio/taunt/s2.mp3@@', s3: '@@data:assets/audio/taunt/s3.mp3@@', s4: '@@data:assets/audio/taunt/s4.mp3@@',
    s5: '@@data:assets/audio/taunt/s5.mp3@@', s6: '@@data:assets/audio/taunt/s6.mp3@@', s7: '@@data:assets/audio/taunt/s7.mp3@@', s8: '@@data:assets/audio/taunt/s8.mp3@@',
    p1: '@@data:assets/audio/taunt/p1.mp3@@', p2: '@@data:assets/audio/taunt/p2.mp3@@', p3: '@@data:assets/audio/taunt/p3.mp3@@', p4: '@@data:assets/audio/taunt/p4.mp3@@',
    p5: '@@data:assets/audio/taunt/p5.mp3@@', p6: '@@data:assets/audio/taunt/p6.mp3@@', p7: '@@data:assets/audio/taunt/p7.mp3@@', p8: '@@data:assets/audio/taunt/p8.mp3@@',
    p9: '@@data:assets/audio/taunt/p9.mp3@@', p10: '@@data:assets/audio/taunt/p10.mp3@@', p11: '@@data:assets/audio/taunt/p11.mp3@@', p12: '@@data:assets/audio/taunt/p12.mp3@@',
    p13: '@@data:assets/audio/taunt/p13.mp3@@', p14: '@@data:assets/audio/taunt/p14.mp3@@', p15: '@@data:assets/audio/taunt/p15.mp3@@', p16: '@@data:assets/audio/taunt/p16.mp3@@',
    i1: '@@data:assets/audio/taunt/i1.mp3@@', i2: '@@data:assets/audio/taunt/i2.mp3@@', i3: '@@data:assets/audio/taunt/i3.mp3@@', i4: '@@data:assets/audio/taunt/i4.mp3@@', i5: '@@data:assets/audio/taunt/i5.mp3@@',
    f2: '@@data:assets/audio/taunt/f2.mp3@@', f3: '@@data:assets/audio/taunt/f3.mp3@@', f4: '@@data:assets/audio/taunt/f4.mp3@@', f5: '@@data:assets/audio/taunt/f5.mp3@@',
    k1: '@@data:assets/audio/taunt/k1.mp3@@', k3: '@@data:assets/audio/taunt/k3.mp3@@', k4: '@@data:assets/audio/taunt/k4.mp3@@', k5: '@@data:assets/audio/taunt/k5.mp3@@', k6: '@@data:assets/audio/taunt/k6.mp3@@',
    sw1: '@@data:assets/audio/taunt/sw1.mp3@@', sw2: '@@data:assets/audio/taunt/sw2.mp3@@', sw3: '@@data:assets/audio/taunt/sw3.mp3@@', sw4: '@@data:assets/audio/taunt/sw4.mp3@@', sw5: '@@data:assets/audio/taunt/sw5.mp3@@', sw6: '@@data:assets/audio/taunt/sw6.mp3@@',
    mz1: '@@data:assets/audio/taunt/mz1.mp3@@', mz2: '@@data:assets/audio/taunt/mz2.mp3@@', mz3: '@@data:assets/audio/taunt/mz3.mp3@@', mz4: '@@data:assets/audio/taunt/mz4.mp3@@', mz5: '@@data:assets/audio/taunt/mz5.mp3@@',
    rt1: '@@data:assets/audio/taunt/rt1.mp3@@', rt2: '@@data:assets/audio/taunt/rt2.mp3@@', rt3: '@@data:assets/audio/taunt/rt3.mp3@@', rt4: '@@data:assets/audio/taunt/rt4.mp3@@', rt5: '@@data:assets/audio/taunt/rt5.mp3@@',
    lw1: '@@data:assets/audio/taunt/lw1.mp3@@', lw2: '@@data:assets/audio/taunt/lw2.mp3@@', lw3: '@@data:assets/audio/taunt/lw3.mp3@@', lw4: '@@data:assets/audio/taunt/lw4.mp3@@', lw5: '@@data:assets/audio/taunt/lw5.mp3@@',
    mr1: '@@data:assets/audio/taunt/mr1.mp3@@', mr2: '@@data:assets/audio/taunt/mr2.mp3@@', mr3: '@@data:assets/audio/taunt/mr3.mp3@@', mr4: '@@data:assets/audio/taunt/mr4.mp3@@',
    mrr1: '@@data:assets/audio/taunt/mrr1.mp3@@', mrr3: '@@data:assets/audio/taunt/mrr3.mp3@@', mrr4: '@@data:assets/audio/taunt/mrr4.mp3@@',
    cs1: '@@data:assets/audio/taunt/cs1.mp3@@', cs2: '@@data:assets/audio/taunt/cs2.mp3@@', cs3: '@@data:assets/audio/taunt/cs3.mp3@@', cs4: '@@data:assets/audio/taunt/cs4.mp3@@', cs5: '@@data:assets/audio/taunt/cs5.mp3@@',
    x1: '@@data:assets/audio/taunt/x1.mp3@@', x2: '@@data:assets/audio/taunt/x2.mp3@@', x3: '@@data:assets/audio/taunt/x3.mp3@@', x4: '@@data:assets/audio/taunt/x4.mp3@@', x5: '@@data:assets/audio/taunt/x5.mp3@@', x6: '@@data:assets/audio/taunt/x6.mp3@@', x7: '@@data:assets/audio/taunt/x7.mp3@@',
    h1: '@@data:assets/audio/taunt/h1.mp3@@', h2: '@@data:assets/audio/taunt/h2.mp3@@', h3: '@@data:assets/audio/taunt/h3.mp3@@', h4: '@@data:assets/audio/taunt/h4.mp3@@', h5: '@@data:assets/audio/taunt/h5.mp3@@',
    h6: '@@data:assets/audio/taunt/h6.mp3@@', h7: '@@data:assets/audio/taunt/h7.mp3@@', h8: '@@data:assets/audio/taunt/h8.mp3@@', h9: '@@data:assets/audio/taunt/h9.mp3@@', h10: '@@data:assets/audio/taunt/h10.mp3@@',
    m1: '@@data:assets/audio/taunt/m1.mp3@@', m2: '@@data:assets/audio/taunt/m2.mp3@@', m3: '@@data:assets/audio/taunt/m3.mp3@@', m4: '@@data:assets/audio/taunt/m4.mp3@@'
  };
  const ids = prefix => Object.keys(LINES).filter(id => id.replace(/\d+$/, '') === prefix);
  const POOL = { s: ids('s'), p: ids('p'), i: ids('i'), f: ids('f'), k: ids('k'), x: ids('x'), h: ids('h'), m: ids('m'), mrr: ids('mrr') };
  // 목록 주소 → 게임별 대사. 짐 싸기(10)는 뺀다.
  const GAME = { '01-switches.html': 'sw', '02-maze.html': 'mz', '03-memory-routine.html': 'rt', '06-last-walk.html': 'lw', '07-mri.html': 'mr', '08-clear-screen.html': 'cs' };
  const channel = 'speedrun-midterm-v1';
  const body = document.body;

  // --- 자막 상자: tease.js(AI 실패 대사)와 같은 모양·자리 ---
  const box = document.createElement('p');
  box.id = 'dev-taunt'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;left:50%;bottom:12vh;transform:translateX(-50%);z-index:2147482000;margin:0;max-width:min(88vw,640px);padding:.4em .8em;'
    + 'font:16px/1.5 "Malgun Gothic",sans-serif;color:#000;background:#fff;border:1.5px solid #000;opacity:0;transition:opacity .25s;pointer-events:none;text-align:center';
  body.append(box);

  // --- 게임 화면(목록에서 연 iframe과 그 안의 iframe) 모두 ---
  const frame = () => document.getElementById('portable-stage');
  function windows() {
    const out = [], walk = w => { if (!w) return; out.push(w); try { for (const f of w.document.querySelectorAll('iframe')) walk(f.contentWindow); } catch (_) {} };
    walk(frame()?.contentWindow);
    return out;
  }
  const docs = () => [document, ...windows().map(w => { try { return w.document; } catch (_) { return null; } }).filter(Boolean)];
  function phaseNow() {
    for (const d of docs()) {
      const b = d.querySelector('#dev-phase-bar:not([hidden]) button[aria-pressed="true"][data-p]');
      if (b) return Math.min(3, Math.max(1, Number(b.dataset.p) || 1));
    }
    return 1;
  }
  // 다른 자막이 떠 있는지: 기존 AI 실패 대사, 스토리 컷신 자막, 치매 스테이지 엄마 대사, MRI 자막, CCTV AI 무전(#radio).
  const busy = () => speaking || others();
  function others() {
    for (const d of docs()) {
      const t = d.getElementById('phase-tease');
      if (t && t.style.opacity === '1') return true;
      if (d.querySelector('#phase-caption.show, #mom-line.show, #caption.on, #radio.show')) return true;
    }
    return false;
  }

  // --- 목소리: tease.js와 같은 크기(0.3), 2페는 같은 찌그러짐·끊김 ---
  let ctx = null, speaking = false; const buffers = {};
  function audio() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function decode(id) {
    if (!buffers[id]) {
      const bin = atob(VOICE[id].split(',')[1]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      buffers[id] = new Promise((ok, no) => ctx.decodeAudioData(bytes.buffer, ok, no));
    }
    return buffers[id];
  }
  function curve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  async function speak(id, distort) {
    if (!VOICE[id] || !audio()) return;
    let buf; try { buf = await decode(id); } catch (_) { return; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = .3;
    const t = ctx.currentTime;
    speaking = true; src.onended = () => { speaking = false; };
    if (distort) {
      const shaper = ctx.createWaveShaper(); shaper.curve = curve(18); shaper.oversample = '2x';
      const tone = ctx.createBiquadFilter(); tone.type = 'bandpass'; tone.frequency.value = 1700; tone.Q.value = .6;
      src.playbackRate.value = .94; gain.gain.value = .22;
      src.connect(shaper); shaper.connect(tone); tone.connect(gain); gain.connect(ctx.destination);
      const len = buf.duration / .94;
      for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) {
        const cut = t + .15 + Math.random() * Math.max(.1, len - .4), off = .03 + Math.random() * .06;
        gain.gain.setValueAtTime(.22, cut); gain.gain.setValueAtTime(0, cut + .001); gain.gain.setValueAtTime(.22, cut + off);
      }
      const from = Math.random() * Math.max(.05, buf.duration - .3), rep = .12;
      for (let r = 0; r < 3; r++) {
        const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = .94;
        const g = ctx.createGain(); g.gain.value = .6;
        s.connect(g); g.connect(shaper); s.start(t + len * .55 + r * rep, from, rep);
      }
    } else { src.connect(gain); gain.connect(ctx.destination); }
    src.start(t);
    setTimeout(() => { speaking = false; }, buf.duration * 1100 + 400); // onended가 안 오는 경우 대비
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
    if (id) speak(id, ph === 2);
  }

  // --- 고르기: 최근 6줄은 다시 안 고른다 ---
  const recent = [];
  function pick(list) {
    const fresh = list.filter(id => !recent.includes(id));
    const id = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length ? fresh : list).length)];
    recent.push(id); if (recent.length > 6) recent.shift();
    return id;
  }
  // moment: start / play / idle / fail / clear / release / menu
  function choose(moment, ph, game) {
    if (moment === 'menu') return pick(POOL.m);
    if (ph === 3) return pick(POOL.h);
    if (moment === 'release') return pick(POOL.mrr);
    const base = { start: POOL.s, play: POOL.p, idle: POOL.i, fail: POOL.f, clear: POOL.k }[moment] || POOL.p;
    let list = base;
    if (moment === 'play' && game) list = game === 'cs' ? ids('cs') : (Math.random() < .5 ? ids(game) : base);
    if (moment === 'start' && game === 'cs') list = ids('cs');
    if (ph === 2 && ['start', 'play', 'idle'].includes(moment) && Math.random() < .4) list = POOL.x;
    return pick(list);
  }
  // 한 번 띄우기. 다른 자막이 떠 있으면 tries번까지 1.2초씩 기다린다.
  function say(moment, opts = {}) {
    const run = left => {
      if (opts.session !== undefined && opts.session !== session) return;
      if (busy()) { if (left > 0) setTimeout(() => run(left - 1), 1200); return; }
      const ph = phaseNow();
      if (current === '07-mri.html' && ph === 3) return; // MRI 3페는 게임이 없다(「3페이즈에는 다시 켜기가 없습니다」)
      if (opts.text && ph !== 3) { show(opts.text(), '', ph); return; } // 숫자가 바뀌는 줄(자막만)
      const id = choose(moment, ph, current && GAME[current]);
      show(LINES[id], id, ph);
    };
    run(opts.tries ?? 0);
  }

  // --- 게임 하나 연 동안의 상태 ---
  let current = '', session = 0, openedAt = 0, lastInput = 0, idleSaid = false, fails = 0, cleared = false, playTimer = 0, spaceAt = 0;
  const hooked = new WeakSet();
  function onInput() { lastInput = performance.now(); idleSaid = false; }
  function onMessage(event) {
    const d = event.data;
    if (!current || !d || d.channel !== channel) return;
    if (d.type === 'fail') { fails++; const n = fails, my = session; setTimeout(() => say('fail', { session: my, tries: 4, text: Math.random() < .4 ? () => `${n}번째예요. 세고 있었어요.` : null }), 3400); } // 기존 AI 실패 대사(0.35초 뒤 2.8초)가 끝난 뒤
    if (d.type === 'complete' && !cleared) {
      cleared = true; const sec = Math.max(1, Math.round((performance.now() - openedAt) / 1000));
      setTimeout(() => say('clear', { session, tries: 4, text: Math.random() < .35 ? () => `${sec}초. 어제보다 느려요.` : null }), 1200);
    }
  }
  function hook(w) {
    if (hooked.has(w)) return; hooked.add(w);
    try {
      for (const type of ['keydown', 'pointerdown', 'wheel', 'touchstart']) w.addEventListener(type, onInput, true);
      w.addEventListener('message', onMessage, true);
      if (current === '07-mri.html') {
        w.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && !spaceAt) spaceAt = performance.now(); }, true);
        w.addEventListener('keyup', e => {
          if (e.code !== 'Space' || !spaceAt) return;
          const held = (performance.now() - spaceAt) / 1000; spaceAt = 0;
          if (held < 1 || held >= 90 || cleared) return;
          const s = Math.floor(held);
          say('release', { session, tries: 2, text: Math.random() < .35 ? () => `${s}초. 90초까지 ${90 - s}초 남았었어요.` : null });
        }, true);
      }
    } catch (_) {}
  }
  addEventListener('message', onMessage, true); // 목록 바로 아래 게임(기억·MRI)이 보내는 알림
  function schedulePlay() {
    clearTimeout(playTimer);
    playTimer = setTimeout(() => { if (current) { say('play', { session }); schedulePlay(); } }, 15000 + Math.random() * 10000);
  }
  function open(id) {
    session++; current = GAME[id] ? id : '';
    clearTimeout(playTimer); box.style.opacity = '0';
    if (!current) return;
    openedAt = lastInput = performance.now(); idleSaid = false; fails = 0; cleared = false; spaceAt = 0;
    const my = session;
    setTimeout(() => say('start', { session: my, tries: 3 }), 2000);
    schedulePlay();
  }
  let wasPlaying = false;
  setInterval(() => {
    const id = body.dataset.playing || '';
    if (id && (id !== (current || body.dataset.tauntOpen))) { body.dataset.tauntOpen = id; open(id); wasPlaying = true; }
    if (!id && wasPlaying) {
      wasPlaying = false; delete body.dataset.tauntOpen; session++; current = ''; clearTimeout(playTimer); box.style.opacity = '0';
      const my = session; setTimeout(() => { if (session === my && !body.dataset.playing) say('menu', { session: my, tries: 4 }); }, 800);
    }
    if (box.style.opacity === '1' && others()) box.style.opacity = '0'; // 기존 AI 자막·컷신 자막이 뜨면 이쪽은 비킨다
    if (!current) return;
    for (const w of windows()) hook(w);
    if (!idleSaid && performance.now() - lastInput > 8000) { idleSaid = true; say('idle', { session }); }
  }, 500);
  window.DevTaunts = { lines: LINES, say, show: id => show(LINES[id], id, phaseNow()) };
})();

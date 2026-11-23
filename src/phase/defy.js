/* 반항하는 재미(2026-11-24, Claude Code). 01·02 공통.
   사용자 11/24 「반항하는 재미: AI가 「그건 하지 마세요」라고 말리는 행동을 하면 반항 기록이 열립니다.」 「ㅇㅋ 이거 해」, 되묻기에 「ㅇㅇ」.
   - 1·2페에서 AI가 스테이지마다 한 가지를 말린다(자막 + 기존 AI 목소리 Supertonic F1). 3페는 말리지 않는다.
     2페는 tease.js·taunts.js와 같은 글자 깨짐·찌그러진 목소리.
   - 말린 뒤 그 행동을 하면 반항 기록이 열린다. 01은 rebellion.js(RebellionLog.defy)가 기록·알림을 맡는다.
     02는 rebellion.js가 없어 같은 저장(localStorage 'speedrun-rebellion-v1')에 적어 두고, 반항 기록 화면을 열 때 열린다.
   - 땅파기: 물건 일곱 개를 다 찾은 뒤 「그만 파세요」 → 더 파기(10번 누름)
     빈건물 CCTV: 「넘기지 마세요」 → → / D로 넘기기(3번)
     미로: 「뒤로 가지 마세요」 → 뒤로 걷기(S / ↓)
     치매 스테이지: 「멈추지 마세요」 → 20초 동안 가만히 있기
     마지막 걸음: 「눈 깜빡이지 마세요」 → E로 눈 깜빡이기(3번)
     MRI: 55초 누르고 있으면 「이제 떼셔도 돼요」 → 안 떼고 끝까지 누르고 있기
     실 꿰기: 「숨 참으세요」 → 원래 있는 반항 기록 「숨을 참지 않았다」(rebellion.js needleBare)에 잇는다(여기서는 말만 한다).
     짐 싸기는 뺀다(10/29 「짐싸기는 제외」).
   - 02의 놀림 대사(taunts.js)는 01에 넣지 않는다(02만). 이 파일은 01·02 모두에 넣는다. */
(() => {
  'use strict';
  if (window.SpeedrunDefy) return;
  const channel = 'speedrun-midterm-v1', KEY = 'speedrun-rebellion-v1';
  const LINES = {
    'd-dig': '다 찾으셨어요. 이제 그만 파세요.',
    'd-sw': '넘기지 마세요. 한 화면은 10초씩 보셔야 해요.',
    'd-mz': '뒤로 가지 마세요. 앞만 보고 가세요.',
    'd-rt': '멈추지 마세요. 계속 움직이셔야 해요.',
    'd-lw': '눈 깜빡이지 마세요. 그건 제가 해 드릴게요.',
    'd-nd': '숨 참으세요. 그래야 꿰져요.',
    'd-mr': '이제 떼셔도 돼요. 그만하셔도 돼요.'
  };
  // 목소리는 01·02 파일 안에 넣지 않고 옆 assets/audio/defy/ 폴더의 mp3를 읽는다(2026-11-24 사용자 되묻기에 「어 해」).
  // 깃허브는 저장소의 assets/audio/defy, PC는 game/play·game/dev 아래 같은 이름 폴더에 둔다.
  const VOICE = {};
  for (const id of Object.keys(LINES)) VOICE[id] = 'assets/audio/defy/' + id + '.mp3';
  // 반항 기록 한 줄(기록 목록에 남는 글). 앞의 id는 rebellion.js의 반항 기록 id와 같다.
  const DONE = {
    dig: ['defyDig', '그만 파라는 말을 듣고도 그는 더 팠다.'],
    switches: ['defyCctv', '기다리라는 말에도 그는 화면을 넘겼다.'],
    maze: ['defyMaze', '앞만 보라는 말에도 그는 뒤로 걸었다.'],
    routine: ['defyRoutine', '멈추지 말라는 말에도 그는 가만히 있었다.'],
    limb: ['defyLimb', '깜빡이지 말라는 말에도 그는 눈을 감았다 떴다.'],
    mri: ['defyMri', '떼도 된다는 말에도 그는 끝까지 누르고 있었다.']
  };
  const body = document.body;
  // 01: 껍데기 iframe id(body.dataset.stage). 02: 목록 주소(body.dataset.playing).
  const DEV = { '01-switches.html': 'switches', '02-maze.html': 'maze', '03-memory-routine.html': 'routine', '06-last-walk.html': 'limb', '07-mri.html': 'mri' };
  const PLAY = ['digging', 'switches', 'maze', 'routine', 'limb', 'needle', 'mri'];
  const isDev = () => !!document.getElementById('portable-stage');
  function stageNow() {
    if (isDev()) return DEV[body.dataset.playing || ''] || '';
    const s = body.dataset.stage || '';
    return PLAY.includes(s) ? s : '';
  }
  function rootFrame(stage) { return isDev() ? document.getElementById('portable-stage') : document.getElementById(stage); }
  function windows(stage) {
    const out = [], walk = w => { if (!w) return; out.push(w); try { for (const f of w.document.querySelectorAll('iframe')) walk(f.contentWindow); } catch (_) {} };
    if (stage) walk(rootFrame(stage)?.contentWindow);
    return out;
  }
  const docs = stage => [document, ...windows(stage).map(w => { try { return w.document; } catch (_) { return null; } }).filter(Boolean)];
  // 지금 페이즈: 02는 게임 위 1·2·3페 버튼, 01은 진행 저장(SpeedrunPhase).
  function phaseNow() {
    for (const d of docs(current)) {
      const b = d.querySelector('#dev-phase-bar:not([hidden]) button[aria-pressed="true"][data-p]');
      if (b) return Math.min(3, Math.max(1, Number(b.dataset.p) || 1));
    }
    const p = Number(body.dataset.devPhase || (window.SpeedrunPhase && SpeedrunPhase.state && SpeedrunPhase.state.phase) || 1);
    return [1, 2, 3].includes(p) ? p : 1;
  }

  // --- 자막: tease.js·taunts.js와 같은 상자·글꼴·자리 ---
  const box = document.createElement('p');
  box.id = 'defy-line'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;left:50%;bottom:12vh;transform:translateX(-50%);z-index:2147482000;margin:0;max-width:min(88vw,640px);padding:.4em .8em;'
    + 'font:16px/1.5 "Malgun Gothic",sans-serif;color:#000;background:#fff;border:1.5px solid #000;opacity:0;transition:opacity .25s;pointer-events:none;text-align:center';
  body.append(box);
  // 다른 자막이 떠 있는지: AI 실패 대사(#phase-tease), 02 놀림 대사(#dev-taunt), 컷신 자막, 치매 스테이지 엄마 대사, MRI 자막, CCTV 무전.
  function others() {
    for (const d of docs(current)) {
      for (const id of ['phase-tease', 'dev-taunt']) { const t = d.getElementById(id); if (t && t.style.opacity === '1') return true; }
      if (d.querySelector('#phase-caption.show, #mom-line.show, #caption.on, #radio.show')) return true;
    }
    return false;
  }

  // --- 목소리: tease.js와 같은 크기(0.3), 2페는 같은 찌그러짐·끊김 ---
  let ctx = null; const buffers = {};
  function audio() {
    const P = window.SpeedrunPhase;
    ctx = (P && P.audio && P.audio()) || ctx;
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function decode(id) {
    if (!buffers[id]) {
      buffers[id] = fetch(VOICE[id]).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(data => new Promise((ok, no) => ctx.decodeAudioData(data, ok, no)));
      buffers[id].catch(() => { delete buffers[id]; });
    }
    return buffers[id];
  }
  // 파일을 바로 연(file://) 때는 fetch가 막히므로 그냥 <audio>로 같은 크기(0.3)로 튼다(2페 찌그러짐 없음).
  function plain(id) {
    try { const a = new Audio(VOICE[id]); a.volume = .3; a.play().catch(() => {}); } catch (_) {}
  }
  function curve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }
  async function speak(id, distort) {
    if (!VOICE[id]) return;
    if (!audio()) { plain(id); return; }
    let buf; try { buf = await decode(id); } catch (_) { plain(id); return; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = .3;
    const t = ctx.currentTime;
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
  }
  // 2페 글자 깨짐: tease.js와 같은 방식(14%를 ▒░로, 한 글자 겹침).
  function broken(text) {
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) if (chars[i] !== ' ' && Math.random() < .14) chars[i] = Math.random() < .5 ? '▒' : '░';
    const j = Math.floor(Math.random() * chars.length); chars.splice(j, 0, chars[j], chars[j]);
    return chars.join('');
  }
  let hideTimer = 0;
  // 말리기 한 번. 다른 자막이 떠 있으면 1.2초씩 tries번 기다린다. 띄웠으면 then()을 부른다.
  function warn(id, then, tries = 6) {
    const my = session;
    const run = left => {
      if (my !== session) return;
      const ph = phaseNow();
      if (ph === 3) return; // 3페는 AI가 말리지 않는다(도와달라는 페이즈)
      if (id === 'd-mr' && !holdAt) return; // 기다리는 사이 손을 뗐으면 말하지 않는다
      if (others()) { if (left > 0) setTimeout(() => run(left - 1), 1200); return; }
      box.textContent = ph === 2 ? broken(LINES[id]) : LINES[id];
      box.style.opacity = '1'; box.classList.add('on'); box.dataset.line = id;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { box.style.opacity = '0'; box.classList.remove('on'); }, Math.max(3200, LINES[id].length * 130));
      speak(id, ph === 2);
      warned = true; then && then();
    };
    run(tries);
  }

  // --- 반항이 일어났을 때 ---
  function defied(key) {
    const [rid, text] = DONE[key];
    if (done.has(key)) return; done.add(key); armed = false;
    if (window.RebellionLog && RebellionLog.defy) { RebellionLog.defy(rid, text); return; }
    // 02: rebellion.js가 없으므로 같은 저장에 적어 둔다. 반항 기록 화면이 열릴 때 rebellion.js가 연다.
    try {
      const store = JSON.parse(localStorage.getItem(KEY)) || { v: 1, runs: 0, unlocked: {}, log: [] };
      if (store.v !== 1) return;
      store.defy = store.defy || {}; store.defy[rid] = (store.defy[rid] || 0) + 1;
      store.log = store.log || []; store.log.push({ at: Date.now(), run: store.runs || 0, text });
      if (store.log.length > 300) store.log.splice(0, store.log.length - 300);
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (_) {}
  }

  // --- 스테이지 하나 연 동안의 상태 ---
  let current = '', session = 0, warned = false, armed = false, count = 0, lastInput = 0, holdAt = 0, holdWarned = false, warnTimer = 0;
  const done = new Set(); // 이번 판(페이지를 다시 불러오기 전)에 이미 연 반항
  const found = new Set(); // 땅파기에서 찾은 물건(01)
  const hooked = new WeakSet();
  function onKey(e) {
    lastInput = performance.now();
    if (current === 'mri' && e.code === 'Space' && !e.repeat && !holdAt) holdAt = performance.now();
    if (!armed) return;
    if (current === 'switches' && !e.repeat && (e.code === 'ArrowRight' || e.code === 'KeyD') && ++count >= 3) defied('switches');
    if (current === 'maze' && (e.code === 'KeyS' || e.code === 'ArrowDown') && ++count >= 8) defied('maze');
    if (current === 'limb' && !e.repeat && e.code === 'KeyE' && ++count >= 3) defied('limb');
  }
  function onKeyUp(e) {
    lastInput = performance.now();
    if (current === 'mri' && e.code === 'Space') { holdAt = 0; armed = false; if (!warned) holdWarned = false; }
  }
  function onPointer() {
    lastInput = performance.now();
    if (current === 'digging' && armed && ++count >= 10) defied('dig');
  }
  const onOther = () => { lastInput = performance.now(); };
  function onMessage(event) {
    const d = event.data;
    if (!d || d.channel !== channel) return;
    if (d.type === 'found' && d.object && stageNow() === 'digging') {
      found.add(d.object);
      if (found.size >= 7 && !done.has('dig') && !warned) warn('d-dig', () => { armed = true; count = 0; }, 3);
    }
    if (d.type === 'complete' && current === 'mri' && armed && holdAt) defied('mri');
  }
  // 페이즈 버튼을 누르면 같은 iframe이 새 문서로 바뀌므로(창 객체는 같음) 문서 단위로 붙인다.
  function hook(w) {
    let doc; try { doc = w.document; } catch (_) { return; }
    if (hooked.has(doc)) return; hooked.add(doc);
    try {
      w.addEventListener('keydown', onKey, true);
      w.addEventListener('keyup', onKeyUp, true);
      w.addEventListener('pointerdown', onPointer, true);
      for (const type of ['wheel', 'touchstart', 'pointermove']) w.addEventListener(type, onOther, true);
      if (w !== window) w.addEventListener('message', onMessage, true);
    } catch (_) {}
  }
  addEventListener('message', onMessage, true);
  // 들어가고 몇 초 뒤에 말린다(땅파기는 일곱 개를 다 찾았을 때, MRI는 55초 누르고 있을 때).
  const WAIT = { switches: 4000, maze: 5000, routine: 6000, limb: 5000, needle: 3000 };
  const LINE_OF = { switches: 'd-sw', maze: 'd-mz', routine: 'd-rt', limb: 'd-lw', needle: 'd-nd' };
  function open(stage) {
    session++; current = stage; warned = false; armed = false; count = 0; holdAt = 0; holdWarned = false;
    clearTimeout(warnTimer); box.style.opacity = '0'; box.classList.remove('on');
    if (!LINE_OF[stage]) return;
    if (stage !== 'needle' && done.has(stage)) return;
    warnTimer = setTimeout(() => warn(LINE_OF[stage], () => { armed = stage !== 'needle'; count = 0; lastInput = performance.now(); }), WAIT[stage]);
  }
  setInterval(() => {
    const stage = stageNow();
    if (stage !== current) open(stage);
    if (!current) return;
    for (const w of windows(current)) hook(w);
    const now = performance.now();
    if (current === 'routine' && armed && now - lastInput > 20000) defied('routine');
    // MRI는 AI 자막(#caption)이 자주 떠서, 비는 틈을 1.2초씩 20번까지 기다린다. 그 사이 손을 떼면 다음에 다시 55초.
    if (current === 'mri' && holdAt && !holdWarned && !done.has('mri') && now - holdAt > 55000) {
      holdWarned = true; warn('d-mr', () => { armed = !!holdAt; }, 20);
    }
  }, 500);
  window.SpeedrunDefy = { lines: LINES, warn: id => warn(id), get state() { return { current, warned, armed, count, holding: !!holdAt, done: [...done] }; } };
})();

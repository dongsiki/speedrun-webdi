(() => {
  'use strict';
  // AI 단서: 다시 들어가면 물건 하나가 기계처럼 바뀌어 있다(10/21 손글씨 "물체가 달라지는 거 → AI가 여기 있었구나").
  // 그림은 실제 게임 화면 캡처(before)와 Codex가 ImageGen으로 만든 바뀐 판(after). build.cjs가 data URI로 넣음. 좌표는 1280×720 기준.
  const IMAGES = window.AIClueImages || {};
  const W = 1280, H = 720;
  const SCENES = [
    { id: 'suitcase', round: 2, line: '필요 없는 건 제가 지웠어요.', box: [244, 75, 47, 77] },
    { id: 'memory', round: 3, line: '제가 다시 그려 뒀어요.', box: [924, 76, 110, 105] },
    { id: 'maze', round: 4, line: '혼자면 외로우실까 봐요.', box: [538, 345, 63, 153] }
  ];
  const FINAL_LINE = '그런데… 당신 누구예요?';
  const $ = id => document.getElementById(id);
  const frame = $('clue-frame'), img = $('clue-img'), ghostA = $('clue-ghost-a'), ghostB = $('clue-ghost-b');
  const roundEl = $('clue-round'), box = $('clue-box'), miss = $('clue-miss'), paper = $('clue-paper'), line = $('clue-line');
  const enter = $('clue-enter'), hint = $('clue-hint'), next = $('clue-next'), again = $('clue-again');
  const dots = [...document.querySelectorAll('#clue-dots li')];
  const final = $('clue-final'), thumbs = $('clue-thumbs'), who = $('clue-who');
  let index = 0, state = 'before', hintTimer = 0;

  // box = Codex regions.json(바뀐 영역)에 8px 여유를 둔 값. 누름 판정은 30px 더 넓게(폰 터치).
  const src = (scene, kind) => IMAGES[kind + '-' + scene.id] || '';
  SCENES.forEach(scene => ['before', 'after'].forEach(kind => { const pre = new Image(); pre.src = src(scene, kind); }));

  let audio = null;
  function noise(duration = 0.38, volume = 0.05) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const length = Math.floor(audio.sampleRate * duration), buffer = audio.createBuffer(1, length, audio.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) * (i % 900 < 450 ? 1 : 0.3);
      const node = audio.createBufferSource(), gain = audio.createGain(), filter = audio.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 1400; filter.Q.value = 0.8;
      gain.gain.value = volume; node.buffer = buffer;
      node.connect(filter).connect(gain).connect(audio.destination); node.start();
    } catch (_) { /* 소리가 막힌 환경에서도 화면은 그대로 진행 */ }
  }
  function placeBox(target, scene) {
    const [x, y, w, h] = scene.box;
    Object.assign(target.style, { left: x / W * 100 + '%', top: y / H * 100 + '%', width: w / W * 100 + '%', height: h / H * 100 + '%' });
  }
  function show(kind) {
    const scene = SCENES[index];
    img.src = ghostA.src = ghostB.src = src(scene, kind);
    img.alt = kind === 'before' ? '처음 들어갔을 때의 장면' : '다시 들어갔을 때의 장면. 무언가 하나가 달라졌다';
  }
  function reset() {
    const scene = SCENES[index];
    state = 'before'; clearTimeout(hintTimer);
    show('before'); roundEl.textContent = '1';
    box.hidden = true; box.classList.remove('hint'); paper.hidden = true; final.hidden = true;
    frame.parentElement.hidden = false;
    enter.hidden = false; hint.hidden = next.hidden = again.hidden = true;
    enter.focus({ preventScroll: true });
    dots.forEach((dot, i) => dot.classList.toggle('on', i < index));
    frame.dataset.scene = scene.id;
  }
  function reenter() {
    if (state !== 'before') return;
    const scene = SCENES[index];
    state = 'search'; enter.hidden = true;
    frame.classList.remove('glitch'); void frame.offsetWidth; frame.classList.add('glitch');
    noise();
    setTimeout(() => { show('after'); roundEl.textContent = String(scene.round); }, 140);
    setTimeout(() => frame.classList.remove('glitch'), 460);
    hintTimer = setTimeout(() => { if (state === 'search') hint.hidden = false; }, 7000);
  }
  function found() {
    const scene = SCENES[index];
    state = 'found'; clearTimeout(hintTimer); hint.hidden = true;
    box.classList.remove('hint'); placeBox(box, scene); box.hidden = false;
    box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
    noise(0.18, 0.035);
    // 쪽지는 바뀐 물건을 가리지 않게 반대쪽에 붙인다
    const [bx, by, bw, bh] = scene.box, left = bx + bw / 2 > W / 2, low = by + bh / 2 < H / 2;
    Object.assign(paper.style, { left: left ? '4%' : 'auto', right: left ? 'auto' : '4%', top: low ? 'auto' : '6%', bottom: low ? '10%' : 'auto' });
    setTimeout(() => { line.textContent = scene.line; paper.hidden = false; }, 520);
    dots[index].classList.add('on');
    setTimeout(() => { next.textContent = index < SCENES.length - 1 ? "다음 장소" : "모아 보기"; next.hidden = false; next.focus({ preventScroll: true }); }, 1500);
  }
  function finish() {
    frame.parentElement.hidden = true; next.hidden = true;
    thumbs.replaceChildren(...SCENES.map(scene => {
      const card = document.createElement('div'); card.className = 'clue-thumb';
      const pic = document.createElement('img'); pic.src = src(scene, 'after'); pic.alt = '';
      const mark = document.createElement('div'); mark.className = 'clue-box'; placeBox(mark, scene);
      mark.innerHTML = '<i></i>'.repeat(8);
      card.append(pic, mark); return card;
    }));
    final.hidden = false; who.textContent = '';
    setTimeout(() => { who.textContent = FINAL_LINE; who.classList.remove('glitch'); void who.offsetWidth; who.classList.add('glitch'); noise(0.6, 0.06); }, 900);
    setTimeout(() => { again.hidden = false; }, 2400);
  }
  frame.addEventListener('click', event => {
    if (state === 'before') { reenter(); return; }
    if (state !== 'search') return;
    const rect = frame.getBoundingClientRect(), scene = SCENES[index];
    const x = (event.clientX - rect.left) / rect.width * W, y = (event.clientY - rect.top) / rect.height * H;
    const [bx, by, bw, bh] = scene.box, pad = 30;
    if (x >= bx - pad && x <= bx + bw + pad && y >= by - pad && y <= by + bh + pad) { found(); return; }
    miss.hidden = false; miss.style.left = (x / W * 100) + '%'; miss.style.top = (y / H * 100) + '%';
    miss.style.animation = 'none'; void miss.offsetWidth; miss.style.animation = '';
  });
  enter.addEventListener('click', reenter);
  hint.addEventListener('click', () => { const scene = SCENES[index]; placeBox(box, scene); box.classList.add('hint'); box.hidden = false; hint.hidden = true; });
  next.addEventListener('click', () => { if (index < SCENES.length - 1) { index++; reset(); } else finish(); });
  again.addEventListener('click', () => { index = 0; who.classList.remove('glitch'); reset(); });
  window.AIClueDev = { scenes: SCENES, go(i) { index = Math.max(0, Math.min(SCENES.length - 1, i)); reset(); }, reenter, found, finish };
  reset();
})();

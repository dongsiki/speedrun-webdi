(() => {
  'use strict';
  // 개발자용 02의 2페·3페는 phases.js가 맡는다(본편 01에는 phases.js가 없어 늘 1페).
  if (globalThis.SwitchDevPhase > 1 && globalThis.SwitchPhases) { SwitchPhases.run(SwitchDevPhase); return; }
  const P = SwitchPuzzle, art = SwitchArt, $ = id => document.getElementById(id);
  let board = P.INITIAL, demoReported = false;
  const grid = $('switches'), cancelInputs = [];
  const buttons = P.positions.map(({ row, col, x, y }, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'switch'; button.dataset.index = i;
    button.style.left = `${x / 8}%`; button.style.top = `${y / 2.6}%`;
    button.innerHTML = '<img class="lamp" alt="" draggable="false" width="72" height="64"><img class="rocker" alt="" draggable="false" width="72" height="58">';
    let pointerId = null, heldKey = null;
    const face = button.querySelector('.rocker');
    function showPressed(pressed) {
      button.dataset.pressed = String(pressed);
      face.src = art[pressed ? 'switch-pressed' : 'switch-idle'];
    }
    function containsPointer(event) {
      const rect = button.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    }
    function cancel() {
      const captured = pointerId;
      pointerId = null; heldKey = null; showPressed(false);
      if (captured !== null && button.hasPointerCapture(captured)) button.releasePointerCapture(captured);
    }
    cancelInputs.push(cancel);
    button.addEventListener('pointerdown', event => {
      if (switchInterference.locked || button.disabled || event.button !== 0 || event.isPrimary === false || pointerId !== null || heldKey !== null) return;
      pointerId = event.pointerId;
      button.setPointerCapture(pointerId); showPressed(true);
    });
    button.addEventListener('pointermove', event => {
      if (event.pointerId === pointerId) showPressed(containsPointer(event));
    });
    button.addEventListener('pointerup', event => {
      if (event.pointerId !== pointerId) return;
      const commit = containsPointer(event);
      cancel();
      if (commit) activate(i);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, event => {
      if (event.pointerId === pointerId) cancel();
    });
    // Assistive activation can dispatch a click without pointer or key events.
    // Pointer activation was already committed on release; its click is ignored.
    button.addEventListener('click', event => {
      if (event.detail === 0 && pointerId === null && heldKey === null) activate(i);
    });
    button.addEventListener('keydown', event => {
      if (button.disabled) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (!switchInterference.locked && !event.repeat && pointerId === null && heldKey === null) { heldKey = event.key; showPressed(true); }
        return;
      }
      const offset = row ? P.ROWS[0] : 0, length = P.ROWS[row];
      const across = row ? col : P.ROWS[0] + Math.min(col, P.ROWS[1] - 1);
      const next = { ArrowLeft: offset + (col + length - 1) % length, ArrowRight: offset + (col + 1) % length, ArrowUp: across, ArrowDown: across, Home: offset, End: offset + length - 1 }[event.key];
      if (next !== undefined) { event.preventDefault(); cancel(); buttons[next].focus(); }
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    });
    button.addEventListener('keyup', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (heldKey === event.key) { cancel(); activate(i); }
    });
    button.addEventListener('blur', cancel);
    button.addEventListener('contextmenu', event => event.preventDefault());
    showPressed(false);
    grid.append(button); return button;
  });
  const SwitchMemoryAssets = /* @json assets/data/switches-game-switch-memory-assets-05652ef819.json */ null;
  const switchMemory = (() => {
    const root = $('experience'), button = buttons[P.ROWS[0] - 1];
    const lamp = button.querySelector('.lamp');
    const voice = document.createElement('audio');
    voice.id = 'switch-memory-voice'; voice.hidden = true;
    voice.preload = 'auto'; voice.src = SwitchMemoryAssets.voice; voice.volume = .82;
    document.body.append(voice);
    // Both data images are ready before the first blackout; no network request or animation loop.
    for (const src of [SwitchMemoryAssets.occupied, SwitchMemoryAssets.empty]) {
      const image = new Image(); image.src = src;
    }
    let absent = false, consumed = false, requested = false, playVersion = 0;
    root.dataset.narration = 'idle'; root.dataset.narrationPlays = '0';
    function render() {
      const lit = button.dataset.lit === 'true';
      root.dataset.memory = absent ? 'empty' : 'occupied';
      button.dataset.reflection = lit ? root.dataset.memory : 'hidden';
      lamp.src = lit ? SwitchMemoryAssets[root.dataset.memory] : art['bulb-off'];
    }
    function stop() {
      playVersion++;
      const wasRequested = requested; requested = false;
      voice.pause();
      try { voice.currentTime = 0; } catch (_) { /* No decoded audio yet. */ }
      if (wasRequested) root.dataset.narration = 'stopped';
    }
    function restore(used) {
      absent = absent || Boolean(used); consumed = consumed || Boolean(used);
      render();
    }
    function change() {
      absent = true; render();
      if (consumed) return;
      consumed = true;
      if (document.hidden) { root.dataset.narration = 'skipped'; return; }
      requested = true;
      const version = ++playVersion;
      root.dataset.narration = 'starting';
      root.dataset.narrationPlays = String(Number(root.dataset.narrationPlays) + 1);
      // The manual puzzle presses supply user activation. Audio failure never delays input or completion.
      try {
        const playing = voice.play();
        if (playing?.catch) playing.catch(() => {
          if (version === playVersion && requested) { requested = false; root.dataset.narration = 'blocked'; }
        });
      } catch (_) { requested = false; root.dataset.narration = 'blocked'; }
    }
    voice.addEventListener('playing', () => { if (requested) root.dataset.narration = 'playing'; });
    voice.addEventListener('ended', () => { if (requested) { requested = false; root.dataset.narration = 'ended'; } });
    voice.addEventListener('error', () => { if (requested) { requested = false; root.dataset.narration = 'blocked'; } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
    return { render, restore, change, stop };
  })();

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SwitchInterferenceRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const unit = random => Math.max(0, Math.min(.999999999, random()));
  function create(P, random = Math.random) {
    let used = false, baseline = null, moves = 0;
    return {
      get used() { return used; },
      restore(value) { used = used || Boolean(value); },
      afterMove(before, after) {
        if (used || after === P.GOAL) return null;
        if (baseline === null) baseline = P.distance[before];
        moves++;
        if (moves < 2 || baseline < 2 || P.distance[after] > Math.floor(baseline / 2)) return null;
        const choices = [];
        for (let candidate = 0; candidate <= P.GOAL; candidate++) {
          const distance = P.distance[candidate], lit = P.litCount(candidate);
          if (distance >= 7 && distance <= 9 && lit >= 6 && lit <= 10 && P.litCount(candidate ^ after) >= 5 && candidate !== before) choices.push(candidate);
        }
        const replacement = choices[Math.floor(unit(random) * choices.length)];
        if (replacement === undefined) return null;
        used = true;
        return replacement;
      }
    };
  }
  const nextDelay = (random = Math.random) => 4400 + Math.floor(unit(random) * 6500);
  const pulse = (random = Math.random) => ({ double: unit(random) < .38, duration: 130 + Math.floor(unit(random) * 90), gap: 540 + Math.floor(unit(random) * 300) });
  return { create, nextDelay, pulse };
});

  const switchInterference = (() => {
    const rules = SwitchInterferenceRules.create(P), root = $('experience');
    const motion = matchMedia('(prefers-reduced-motion:reduce-off)'), timers = new Set();
    const cover = document.createElement('div');
    cover.className = 'switch-blackout'; cover.id = 'switch-blackout'; cover.dataset.on = 'false'; cover.setAttribute('aria-hidden', 'true');
    document.body.append(cover);
    let active = false, locked = false, pending = null, mutations = 0, flickers = 0;
    function telemetry() {
      root.dataset.interferenceUsed = String(rules.used);
      root.dataset.reshuffles = String(mutations); root.dataset.flickers = String(flickers);
      root.dataset.blackout = cover.dataset.on;
    }
    function show(value) { cover.dataset.on = String(value); telemetry(); }
    function later(fn, delay) {
      const id = setTimeout(() => { timers.delete(id); if (active) fn(); }, delay);
      timers.add(id); return id;
    }
    function clearTimers() { for (const id of timers) clearTimeout(id); timers.clear(); }
    function commit() {
      if (pending === null) return;
      board = pending; pending = null; mutations++; switchMemory.change(); render(); telemetry();
      parent.postMessage({ channel: 'speedrun-midterm-v1', type: 'switch-interference-used' }, '*');
    }
    function schedule() {
      if (!active || !rules.used || document.hidden || motion.matches || board === P.GOAL) return;
      later(fakeFlash, SwitchInterferenceRules.nextDelay());
    }
    function fakeFlash() {
      if (document.hidden || motion.matches) return;
      const pulse = SwitchInterferenceRules.pulse(); flickers++; show(true);
      later(() => show(false), pulse.duration);
      if (pulse.double) {
        later(() => { flickers++; show(true); }, pulse.gap);
        later(() => { show(false); schedule(); }, pulse.gap + pulse.duration);
      } else later(schedule, pulse.duration);
    }
    function finish() {
      active = false; pending = null; locked = false; clearTimers(); show(false); switchMemory.stop();
    }
    function consider(before, after) {
      const replacement = rules.afterMove(before, after);
      if (replacement === null) return;
      pending = replacement; locked = true; cancelInputs.forEach(cancel => cancel()); show(true);
      // Replace only while the first blackout covers the whole board.
      later(commit, motion.matches ? 240 : 80);
      later(() => { locked = false; show(false); schedule(); }, motion.matches ? 620 : 260);
    }
    window.addEventListener('message', event => {
      if (event.source !== parent || event.data?.channel !== 'speedrun-midterm-v1') return;
      if (event.data.type === 'interference-state') {
        if (active) return;
        active = true; rules.restore(event.data.used); switchMemory.restore(event.data.used); telemetry(); schedule();
      }
      if (event.data.type === 'pause') finish();
    });
    document.addEventListener('visibilitychange', () => {
      if (!active) return;
      if (document.hidden) { commit(); clearTimers(); locked = false; show(false); }
      else schedule();
    });
    motion.addEventListener('change', () => {
      if (!active) return;
      commit(); clearTimers(); locked = false; show(false); schedule();
    });
    telemetry();
    return { get locked() { return locked || !active; }, consider, finish };
  })();

  function render() {
    const done = board === P.GOAL;
    if (done) { switchInterference.finish(); cancelInputs.forEach(cancel => cancel()); }
    $('experience').dataset.phase = done ? 'complete' : 'playing';
    buttons.forEach((button, i) => {
      const lit = Boolean(board & (1 << i));
      button.dataset.lit = String(lit);
      button.setAttribute('aria-label', `${P.positions[i].row + 1}행 ${P.positions[i].col + 1}열 버튼, 전구 ${lit ? '켜짐' : '꺼짐'}`);
      button.querySelector('.lamp').src = art[`bulb-${lit ? 'on' : 'off'}`];
      button.disabled = done;
    });
    switchMemory.render();
    $('status').textContent = done ? '' : `${P.TOTAL - P.litCount(board)}개의 불이 남았습니다.`;
    if (done && !demoReported) { demoReported = true; parent.postMessage({ channel: 'speedrun-midterm-v1', type: 'complete' }, '*'); }
  }
  function activate(index, fromGuide = false) {
    if (board === P.GOAL || switchInterference.locked) return;
    const before = board;
    board = P.toggle(board, index); render();
    if (!fromGuide && board !== P.GOAL) switchInterference.consider(before, board);
  }
  window.addEventListener('blur', () => cancelInputs.forEach(cancel => cancel()));
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelInputs.forEach(cancel => cancel()); });
  const switchCursor = StageGuide.cursor(), guideMoves = [0, 12];
  let guidePressed = null;
  function pressGuide(index) {
    if (guidePressed !== null) {
      const b = buttons[guidePressed]; b.dataset.pressed = 'false'; b.querySelector('.rocker').src = art['switch-idle'];
    }
    guidePressed = index;
    if (index !== null) { const b = buttons[index]; b.dataset.pressed = 'true'; b.querySelector('.rocker').src = art['switch-pressed']; }
  }
  function switchPoint(time, reduced) {
    const rect = index => { const r = buttons[index].querySelector('.rocker').getBoundingClientRect(); return { x: r.left + r.width * .44, y: r.top + r.height * .42 }; };
    const a = rect(guideMoves[0]), b = rect(guideMoves[1]);
    const move = reduced ? Number(time >= 4200) : GuideRules.ease((time - 3600) / 1500);
    const arrive = reduced ? 1 : GuideRules.ease((time - 400) / 1200);
    return { x: (innerWidth * .5) * (1-arrive) + (a.x + (b.x-a.x)*move)*arrive,
      y: (innerHeight * .56) * (1-arrive) + (a.y + (b.y-a.y)*move)*arrive,
      pressed: (time >= 2000 && time < 3100) || (time >= 5200 && time < 6300) };
  }
  StageGuide.create({
    duration: 7600,
    step(time, before) {
      for (const [stamp, action, index] of [[2000,'press',0],[3100,'release',0],[5200,'press',12],[6300,'release',12]]) {
        if (before >= stamp || time < stamp) continue;
        if (action === 'press') pressGuide(index);
        else { pressGuide(null); activate(index, true); }
      }
      document.body.dataset.guideAction = time >= 3100 ? 'switching' : 'approaching';
    },
    render(time, reduced, alpha) { switchCursor.show(time, t => switchPoint(t, reduced), alpha); },
    hide() { switchCursor.hide(); },
    stop() { pressGuide(null); }
  });

  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== 'speedrun-midterm-v1') return;
    if (event.data.type === 'pause') cancelInputs.forEach(cancel => cancel());
    if (event.data.type === 'focus') buttons[0].focus({ preventScroll: true });
  });
  render();
})();

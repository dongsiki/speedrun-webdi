/* 전구 퍼즐 2페·3페(개발자용 02, 2026-10-29, Claude Code). 본편 01에는 들어가지 않는다.
   10/29 사용자: 「전구 2. 전구가 존나 많아진다던가, 아니면 암전마다 계속 전구의 양이 랜덤하게 변경된다던가 하는 식으로.
   3. 전구가, 조금 크게. 전구 안에 이미지가 잘 보일만큼만 크게 하고, 전구를 일열로 해서 스토리 전개 및 텔링이 보다 더 깔끔하게 되고 또 보여지게끔하기.」
   window.SwitchDevPhase가 2나 3일 때만 game.js 대신 이 판을 띄운다(개발자용 단독 프레임이 문서 앞에 심어 줌).
   퍼즐 규칙은 1페와 같다: 스위치를 누르면 같은 줄 거울 자리 전구와 그 양옆이 뒤집힌다. 줄마다 따로 풀리므로 줄별로 정답 거리를 계산한다. */
(function (root) {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  const unit = random => Math.max(0, Math.min(.999999999, random()));
  const pick = (list, random = Math.random) => list[Math.floor(unit(random) * list.length)];

  // --- 한 줄 퍼즐: 길이 L의 모든 상태에 대해 '다 켜짐'까지 최소 수 ---
  const rowCache = new Map();
  function rowPuzzle(length) {
    if (rowCache.has(length)) return rowCache.get(length);
    const goal = (1 << length) - 1;
    const masks = Array.from({ length }, (_, col) => {
      const center = length - 1 - col; let mask = 0;
      for (let c = center - 1; c <= center + 1; c++) if (c >= 0 && c < length) mask |= 1 << c;
      return mask;
    });
    const distance = new Int8Array(goal + 1).fill(-1);
    const byDistance = [];
    distance[goal] = 0; const queue = [goal];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const state = queue[cursor];
      (byDistance[distance[state]] ||= []).push(state);
      for (const mask of masks) {
        const next = state ^ mask;
        if (distance[next] === -1) { distance[next] = distance[state] + 1; queue.push(next); }
      }
    }
    const result = { length, goal, masks, distance, byDistance };
    rowCache.set(length, result); return result;
  }
  const bits = n => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };

  // rows 길이들로, 정답까지 정확히 target수이고 켜진 비율이 알맞은 판을 고른다.
  function deal(rows, target, random = Math.random, avoid = null) {
    const puzzles = rows.map(rowPuzzle), total = rows.reduce((a, b) => a + b, 0);
    const caps = puzzles.map(p => p.byDistance.length - 1);
    // 개수가 적으면 낼 수 있는 최대 수가 줄어든다(예: 9개는 7수). 그 안에서 맞추고, 0수(다 켜진 판)는 만들지 않는다.
    target = Math.max(1, Math.min(target, caps.reduce((a, b) => a + b, 0)));
    let best = null;
    for (let attempt = 0; attempt < 4000; attempt++) {
      // 줄마다 거리를 나눠 갖는다(각 줄이 낼 수 있는 최대 거리 안에서).
      const share = rows.map(() => 0); let left = target, guard = 0;
      while (left > 0 && guard++ < 200) {
        const i = Math.floor(unit(random) * rows.length);
        if (share[i] < caps[i]) { share[i]++; left--; }
      }
      if (left > 0) continue;
      const state = share.map((d, i) => pick(puzzles[i].byDistance[d], random));
      const lit = state.reduce((a, s) => a + bits(s), 0), ratio = lit / total;
      if (avoid && state.every((s, i) => s === avoid[i])) continue;
      if (ratio >= .35 && ratio <= .7) return state;
      if (!best || Math.abs(ratio - .5) < Math.abs(best.ratio - .5)) best = { state, ratio };
    }
    return best ? best.state : rows.map(l => rowPuzzle(l).goal);
  }
  const remaining = (rows, state) => state.reduce((sum, s, i) => sum + rowPuzzle(rows[i]).distance[s], 0);
  const press = (rows, state, row, col) => state.map((s, i) => i === row ? s ^ rowPuzzle(rows[i]).masks[col] : s);
  const solved = (rows, state) => state.every((s, i) => s === rowPuzzle(rows[i]).goal);
  // 2페 개수: 11~21개를 두 줄로(윗줄 = 절반 올림). 직전과 다른 개수. 9·10개는 최대 수가 너무 작아 뺌(10/29 Codex 합의).
  function splitCount(count) { return [Math.ceil(count / 2), Math.floor(count / 2)]; }
  function nextCount(current, random = Math.random) {
    let n = current;
    while (n === current) n = 11 + Math.floor(unit(random) * 11);
    return n;
  }
  const rules = { rowPuzzle, deal, remaining, press, solved, splitCount, nextCount };
  // 2페: 1페와 같은 '전구 속 사람' 그림·목소리. 3페: 전구 안 이야기 그림 7장(왼쪽부터 차례로).
  const MemoryAssets = /* @json assets/data/switches-game-switch-memory-assets-05652ef819.json */ null;
  const Phase3Story = /* @json assets/data/switches-phase3-story.json */ null;

  // --- 화면 ---
  function run(phase) {
    const $ = id => document.getElementById(id), art = SwitchArt, P = root.SwitchPuzzle;
    const main = $('experience'), grid = $('switches');
    main.dataset.devPhase = String(phase);
    grid.replaceChildren();
    const story = phase === 3 ? (Phase3Story || []) : [];
    let rows, state, buttons = [], done = false, locked = false, reported = false;

    if (phase === 3) {
      rows = [7];
      state = deal(rows, 4 + Math.floor(Math.random() * 3)); // 시작 4~6수
    } else {
      rows = [8, 7];
      // 1페 첫 판(8수)과 같은 판에서 시작한다.
      state = [P.INITIAL & 0xff, P.INITIAL >> 8];
    }

    // 2페: 1페의 '전구 속 사람 → 빈 의자' 그대로(윗줄 맨 끝 전구). 첫 암전에서 바뀌고 목소리 한 번.
    const memory = (() => {
      if (phase !== 2) return { lamp: () => null, change() {}, stop() {} };
      const assets = MemoryAssets; if (!assets) return { lamp: () => null, change() {}, stop() {} };
      const voice = document.createElement('audio'); voice.hidden = true; voice.preload = 'auto'; voice.src = assets.voice; voice.volume = .82;
      document.body.append(voice);
      let absent = false;
      return {
        lamp(row, col, lit) { return row === 0 && col === rows[0] - 1 && lit ? assets[absent ? 'empty' : 'occupied'] : null; },
        change() {
          if (absent) return; absent = true;
          if (document.hidden) return;
          try { const p = voice.play(); if (p?.catch) p.catch(() => {}); } catch (_) {}
        },
        stop() { voice.pause(); }
      };
    })();

    function bulbSVG(index) {
      // 3페 큰 전구: 유리를 칸 거의 가득 키우고 그 안에 이야기 그림. 꺼지면 까만 유리.
      // 그림은 굵은 선으로 그려 두었으므로 따로 굵히지 않는다(필터 정의만 남김).
      const id = `g${index}`, glass = 'M46 112C46 92 10 84 10 56C10 26 36 4 70 4S130 26 130 56C130 84 94 92 94 112Z';
      const src = story[index] || '';
      return `<svg class="big-bulb" viewBox="0 0 140 140" aria-hidden="true"><defs><clipPath id="${id}"><path d="${glass}"/></clipPath>`
        + `<filter id="${id}t" x="0" y="0" width="1" height="1"><feMorphology operator="erode" radius=".9"/></filter></defs>`
        + `<path class="glass" d="${glass}" fill="#000"/>`
        + (src ? `<image class="story" href="${src}" x="10" y="0" width="120" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : '')
        + `<path d="${glass}" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round"/>`
        + `<path d="M46 112h48l-2 18H48Z" fill="#000" stroke="#000" stroke-width="2.4" stroke-linejoin="round"/><path d="M49 119h42M50 125h40" stroke="#fff" stroke-width="1.4"/><path d="M62 136h16" stroke="#000" stroke-width="3" stroke-linecap="round"/></svg>`;
    }

    function layout() {
      grid.replaceChildren(); buttons = [];
      const wide = Math.max(...rows);
      grid.dataset.rows = String(rows.length);
      grid.style.setProperty('--cols', String(wide));
      rows.forEach((length, row) => {
        for (let col = 0; col < length; col++) {
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'switch';
          const x = (col + .5 + (wide - length) / 2) / wide * 100;
          const y = rows.length === 1 ? 50 : (row ? 75 : 25);
          button.style.left = `${x}%`; button.style.top = `${y}%`;
          button.innerHTML = (phase === 3 ? bulbSVG(col) : '<img class="lamp" alt="" draggable="false" width="72" height="64">')
            + '<img class="rocker" alt="" draggable="false" width="72" height="58">';
          wire(button, row, col);
          grid.append(button); buttons.push({ button, row, col });
        }
      });
      render();
    }

    function wire(button, row, col) {
      const face = button.querySelector('.rocker');
      let pointerId = null, heldKey = null;
      const show = pressed => { button.dataset.pressed = String(pressed); face.src = art[pressed ? 'switch-pressed' : 'switch-idle']; };
      const inside = e => { const r = button.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
      const cancel = () => { const c = pointerId; pointerId = null; heldKey = null; show(false); if (c !== null && button.hasPointerCapture(c)) button.releasePointerCapture(c); };
      button._cancel = cancel;
      button.addEventListener('pointerdown', e => {
        if (locked || done || e.button !== 0 || e.isPrimary === false || pointerId !== null || heldKey !== null) return;
        pointerId = e.pointerId; button.setPointerCapture(pointerId); show(true);
      });
      button.addEventListener('pointermove', e => { if (e.pointerId === pointerId) show(inside(e)); });
      button.addEventListener('pointerup', e => { if (e.pointerId !== pointerId) return; const ok = inside(e); cancel(); if (ok) activate(row, col); });
      for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, e => { if (e.pointerId === pointerId) cancel(); });
      button.addEventListener('click', e => { if (e.detail === 0 && pointerId === null && heldKey === null) activate(row, col); });
      button.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!locked && !done && !e.repeat && pointerId === null && heldKey === null) { heldKey = e.key; show(true); } return; }
        const length = rows[row];
        const target = { ArrowLeft: [row, (col + length - 1) % length], ArrowRight: [row, (col + 1) % length], Home: [row, 0], End: [row, length - 1],
          ArrowUp: rows.length > 1 ? [0, Math.min(col, rows[0] - 1)] : null, ArrowDown: rows.length > 1 ? [1, Math.min(col, rows[1] - 1)] : null }[e.key];
        if (target) { e.preventDefault(); cancel(); buttons.find(b => b.row === target[0] && b.col === target[1])?.button.focus(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      });
      button.addEventListener('keyup', e => { if (e.key !== ' ' && e.key !== 'Enter') return; e.preventDefault(); if (heldKey === e.key) { cancel(); activate(row, col); } });
      button.addEventListener('blur', cancel);
      button.addEventListener('contextmenu', e => e.preventDefault());
      show(false);
    }
    const cancelAll = () => buttons.forEach(b => b.button._cancel?.());

    function render() {
      done = solved(rows, state);
      main.dataset.phase = done ? 'complete' : 'playing';
      main.dataset.bulbs = String(rows.reduce((a, b) => a + b, 0));
      main.dataset.remaining = String(remaining(rows, state));
      let off = 0;
      for (const { button, row, col } of buttons) {
        const lit = Boolean(state[row] & (1 << col)); if (!lit) off++;
        button.dataset.lit = String(lit); button.disabled = done;
        button.setAttribute('aria-label', `${rows.length > 1 ? `${row + 1}행 ` : ''}${col + 1}번째 버튼, 전구 ${lit ? '켜짐' : '꺼짐'}`);
        const lamp = button.querySelector('img.lamp');
        if (lamp) lamp.src = memory.lamp(row, col, lit) || art[`bulb-${lit ? 'on' : 'off'}`];
      }
      $('status').textContent = done ? '' : `${off}개의 불이 남았습니다.`;
      if (done) { blackout.finish(); cancelAll(); }
      if (done && !reported) {
        reported = true;
        // 3페는 다 켜진 한 줄(이야기 전체)을 잠깐 보여 준 뒤 끝낸다.
        setTimeout(() => parent.postMessage({ channel, type: 'complete' }, '*'), phase === 3 ? 3500 : 0);
      }
    }
    function activate(row, col) {
      if (done || locked) return;
      state = press(rows, state, row, col); render();
    }

    // --- 2페 암전: 올 때마다 전구 개수가 바뀌고 판을 새로 짠다(남은 수는 그대로라 진행이 되돌아가지 않음) ---
    const blackout = (() => {
      const timers = new Set();
      let active = phase === 2, changes = 0;
      const cover = document.createElement('div');
      cover.className = 'switch-blackout'; cover.dataset.on = 'false'; cover.setAttribute('aria-hidden', 'true');
      document.body.append(cover);
      const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (active) fn(); }, ms); timers.add(id); };
      function reshuffle() {
        const left = Math.max(1, remaining(rows, state));
        rows = splitCount(nextCount(rows[0] + rows[1]));
        state = deal(rows, Math.min(left, 9));
        changes++; main.dataset.reshuffles = String(changes);
        memory.change(); layout();
      }
      function flash() {
        if (document.hidden || done) return schedule();
        const double = Math.random() < .38, dur = 130 + Math.floor(Math.random() * 90), gap = 540 + Math.floor(Math.random() * 300);
        locked = true; cancelAll(); cover.dataset.on = 'true';
        later(reshuffle, Math.min(80, dur - 20)); // 화면이 다 가려진 동안에만 바꾼다
        later(() => { cover.dataset.on = 'false'; if (!double) { locked = false; schedule(); } }, dur);
        if (double) {
          later(() => { cover.dataset.on = 'true'; }, gap);
          later(() => { cover.dataset.on = 'false'; locked = false; schedule(); }, gap + dur);
        }
      }
      function schedule() { if (active && !done) later(flash, 6000 + Math.floor(Math.random() * 6000)); } // 6~12초(10/29 Codex 합의)
      function finish() { active = false; for (const id of timers) clearTimeout(id); timers.clear(); cover.dataset.on = 'false'; locked = false; memory.stop(); }
      return { start: schedule, finish };
    })();

    window.addEventListener('message', event => {
      if (event.source !== parent || event.data?.channel !== channel) return;
      if (event.data.type === 'pause') { blackout.finish(); cancelAll(); }
      if (event.data.type === 'focus') buttons[0]?.button.focus({ preventScroll: true });
      // 'guide'·'interference-state'는 1페용이라 여기서는 쓰지 않는다.
    });
    window.addEventListener('blur', cancelAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAll(); });
    $('switches').setAttribute('aria-label', phase === 3 ? '한 줄로 놓인 일곱 개의 스위치' : '두 줄로 놓인 스위치');
    layout();
    blackout.start();
    return { get state() { return state; }, get rows() { return rows; } };
  }

  const api = { rules, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SwitchPhases = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

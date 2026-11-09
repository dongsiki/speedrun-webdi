

(() => {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  function cursor() {
    const root = document.createElement('div'); root.className = 'guide-cursor'; root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    const shapes = [2, 1, 0].map(n => {
      const node = document.createElement('span');
      node.className = `guide-pointer${n ? ' echo' : ''}${n === 2 ? ' far' : ''}`;
      node.innerHTML = '<svg viewBox="-9 -9 39 52" xmlns="http://www.w3.org/2000/svg"><circle class="press-ring" cx="1" cy="1" r="8" fill="none" stroke="#000" stroke-width="1.2"/><path d="M1 1 L1 29 L8 22 L15 36 L21 33 L14 20 L25 20 Z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>';
      root.append(node); return { node, lag: n * 135 };
    });
    document.body.append(root);
    return {
      show(time, pointAt, opacity = 1) {
        root.hidden = false; root.style.opacity = String(opacity);
        for (const { node, lag } of shapes) {
          const p = pointAt(Math.max(0, time - lag));
          node.style.transform = `translate(${p.x - 8}px,${p.y - 8}px) scale(${p.pressed ? .87 : 1})`;
          node.className = `guide-pointer${lag ? ' echo' : ''}${lag === 270 ? ' far' : ''}${p.pressed ? ' pressed' : ''}`;
        }
      },
      hide() { root.hidden = true; }
    };
  }
  function create(config) {
    const reduced = matchMedia('(prefers-reduced-motion:reduce-off)').matches;
    let phase = 'waiting', time = 0, previous = null, raf = 0, fading = 0, stopped = false;
    const setPhase = value => { phase = value; document.body.dataset.guide = value; };
    const render = alpha => config.render?.(time, reduced, alpha);
    setPhase('waiting');
    function finish() { setPhase('done'); config.hide?.(); cancelAnimationFrame(raf); raf = 0; }
    function stop() {
      if (phase === 'done' || phase === 'fading') return;
      if (!stopped) { config.stop?.(); stopped = true; }
      if (phase === 'waiting' || reduced) { finish(); return; }
      setPhase('fading'); fading = 0;
    }
    function tick(now) {
      raf = 0;
      if (phase === 'done' || phase === 'waiting') return;
      const dt = previous === null || document.hidden ? 0 : Math.min(80, Math.max(0, now - previous)); previous = now;
      if (phase === 'playing') {
        const before = time; time = Math.min(config.duration, time + dt);
        config.step?.(time, before, reduced); render(1);
        if (time >= config.duration) stop();
      } else {
        fading += dt; render(Math.max(0, 1 - fading / 260));
        if (fading >= 260) finish();
      }
      if (phase !== 'done') raf = requestAnimationFrame(tick);
    }
    function start() {
      if (phase !== 'waiting') return;
      setPhase('playing'); config.start?.(reduced); render(1); raf = requestAnimationFrame(tick);
    }
    // Capture cancels only the demonstration; normal input still reaches the game.
    addEventListener('pointerdown', event => { if (event.button === 0) stop(); }, true);
    addEventListener('keydown', event => { if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) stop(); }, true);
    addEventListener('message', event => {
      if (event.source !== parent || event.data?.channel !== channel) return;
      if (event.data.type === 'guide') start();
      if (event.data.type === 'pause') { stop(); finish(); }
    });
    document.addEventListener('visibilitychange', () => { previous = null; });
    return { stop };
  }
  window.StageGuide = { create, cursor };
})();

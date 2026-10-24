(() => {
  'use strict';
  const $ = id => document.getElementById(id), frames = ['digging', ...DemoFlow.minigames];
  const channel = 'speedrun-midterm-v1';
  const guides = GuideRules.createGate();
  let state = DemoFlow.initial(), busy = false;
  let switchInterferenceUsed = false;
  let mazeCollisionLineSeen = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const motion = matchMedia('(prefers-reduced-motion:reduce-off)');
  const rewind = FailureRewind.create($('failure-rewind'), motion);
  const autoClearsPerSecond = 12;
  let automatic = true, autoBase = window.RebellionAutoBase || 1, autoStartedAt = performance.now(), autoTimer = null;
  function renderAutoCount() {
    if (!automatic) return;
    const count = autoBase + Math.floor((performance.now() - autoStartedAt) * autoClearsPerSecond / 1000);
    $('clear-count').textContent = String(count).padStart(3, '0');
  }
  function pauseAutoTimer() { clearInterval(autoTimer); autoTimer = null; }
  function syncAutoTimer() {
    pauseAutoTimer();
    if (!automatic || document.hidden) return;
    renderAutoCount();
    // The elapsed-time count stays accurate while reduced motion updates less often.
    autoTimer = setInterval(renderAutoCount, motion.matches ? 250 : 80);
  }
  function stopAutomatic() {
    renderAutoCount();
    autoBase = Number($('clear-count').textContent);
    automatic = false; pauseAutoTimer();
  }
  function resumeAutomatic() { autoStartedAt = performance.now(); automatic = true; syncAutoTimer(); }
  document.addEventListener('visibilitychange', syncAutoTimer);
  motion.addEventListener('change', syncAutoTimer);
  window.addEventListener('pagehide', pauseAutoTimer);
  window.addEventListener('pageshow', syncAutoTimer);
  /* @inline src/common/stage-transition.js */
  $('ai-switch').addEventListener('click', async () => {
    if (!automatic || busy || state.stage !== 'intro') return;
    rewind.armAudio();
    stopAutomatic();
    $('ai-switch').disabled = true;
    $('ai-switch').setAttribute('aria-checked', 'false');
    $('ai-switch').setAttribute('aria-label', 'AI 자동 클리어 OFF. 직접 플레이 시작');
    $('ai-state').textContent = 'OFF';
    await sleep(200);
    go(DemoFlow.act(state, { type: 'manual' }));
  });
  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || data.channel !== channel) return;
    const source = frames.find(name => $(name).contentWindow === event.source);
    if (source !== state.stage) return;
    if (source === 'switches' && data.type === 'switch-interference-used') switchInterferenceUsed = true;
    if (source === 'maze' && data.type === 'maze-collision-line-seen') mazeCollisionLineSeen = true;
    if (busy) return;
    if (source === 'digging' && data.type === 'found') state = DemoFlow.act(state, data);
    if (source === 'digging' && data.type === 'dismiss') state = DemoFlow.act(state, data);
    if (source === 'digging' && data.type === 'enter') go(DemoFlow.act(state, data));
    if (['back', 'complete', 'fail'].includes(data.type) && DemoFlow.minigames.includes(source)) {
      go(DemoFlow.act(state, { type: data.type, stage: source }), { object: state.activeObject, outcome: data.type === 'back' ? 'abandon' : data.type });
    }
  });
  syncAutoTimer();
})();

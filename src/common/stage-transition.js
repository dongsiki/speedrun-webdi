function duration() { return matchMedia('(prefers-reduced-motion:reduce-off)').matches ? 110 : 440; }
  function send(frame, type, detail = {}) { $(frame).contentWindow?.postMessage({ channel, type, ...detail }, '*'); }
  function load(frame) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('화면을 열지 못했습니다. 새로고침해 주세요.')), 8000);
      $(frame).addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
      $(frame).srcdoc = DemoDocuments[frame];
    });
  }
  async function go(next, returning = null) {
    if (busy || next === state) return;
    busy = true;
    const cover = $('whiteout'), previous = state.stage;
    const failed = returning?.outcome === 'fail';
    document.body.dataset.transition = failed ? 'failure' : 'white';
    cover.classList.add('busy');
    if (frames.includes(previous)) send(previous, 'pause');
    if (failed) await rewind.cover($(previous));
    else { rewind.watch(null); cover.classList.add('covered'); await sleep(duration()); }
    try {
      // Dispose hidden minigames, including their WebGL contexts, timers and audio.
      // Keep the digging iframe alive so every untouched object and dug cell survives.
      if (DemoFlow.minigames.includes(previous)) $(previous).removeAttribute('srcdoc');
      for (const name of frames) $(name).hidden = name !== next.stage;
      $('intro').hidden = next.stage !== 'intro';
      if (next.stage === 'digging' && returning) send('digging', 'resume', returning);
      else await load(next.stage);
      state = next;
      document.body.dataset.stage = state.stage;
      document.body.dataset.completed = state.completed.join(',');
      $('announcer').textContent = { digging: '땅파기 로비', switches: '전구 퍼즐', maze: '미로. W A S D로 이동하고 마우스로 둘러봅니다.', routine: '기억 속 하루', limb: '마지막 걸음. A와 D로 발을 번갈아 딛고, 스페이스로 숨을 쉬고, E로 눈을 깜빡입니다.', needle: '실 꿰기. 마우스나 방향키로 실 끝을 옮기고, 누르고 있거나 스페이스를 누르고 있으면 숨을 참습니다.', suitcase: '짐 싸기. 물건을 누르거나 끌어 가방에 넣고 빼고, 잠금쇠로 닫습니다. 가방이 작아 다 넣을 수 없습니다.', mri: 'MRI 검사. 검사가 시작되면 움직이지 않고 기다립니다.' }[state.stage];
      $(state.stage).contentWindow.focus();
      send(state.stage, 'focus');
      if (state.stage === 'switches') send('switches', 'interference-state', { used: switchInterferenceUsed });
      if (state.stage === 'maze') send('maze', 'maze-state', { collisionLineSeen: mazeCollisionLineSeen });
      await sleep(60);
    } catch (error) {
      $('announcer').textContent = error.message;
      for (const name of frames) $(name).hidden = true;
      $('intro').hidden = false;
      state = DemoFlow.initial();
      document.body.dataset.stage = 'intro';
      document.body.dataset.completed = '';
      $('ai-switch').disabled = false;
      $('ai-switch').setAttribute('aria-checked', 'true');
      $('ai-switch').setAttribute('aria-label', 'AI 자동 클리어 ON. 끄고 직접 플레이 시작');
      $('ai-state').textContent = 'ON';
      resumeAutomatic();
      $('ai-switch').focus({ preventScroll: true });
    }
    if (failed) await rewind.reveal();
    else { cover.classList.remove('covered'); await sleep(duration()); }
    cover.classList.remove('busy'); busy = false;
    document.body.dataset.transition = 'idle';
    rewind.watch(DemoFlow.minigames.includes(state.stage) ? $(state.stage) : null);
    if (guides.take(state.stage)) send(state.stage, 'guide');
  }
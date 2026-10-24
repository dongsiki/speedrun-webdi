// Parent lifecycle for the two formerly standalone minigames.
(() => {
  'use strict';
  const channel = 'speedrun-midterm-v1';
  let paused = false, leaving = false, hooks = {};
  function pause() { paused = true; hooks.pause?.(); }
  function resume() {
    if (leaving) return;
    paused = false; hooks.resume?.(); hooks.focus?.();
  }
  function leave(type) {
    if (leaving || !['back', 'complete'].includes(type)) return;
    leaving = true; pause(); hooks.stop?.();
    parent.postMessage({ channel, type }, '*');
  }
  window.ConnectedStage = Object.freeze({
    get paused() { return paused; },
    configure(next) { hooks = next; if (paused) hooks.pause?.(); },
    leave
  });
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.channel !== channel) return;
    if (event.data.type === 'pause') pause();
    if (event.data.type === 'focus') resume();
  });
  window.addEventListener('pagehide', () => { leaving = true; pause(); hooks.stop?.(); });
})();

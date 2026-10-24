

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MazeGuide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const start = 800, contact = 5400, finish = 7700, duration = 8100;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  function create(E) {
    const actor = { ...E.initial(), x: 1.10, z: 4.2, yaw: 0 }, trail = E.createTrail();
    const hit = E.cast(actor, 0), bodyHeight=E.dimensions.guideHeight;
    const wall = { x: actor.x + hit.distance, z: actor.z, face: hit.face, width: bodyHeight * 414 / 640, top: bodyHeight, bottom: 0 };
    const approachX = wall.x - E.radius - .02;
    const state = { actor, trail, wall, progress: 0, time: 0, phase: 'appearing' };
    function advance(time, reduced = false) {
      state.time = time;
      const target = 1.10 + (approachX - 1.10) * clamp((time - start) / (contact - start));
      // Only the approach makes footprints. The wall crossing is a visual pose,
      // not a change to the player's collision rules or a trail inside the wall.
      while (actor.x < target - 1e-6) {
        const before = actor.x;
        E.move(actor, 1, 0, Math.min(.1, (target - actor.x) / E.speed), trail);
        if (actor.x <= before) break;
      }
      const crossingEnd = reduced ? contact + 360 : finish;
      state.progress = smooth((time - contact) / (crossingEnd - contact));
      if (time >= contact) actor.x = approachX + (wall.x + .12 - approachX) * state.progress;
      state.phase = time < start ? 'appearing' : time < contact ? 'walking' : state.progress < 1 ? 'crossing' : 'imprint';
      return state;
    }
    return { state, advance };
  }
  return { create, contact, finish, duration };
});
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GuideRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  function createGate() {
    const seen = new Set();
    return { take(stage) { if (!['digging', 'switches', 'maze'].includes(stage) || seen.has(stage)) return false; seen.add(stage); return true; } };
  }
  function diggingPoint(time, reduced = false) {
    const arrival = reduced ? 1 : ease((time - 500) / 1800);
    const drag = clamp((time - 4100) / 2300);
    return { u: .5 + (.065 - .5) * arrival + drag * .12,
      v: .5 + (.87 - .5) * arrival + Math.sin(drag * Math.PI) * .035,
      pressed: (time >= 2800 && time < 3100) || (time >= 3500 && time < 3800) || (time >= 4100 && time < 6400) };
  }
  return { createGate, diggingPoint, clamp, ease };
});
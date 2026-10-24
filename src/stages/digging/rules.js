
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LobbyRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  function returnFromGame(items, object, outcome, random, groundDepth) {
    const item = items.find(entry => entry.type === object);
    if (!item || !item.discovered || item.collected) return null;
    if (outcome === 'complete') {
      item.collected = true; item.discovered = false;
      return item;
    }
    // Dismissing a discovery is deliberately not a game-return outcome.
    if (!['abandon', 'fail'].includes(outcome)) return null;
    const candidates = Array.from({ length: 48 }, () => ({ u: .12 + random() * .76, v: .12 + random() * .76 }));
    candidates.push({ u: .12, v: .12 }, { u: .88, v: .12 }, { u: .12, v: .88 }, { u: .88, v: .88 });
    const clearance = point => Math.min(...items.map(other => Math.hypot(point.u - other.u, point.v - other.v)));
    const position = candidates.find(point => clearance(point) > .2) || candidates.reduce((best, point) => clearance(point) > clearance(best) ? point : best);
    item.u = position.u; item.v = position.v;
    // Bury below existing excavation rather than resetting any ground or other object.
    item.burial = Math.max(10, groundDepth(item.u, item.v) + 9 + random() * 2);
    item.discovered = false; item.touched = false; item.coverage = 0;
    return item;
  }
  return { returnFromGame };
});
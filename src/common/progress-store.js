const sum = record => Object.values(record || {}).reduce((a, b) => a + b, 0);

  const blank = () => ({ v: 1, runs: 0, lastAuto: 0, clears: {}, fails: {}, backs: {}, found: {}, slow: 0, persist: 0, allFour: 0, again: 0, needleBare: 0, suitcaseReturn: 0, suitcaseEmpty: 0, unlocked: {}, log: [] });
  let store = blank(), saved = true;
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && raw.v === 1) store = { ...blank(), ...raw }; } catch (_) { saved = false; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); saved = true; } catch (_) { saved = false; } }
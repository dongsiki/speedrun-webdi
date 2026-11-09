  // ── 1장. 준비: 화면과 처음 상태 ──
  const channel = 'speedrun-midterm-v1';
  const $ = id => document.getElementById(id);
  const canvas = $('world'), ctx = canvas.getContext('2d', { alpha: false });
  const keysHint = $('keys'), status = $('status');
  const embedded = window.parent !== window;
  const reducedQuery = matchMedia('(prefers-reduced-motion:reduce-off)');
  const T = Object.freeze({
    shiftAt: 8, exitAt: 12, curbAt: 19, roadEnd: 26,
    stepLength: .34, stepTime: .32, settle: .26, stumbleTime: 1.1,
    oxygenDecay: .06, stepCost: .015, stumbleCost: .05, holdPenalty: .05,
    inhaleRate: .55, exhaleRate: .45, breathGain: .42,
    dryRate: .07
  });
  // 2026-10-27: 노인이 끝까지 걸으면 아이·교통사고·중환자실 장면 대신 중환자실 엔딩 컷신(ending.js)이 이어짐.
  // 2026-10-29: 2·3페(phases.js). head의 window.LastWalkPhase가 2나 3이면 켜지고, 없으면 1페 그대로.
  const PH = typeof LastWalkPhases !== 'undefined' ? LastWalkPhases.create(Number(window.LastWalkPhase) || 1, {
    T, foot: w => foot(w), tone: (...a) => tone(...a), status: text => { status.textContent = text; }
  }) : null;
  if (PH) document.body.dataset.lastWalkPhase = String(PH.phase);

  let width = 1, height = 1, scale = 1, ppm = 100;
  let raf = 0, last = 0, paused = false, ended = false, clock = 0;
  let s;
  function fresh() {
    return {
      phase: 'elder', phaseTime: 0, x: 0,
      lastFoot: null, stepping: 0, stepFoot: null, stepFrom: 0, sinceStep: 1, stumble: 0, stumbles: 0, steps: 0,
      lung: .35, lungPeak: .35, breathing: false, holdAtFull: 0, oxygen: 1, breaths: 0,
      dryness: 0, blink: 0, blinks: 0,
      inhaledSinceLow: false, holdWarned: false, holdWarns: 0, shallow: 0, frozenPress: 0, pops: {},
      hintUsed: { feet: false, breath: false, eyes: false }
    };
  }
  s = fresh();

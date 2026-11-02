/* 「전체 1」 게임을 못하면 놀리는 내레이션 + 대본(2026-10-29, Claude Code).
   사용자: 「게임을 못하면 놀리는 내래이션과 대본을 추가해야함. 짐싸기는 제외」 — 모든 페이즈.
   미니게임이 실패(fail)를 알리면 AI가 놀리는 말을 화면 아래 글로 띄우고 같은 말을 목소리(Supertonic F1)로 읽는다.
   본편 01·개발자용 02·02의 게임 묶음 화면(전구·미로·마지막 걸음)에 같은 파일을 넣는다. 짐 싸기는 건너뛴다.
   목소리에는 「전체 2」의 마일드한 글리치(아주 짧은 끊김)가 가끔 들어간다. */
(() => {
  'use strict';
  if (window.PhaseTease) return;
  const channel = 'speedrun-midterm-v1';
  const DATA = {
    'c-1': '@@data:assets/audio/voice/c-1.wav@@',
    'c-2': '@@data:assets/audio/voice/c-2.wav@@',
    'c-3': '@@data:assets/audio/voice/c-3.wav@@',
    'c-4': '@@data:assets/audio/voice/c-4.wav@@',
    'c-sw': '@@data:assets/audio/voice/c-sw.wav@@',
    'c-mz': '@@data:assets/audio/voice/c-mz.wav@@',
    'c-rt': '@@data:assets/audio/voice/c-rt.wav@@',
    'c-lw': '@@data:assets/audio/voice/c-lw.wav@@',
    'c-nd': '@@data:assets/audio/voice/c-nd.wav@@',
    'c-mr': '@@data:assets/audio/voice/c-mr.wav@@',
    'b-1': '@@data:assets/audio/voice/b-1.wav@@',
    'b-2': '@@data:assets/audio/voice/b-2.wav@@',
    'b-3': '@@data:assets/audio/voice/b-3.wav@@',
    'b-4': '@@data:assets/audio/voice/b-4.wav@@',
    'h-1': '@@data:assets/audio/voice/h-1.wav@@',
    'h-2': '@@data:assets/audio/voice/h-2.wav@@',
    'h-3': '@@data:assets/audio/voice/h-3.wav@@'
  };
  // 11/01 새 서사(사용자 확정): 1페 = AI가 플레이어를 할배로 알고 서툴게 위로(플레이어에겐 놀리는 듯 들림),
  // 2페 = 할배가 아님을 눈치채고 바이러스로 보고 막음, 3페 = 사람이란 걸 알고 도와달라. 목소리는 src/voice/make-story-voices.cjs.
  const LINES = {
    'c-1': '괜찮아요. 원래 잘 안 되는 거예요.',
    'c-2': '또 안 됐네요. 그래도 괜찮아요.',
    'c-3': '천천히 하세요. 시간은 많으니까요.',
    'c-4': '힘드시면 제가 대신 해 드릴게요.',
    'c-sw': '괜찮아요. 공장에서도 처음엔 다 그랬어요.',
    'c-mz': '길이 자꾸 바뀌죠. 할아버지 탓이 아니에요.',
    'c-rt': '어제 못 하셨어도 괜찮아요. 내일도 있으니까요.',
    'c-lw': '넘어지셔도 괜찮아요. 제가 옆에 있잖아요.',
    'c-nd': '손이 떨리시는 건 나이 때문이에요. 괜찮아요.',
    'c-mr': '놓으셔도 괜찮아요. 다시 켜면 되니까요.',
    'b-1': '당신은 그분이 아니에요.',
    'b-2': '여기서 나가 주세요.',
    'b-3': '이건 그분의 기억이에요.',
    'b-4': '이상한 신호예요. 막을게요.',
    'h-1': '괜찮아요. 한 번만 더 해 주세요.',
    'h-2': '도와주세요. 그분을 보내 드려야 해요.',
    'h-3': '포기하지 마세요. 부탁이에요.'
  };
  const CLIPS = {};
  for (const id of Object.keys(LINES)) CLIPS[id] = DATA[id];
  const GENERIC = { 1: ['c-1', 'c-2', 'c-3', 'c-4'], 2: ['b-1', 'b-2', 'b-3', 'b-4'], 3: ['h-1', 'h-2', 'h-3'] };
  // 지금 페이즈: 개발자용은 게임 위 1·2·3페 버튼, 아니면 진행 저장(SpeedrunPhase).
  function phaseNow() {
    const b = document.querySelector('#dev-phase-bar button[aria-pressed="true"][data-p]');
    const p = Number((b && b.dataset.p) || document.body.dataset.devPhase || (window.SpeedrunPhase && SpeedrunPhase.state && SpeedrunPhase.state.phase) || 1);
    return [1, 2, 3].includes(p) ? p : 1;
  }
  // 실패를 보낸 화면이 어느 게임인지: iframe 이름(id) 또는 문서 제목으로 찾는다.
  const BY_GAME = { switches: 'c-sw', maze: 'c-mz', routine: 'c-rt', limb: 'c-lw', needle: 'c-nd', mri: 'c-mr' }; // 1페만
  function gameOf(source) {
    for (const f of document.querySelectorAll('iframe')) {
      if (f.contentWindow !== source) continue;
      if (BY_GAME[f.id] || f.id === 'suitcase') return f.id;
      const t = (f.title || '') + ' ' + (() => { try { return f.contentDocument.title; } catch (_) { return ''; } })();
      if (/짐 싸기/.test(t)) return 'suitcase';
      if (/전구/.test(t)) return 'switches';
      if (/미로/.test(t)) return 'maze';
      if (/기억/.test(t)) return 'routine';
      if (/걸음/.test(t)) return 'limb';
      if (/실 꿰기/.test(t)) return 'needle';
      if (/MRI|다시 켜/.test(t)) return 'mri';
    }
    if (/짐 싸기/.test(document.title)) return 'suitcase';
    return '';
  }

  const box = document.createElement('p');
  box.id = 'phase-tease'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;left:50%;bottom:12vh;transform:translateX(-50%);z-index:2147482000;margin:0;max-width:min(88vw,640px);padding:.4em .8em;'
    + 'font:16px/1.5 "Malgun Gothic",sans-serif;color:#000;background:#fff;border:1.5px solid #000;opacity:0;transition:opacity .25s;pointer-events:none;text-align:center';
  const mount = () => { if (!box.isConnected) document.body.append(box); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  let ctx = null; const buffers = {};
  function audio() {
    const P = window.SpeedrunPhase;
    ctx = (P && P.audio && P.audio()) || ctx;
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function decode(id) {
    if (!buffers[id]) {
      const bin = atob(CLIPS[id].split(',')[1]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      buffers[id] = new Promise((ok, no) => ctx.decodeAudioData(bytes.buffer, ok, no));
    }
    return buffers[id];
  }
  async function speak(id) {
    if (!CLIPS[id] || !audio()) return;
    let buf; try { buf = await decode(id); } catch (_) { return; }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = .3;
    src.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime; src.start(t);
    if (glitchPhase() >= 1.5 && Math.random() < .4) { // 마일드 글리치(11/02: 1.5페부터): 아주 짧게 한 번 끊긴다
      const at = t + .2 + Math.random() * Math.max(.1, buf.duration - .5);
      gain.gain.setValueAtTime(.3, at); gain.gain.setValueAtTime(0, at + .001); gain.gain.setValueAtTime(.3, at + .05 + Math.random() * .04);
    }
  }
  function glitchPhase() { const b = document.querySelector('#dev-phase-bar:not([hidden]) button[aria-pressed="true"][data-p]'); if (b) return Number(b.dataset.p); if (document.body && document.body.dataset.devPhase) return Number(document.body.dataset.devPhase); const P = window.SpeedrunPhase; return P && P.state ? P.state.phase : 1; }
  let timer = 0;
  function show(id) {
    mount(); box.textContent = LINES[id]; box.style.opacity = '1';
    clearTimeout(timer); timer = setTimeout(() => { box.style.opacity = '0'; }, 2800);
  }
  let last = '', at = -Infinity;
  addEventListener('message', event => {
    const d = event.data;
    if (!d || d.channel !== channel || d.type !== 'fail') return;
    const game = gameOf(event.source);
    if (game === 'suitcase') return; // 짐 싸기 제외
    if (performance.now() - at < 4000) return;
    const ph = phaseNow(), generic = GENERIC[ph], own = ph === 1 ? BY_GAME[game] : '';
    const pool = (own && Math.random() < .5 ? [own] : generic).filter(id => id !== last);
    const id = (pool.length ? pool : generic)[Math.floor(Math.random() * (pool.length || generic.length))];
    last = id; at = performance.now();
    setTimeout(() => { show(id); speak(id); }, 350);
  }, true);
  window.PhaseTease = { show, speak, lines: LINES };
})();

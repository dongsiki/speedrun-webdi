/* 「전체 1」 게임을 못하면 놀리는 내레이션 + 대본(2026-10-29, Claude Code).
   사용자: 「게임을 못하면 놀리는 내래이션과 대본을 추가해야함. 짐싸기는 제외」 — 모든 페이즈.
   미니게임이 실패(fail)를 알리면 AI가 놀리는 말을 화면 아래 글로 띄우고 같은 말을 목소리(Supertonic F1)로 읽는다.
   본편 01·개발자용 02·02의 게임 묶음 화면(전구·미로·마지막 걸음)에 같은 파일을 넣는다. 짐 싸기는 건너뛴다.
   목소리에는 「전체 2」의 마일드한 글리치(아주 짧은 끊김)가 가끔 들어간다. */
(() => {
  'use strict';
  if (window.PhaseTease) return;
  const channel = 'speedrun-midterm-v1';
  const LINES = {
    'f-1': '거봐요, 제가 한다니까요.',
    'f-2': '또요?',
    'f-3': '천천히 하세요. 어차피 시간은 많으니까요.',
    'f-4': '그냥 저 주세요.',
    'f-sw': '불 하나 켜는 게 그렇게 어려워요?',
    'f-mz': '벽은 늘 거기 있었잖아요.',
    'f-rt': '어제도 하신 일인데요.',
    'f-lw': '제가 대신 걸어 드릴까요?',
    'f-nd': '손이 많이 떨리시네요.',
    'f-mr': '가만히 있는 것도 어려우세요?'
  };
  const CLIPS = {
    'f-1': '@@data:assets/audio/voice/f-1.wav@@',
    'f-2': '@@data:assets/audio/voice/f-2.wav@@',
    'f-3': '@@data:assets/audio/voice/f-3.wav@@',
    'f-4': '@@data:assets/audio/voice/f-4.wav@@',
    'f-sw': '@@data:assets/audio/voice/f-sw.wav@@',
    'f-mz': '@@data:assets/audio/voice/f-mz.wav@@',
    'f-rt': '@@data:assets/audio/voice/f-rt.wav@@',
    'f-lw': '@@data:assets/audio/voice/f-lw.wav@@',
    'f-nd': '@@data:assets/audio/voice/f-nd.wav@@',
    'f-mr': '@@data:assets/audio/voice/f-mr.wav@@'
  };
  const GENERIC = ['f-1', 'f-2', 'f-3', 'f-4'];
  // 실패를 보낸 화면이 어느 게임인지: iframe 이름(id) 또는 문서 제목으로 찾는다.
  const BY_GAME = { switches: 'f-sw', maze: 'f-mz', routine: 'f-rt', limb: 'f-lw', needle: 'f-nd', mri: 'f-mr' };
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
      if (/MRI/.test(t)) return 'mri';
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
    if (Math.random() < .4) { // 마일드 글리치: 아주 짧게 한 번 끊긴다
      const at = t + .2 + Math.random() * Math.max(.1, buf.duration - .5);
      gain.gain.setValueAtTime(.3, at); gain.gain.setValueAtTime(0, at + .001); gain.gain.setValueAtTime(.3, at + .05 + Math.random() * .04);
    }
  }
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
    const own = BY_GAME[game];
    const pool = (own && Math.random() < .5 ? [own] : GENERIC).filter(id => id !== last);
    const id = (pool.length ? pool : GENERIC)[Math.floor(Math.random() * (pool.length || GENERIC.length))];
    last = id; at = performance.now();
    setTimeout(() => { show(id); speak(id); }, 350);
  }, true);
  window.PhaseTease = { show, speak, lines: LINES };
})();

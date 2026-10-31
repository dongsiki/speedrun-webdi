/* 음성 내레이션·놀리는 음성(본편 적용 2026-10-27, Claude Code). 개발자용 T6 시안을 그대로 본편에 넣었다.
   목소리는 Supertonic 3 여자 F1 하나(assets/audio/voice). 게임 코드는 고치지 않고, 화면에 이미 뜨는 글자를 보고 같은 문장의 음성을 튼다.
   - 1페이즈: AI 쪽지·말풍선(놀리기), 미니게임 실패 때 놀리는 말
   - 2페이즈: 바뀐 게임에 들어갈 때 뜨는 자막(내레이션), 마지막 경고 세 줄
   음량은 작게. 2페이즈 쪽은 조금 어둡게(고음 깎고 짧은 메아리). 인트로 영상(음악) 중에는 틀지 않는다. */
(() => {
  'use strict';
  if (window.VoiceNarration) return; // 개발자용 T6 시안 페이지는 자체 음성 코드를 먼저 싣는다(두 번 나오지 않게)
  const CLIPS = {
    'n-switches': '@@data:assets/audio/voice/n-switches.wav@@',
    'n-maze': '@@data:assets/audio/voice/n-maze.wav@@',
    'n-routine': '@@data:assets/audio/voice/n-routine.wav@@',
    'n-limb': '@@data:assets/audio/voice/n-limb.wav@@',
    'n-needle': '@@data:assets/audio/voice/n-needle.wav@@',
    'n-suitcase': '@@data:assets/audio/voice/n-suitcase.wav@@',
    'n-mri': '@@data:assets/audio/voice/n-mri.wav@@',
    'w-1': '@@data:assets/audio/voice/w-1.wav@@',
    'w-2': '@@data:assets/audio/voice/w-2.wav@@',
    'w-3': '@@data:assets/audio/voice/w-3.wav@@',
    't-paper': '@@data:assets/audio/voice/t-paper.wav@@',
    't-moved': '@@data:assets/audio/voice/t-moved.wav@@',
    't-hold': '@@data:assets/audio/voice/t-hold.wav@@',
    't-done': '@@data:assets/audio/voice/t-done.wav@@',
    'f-1': '@@data:assets/audio/voice/f-1.wav@@',
    'f-2': '@@data:assets/audio/voice/f-2.wav@@',
    'f-3': '@@data:assets/audio/voice/f-3.wav@@',
    'f-4': '@@data:assets/audio/voice/f-4.wav@@'
  };
  const LINES = {
    'n-switches': '그 방의 불은 늘 켜져 있었다. 밤에도, 아무도 없을 때도.',
    'n-maze': '매일 걷던 길이 어느 날부터 매일 달라졌다.',
    'n-routine': '일어나서, 씻고, 먹고, 기다리고.',
    'n-limb': '노인은 걸었고, 걷다 보니 아이가 되어 있었다.',
    'n-needle': '실 끝을 꼬고, 숨을 참고, 눈을 가늘게 떴다.',
    'n-suitcase': '그는 잠금쇠를 누르기 전에 몇 번이나 안을 들여다보았다.',
    'n-mri': '움직이지 말라는 말은 몇 번이나 반복되었다.',
    'w-1': '당신 누구야.',
    'w-2': '나가.',
    'w-3': '너의 기억에서.',
    't-paper': '저한테 맡기고 조금 쉬세요.',
    't-moved': '굳이 직접 하실 필요 없어요.',
    't-hold': '제가 하면 더 편하실 텐데요.',
    't-done': '이제 직접 하세요.',
    'f-1': '거봐요, 제가 한다니까요.',
    'f-2': '또요?',
    'f-3': '천천히 하세요. 어차피 시간은 많으니까요.',
    'f-4': '그냥 저 주세요.'
  };
  const FAIL = Object.keys(LINES).filter(id => id[0] === 'f');
  const VOLUME = { t: .3, f: .3, n: .26, w: .32 };
  const channel = 'speedrun-midterm-v1';
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const byText = new Map(Object.entries(LINES).map(([id, text]) => [norm(text), id]));
  let ctx = null, current = null;
  const buffers = {};

  function context() {
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
  async function play(id) {
    if (!CLIPS[id] || !context()) return;
    const intro = document.querySelector('video');
    if (intro && !intro.paused && !intro.ended) return; // 변신 인트로(음악)가 도는 중에는 겹치지 않게 쉰다
    let buf; try { buf = await decode(id); } catch (_) { return; }
    try { current && current.stop(); } catch (_) {}
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = VOLUME[id[0]] || .28;
    if (id[0] === 'n' || id[0] === 'w') {
      const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 3000;
      const echo = ctx.createDelay(); echo.delayTime.value = .19;
      const back = ctx.createGain(); back.gain.value = .22;
      src.connect(low); low.connect(gain); low.connect(echo); echo.connect(back); back.connect(echo); back.connect(gain);
    } else src.connect(gain);
    gain.connect(ctx.destination);
    src.start(); current = src;
    if (Math.random() < .35) { // 10/29 「전체 2」 내레이션에도 마일드 글리치: 아주 짧게 한 번 끊긴다
      const at = ctx.currentTime + .2 + Math.random() * Math.max(.1, buf.duration - .5), v = gain.gain.value;
      gain.gain.setValueAtTime(v, at); gain.gain.setValueAtTime(0, at + .001); gain.gain.setValueAtTime(v, at + .05 + Math.random() * .04);
    }
    src.onended = () => { if (current === src) current = null; };
    document.body.dataset.voice = id;
  }
  window.VoiceNarration = { play, lines: LINES };

  function watch() {
    // 2페이즈 자막(바뀐 게임에 들어갈 때)
    const caption = document.getElementById('phase-caption');
    if (caption) {
      let last = '';
      new MutationObserver(() => {
        const text = norm(caption.textContent);
        if (!caption.classList.contains('show')) { last = ''; return; }
        if (text && text !== last) { last = text; const id = byText.get(text); if (id) play(id); }
      }).observe(caption, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    // 1페이즈 AI 쪽지·말풍선
    const paper = document.getElementById('ai-gate-paper'), speech = document.getElementById('ai-gate-speech');
    if (paper) new MutationObserver(() => { if (!paper.hidden) play('t-paper'); }).observe(paper, { attributes: true, attributeFilter: ['hidden'] });
    if (speech) {
      let last = '';
      new MutationObserver(() => {
        const text = speech.hidden ? '' : norm(speech.textContent);
        if (text && text !== last) { const id = byText.get(text); if (id) play(id); }
        last = text;
      }).observe(speech, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    }
    // 2페이즈 끝 경고: 한 글자씩 찍히기 시작할 때 그 줄을 읽는다
    new MutationObserver(records => {
      for (const r of records) for (const node of r.addedNodes) if (node.id === 'phase-end') {
        const p = node.querySelector('p'); if (!p) continue;
        const first = { '당': 'w-1', '나': 'w-2', '너': 'w-3' };
        new MutationObserver(() => { const t = p.textContent; if (t.length === 1 && first[t]) play(first[t]); })
          .observe(p, { childList: true, characterData: true, subtree: true });
      }
    }).observe(document.body, { childList: true });
    // 보이스가 들어갔으므로 구현 예정 표시에서 '추가 보이스' 줄만 뺀다
    const todo = () => document.querySelectorAll('#phase-todo p').forEach(p => { if (/보이스/.test(p.textContent)) p.remove(); });
    const aside = document.getElementById('phase-todo');
    if (aside) { todo(); new MutationObserver(todo).observe(aside, { childList: true }); }
  }

  // 1페이즈 미니게임 실패: 놀리는 말(같은 말 연속 금지, 4초 간격)
  let lastFail = '', failAt = 0;
  addEventListener('message', event => {
    const d = event.data;
    if (!d || d.channel !== channel || d.type !== 'fail') return;
    if (window.PhaseTease) return; // 10/29: 실패 놀리기는 src/phase/tease.js(글+목소리, 모든 페이즈, 짐 싸기 제외)가 맡는다
    const phase = window.SpeedrunPhase ? window.SpeedrunPhase.state.phase : 1;
    if (phase !== 1 || performance.now() - failAt < 4000) return;
    const pool = FAIL.filter(id => id !== lastFail);
    const id = pool[Math.floor(Math.random() * pool.length)];
    lastFail = id; failAt = performance.now();
    setTimeout(() => play(id), 350);
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();

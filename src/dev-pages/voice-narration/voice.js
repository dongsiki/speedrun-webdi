/* 개발자용 새 항목: 음성 내레이션·놀리는 음성 (2026-10-26 Claude Code).
   목소리는 Supertonic 3 여자 F1 하나. 게임 코드는 고치지 않고, 화면에 이미 뜨는 글자를 보고 같은 문장의 음성을 튼다.
   - 1페이즈: AI 쪽지·말풍선(놀리기), 미니게임 실패 때 놀리는 말
   - 2페이즈: 바뀐 게임에 들어갈 때 뜨는 자막(내레이션), 마지막 경고 세 줄
   음량은 작게. 2페이즈 쪽은 조금 어둡게(고음 깎고 짧은 메아리). */
(() => {
  'use strict';
  const CLIPS = /* @voice-clips */ {};
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
  const FAIL = Object.keys(LINES).filter(id => id[0] === 'f' && CLIPS[id]);
  const VOLUME = { t: .3, f: .3, n: .26, w: .32 };
  const channel = 'speedrun-midterm-v1';
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const byText = new Map(Object.entries(LINES).map(([id, text]) => [norm(text), id]));
  let muted = false, ctx = null, current = null;
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
      const b64 = CLIPS[id].split(',')[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      buffers[id] = new Promise((ok, no) => ctx.decodeAudioData(bytes.buffer, ok, no));
    }
    return buffers[id];
  }
  async function play(id, force) {
    if ((muted && !force) || !CLIPS[id] || !context()) return;
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
    src.onended = () => { if (current === src) current = null; };
    document.body.dataset.voice = id;
  }
  window.VoiceNarration = { play, lines: LINES, get muted() { return muted; } };

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
    // 이 페이지에서는 '추가 보이스'가 들어갔으므로 구현 예정 표시에서 그 줄만 뺀다
    const todo = () => document.querySelectorAll('#phase-todo p').forEach(p => { if (/보이스/.test(p.textContent)) p.remove(); });
    const aside = document.getElementById('phase-todo');
    if (aside) { todo(); new MutationObserver(todo).observe(aside, { childList: true }); }
  }

  // 1페이즈 미니게임 실패: 놀리는 말(같은 말 연속 금지, 4초 간격)
  let lastFail = '', failAt = 0;
  addEventListener('message', event => {
    const d = event.data;
    if (!d || d.channel !== channel || d.type !== 'fail' || !FAIL.length) return;
    const phase = window.SpeedrunPhase ? window.SpeedrunPhase.state.phase : 1;
    if (phase !== 1 || performance.now() - failAt < 4000) return;
    const pool = FAIL.filter(id => id !== lastFail);
    const id = pool[Math.floor(Math.random() * pool.length)];
    lastFail = id; failAt = performance.now();
    setTimeout(() => play(id), 350);
  }, true);

  // 개발자 패널: 바로가기 + 대사 하나씩 듣기 + 음성 끄기
  function panel() {
    const box = document.createElement('details'); box.id = 'voice-panel';
    const group = { n: '2페이즈 내레이션', w: '2페이즈 끝 경고', t: '1페이즈 AI 놀리기', f: '실패할 때 놀리기' };
    let html = '<summary>음성</summary><div class="vp-body">'
      + '<p class="vp-h">바로가기</p>'
      + '<button data-go="reset">1페이즈 처음(AI 쪽지)</button><button data-go="phase2">2페이즈 처음</button>'
      + '<button data-go="phase2-last">점스 직전 한 판</button><button data-go="scare">경고·점스 바로</button>'
      + '<button data-mute>음성 끄기</button>';
    for (const [k, name] of Object.entries(group)) {
      const ids = Object.keys(LINES).filter(id => id[0] === k && CLIPS[id]);
      if (!ids.length) continue;
      html += `<p class="vp-h">${name}</p>` + ids.map(id => `<button data-say="${id}">${LINES[id]}</button>`).join('');
    }
    box.innerHTML = html + '</div>';
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.say) play(b.dataset.say, true);
      if (b.dataset.go) { location.hash = 'demo=' + b.dataset.go; location.reload(); }
      if (b.hasAttribute('data-mute')) { muted = !muted; b.textContent = muted ? '음성 켜기' : '음성 끄기'; try { current && current.stop(); } catch (_) {} }
    });
    document.body.append(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { watch(); panel(); });
  else { watch(); panel(); }
})();

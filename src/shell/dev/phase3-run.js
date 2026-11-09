/* 개발자용 02 · 3페이즈 땅파기(2026-11-07, Claude Code). 본편 01에는 없다.
   11/06 사용자 OK 계획: 3페 「도와주세요」 뒤 → 바로 땅파기(1·2페와 같은 판) → 파낸 물건마다 그 게임의 3페이즈판
   → 다 깨면: 진엔딩 조건을 채웠으면 기존 AI 스위치 길게 눌러 끄기 → 진엔딩 / 아니면 AI가 「고마워요」 한마디 → 클리어 화면.
   3페이즈 시안 페이지(dev-pages/phase3)가 「도와주세요」 뒤에 02_speedrun_dev.html#p3dig 로 넘어오면 이 파일이 시작한다.
   게임 문서는 02 목록과 같은 것(PortableGames)을 쓰고, 3페이즈만 문서에 넣어 연다. */
(() => {
  'use strict';
  if (!/(?:^#|[#&])p3dig\b/.test(location.hash)) return;
  const G = typeof PortableGames !== 'undefined' ? PortableGames : {}; // documents.js의 const(전역 변수지만 window 속성은 아님)
  const DIG = 'p3-digging.html', CLEAR = '08-clear-screen.html';
  const channel = 'speedrun-midterm-v1', devChannel = 'speedrun-offline-developer-v1';
  // 땅파기 물건 → 그 게임(02 목록과 같은 문서)과 3페이즈 넣는 법
  const head = code => html => html.replace(/<head>/i, () => '<head><script>' + code + '<' + '/script>');
  const tail = code => html => { const i = html.toLowerCase().lastIndexOf('</body>'), t = '<script>' + code + '<' + '/script>'; return i < 0 ? html + t : html.slice(0, i) + t + html.slice(i); };
  // 미로·마지막 걸음은 문서 안 자기 「3페」 버튼, CCTV는 dev-phase 메시지로 바꾼다. 페이즈 버튼은 가린다(3페 진행 중엔 바꾸지 않음).
  const wrapper3 = tail("(function(){var s=document.createElement('style');s.textContent='#dev-phase-bar{display:none!important}';document.head.appendChild(s);"
    + "var b=document.querySelector('#dev-phase-bar button[data-p=\"3\"]');if(b)b.click();else postMessage({channel:'" + devChannel + "',type:'dev-phase',phase:3},'*');})();");
  const GAMES = {
    bulb: { id: '01-switches.html', phase3: wrapper3 },
    key: { id: '02-maze.html', phase3: wrapper3 },
    toothbrush: { id: '03-memory-routine.html', phase3: head('window.MEMORY_PHASE=3;') },
    cane: { id: '06-last-walk.html', phase3: wrapper3 },
    // 실 꿰기·MRI: 11/07 사용자 「나중에 생각해」 → 3페이즈판을 정하지 않고 지금 판 그대로 둔다(실 꿰기는 페이즈 구분 없음, MRI 3페는 「없음」이라 1페판).
    spool: { id: '09-needle.html', phase3: null },
    suitcase: { id: '10-suitcase.html', phase3: head('window.SUITCASE_PHASE=3;') },
    chart: { id: '07-mri.html', phase3: null }
  };
  // 11/09 사용자: 「1페에만 나오게 하고, 2,3페에는 나오게 하지 말자」 → 3페에서는 실타래(실 꿰기)를 묻지 않는다.
  const SKIP = ['spool']; // 3페에서 땅에 묻지 않는 물건
  const ALL = Object.keys(GAMES).filter(k => !SKIP.includes(k));
  const done = new Set();
  // 진엔딩 조건(11/07 사용자 「개연성있으면서 … 눈썰미가 있다면 찾을 수 있을 그런 조건을 너가 알아서 채워봐」 → Claude가 정함):
  // 3페 짐 싸기에서 아무것도 챙기지 않고 빈 가방을 닫아 떠나기. 붙잡지 않고 놓아 보내기 = AI가 이별을 받아들이는 결말과 맞물린다.
  let emptyBag = false;
  const trueEnding = () => emptyBag;

  document.documentElement.style.background = '#000';
  const style = document.createElement('style');
  style.textContent = `#p3run{position:fixed;inset:0;z-index:2147483000;background:#fff}
#p3run iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
#p3run .p3run-talk{position:absolute;inset:0;display:grid;place-items:center;background:#000;color:#fff;z-index:5}
#p3run .p3run-talk p{margin:0;padding:0 8px;font:clamp(22px,4.6vw,38px)/1.55 Batang,"바탕","BatangChe","Malgun Gothic",serif;text-align:center;letter-spacing:.02em}
#p3run .p3run-fade{position:absolute;inset:0;z-index:9;background:#fff;opacity:0;pointer-events:none;transition:opacity .44s ease}
#p3run .p3run-fade.on{opacity:1}
#p3run .p3run-fade.black{background:#000}`;
  document.head.append(style);
  const root = document.createElement('div'); root.id = 'p3run';
  const fade = document.createElement('div'); fade.className = 'p3run-fade on black';
  root.append(fade);
  const start = () => { document.getElementById('portable-menu').hidden = true; document.body.dataset.playing = 'p3run'; document.title = '3페이즈 · 개발용'; document.body.append(root); };
  if (document.getElementById('portable-menu')) start(); else addEventListener('DOMContentLoaded', start);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function cover(on, black = false) { fade.classList.toggle('black', black); fade.classList.toggle('on', on); await sleep(460); }
  function frame(html, title) {
    const f = document.createElement('iframe'); f.title = title; f.setAttribute('allow', 'autoplay; fullscreen');
    f.addEventListener('load', () => f.contentWindow?.focus(), { once: true });
    f.srcdoc = html; root.append(f); return f;
  }
  function stop(f) {
    if (!f) return;
    (function quiet(win) { try { win.dispatchEvent(new Event('pagehide')); win.document.querySelectorAll('audio,video').forEach(m => m.pause()); win.document.querySelectorAll('iframe').forEach(c => quiet(c.contentWindow)); } catch (_) {} })(f.contentWindow);
    f.remove();
  }

  // 땅파기. 3페에서 빼는 물건은 처음부터 묻지 않는다.
  let digHtml = G[DIG]?.html || '';
  if (SKIP.length) digHtml = digHtml.replace("const types=['bulb','key','toothbrush','cane','spool','suitcase','chart'];", 'const types=' + JSON.stringify(ALL) + ';');
  const dig = frame(digHtml, '땅파기 · 3페이즈');
  dig.addEventListener('load', () => cover(false), { once: true });
  let game = null, object = null, busy = false, watch = 0;

  async function enter(type) {
    const g = GAMES[type], doc = g && G[g.id];
    if (!doc || busy) return;
    busy = true; object = type;
    dig.contentWindow.postMessage({ channel, type: 'pause' }, '*');
    await cover(true);
    dig.hidden = true;
    game = frame(g.phase3 ? g.phase3(doc.html) : doc.html, doc.title + ' · 3페이즈');
    game.addEventListener('load', () => {
      cover(false); busy = false;
      // 미로·CCTV·마지막 걸음은 겉 화면이 결과를 들고 있다(겉 화면 body의 data-phase).
      clearInterval(watch);
      watch = setInterval(() => {
        try {
          const d = game?.contentDocument, ph = d?.body?.dataset.phase;
          if (d?.getElementById('again') && d.getElementById('stage') && ['complete', 'fail', 'back'].includes(ph)) leave(ph);
        } catch (_) {}
      }, 250);
    }, { once: true });
  }
  async function leave(outcome) {
    if (!game || busy) return;
    busy = true; clearInterval(watch);
    const type = object;
    await cover(true);
    stop(game); game = null; object = null;
    if (outcome === 'complete') done.add(type);
    if (ALL.every(k => done.has(k))) return finish();
    dig.hidden = false;
    dig.contentWindow.postMessage({ channel, type: 'resume', object: type, outcome: outcome === 'complete' ? 'complete' : outcome === 'fail' ? 'fail' : 'abandon' }, '*');
    await cover(false); busy = false;
  }
  addEventListener('message', e => {
    const d = e.data; if (!d) return;
    if (e.source === dig.contentWindow && d.channel === channel && d.type === 'enter') enter(d.object);
    if (game && e.source === game.contentWindow) {
      if (object === 'suitcase' && d.type === 'suitcase-result' && d.outcome === 'complete') emptyBag = Array.isArray(d.selected) && d.selected.length === 0;
      if (['complete', 'fail', 'back'].includes(d.type)) leave(d.type);
      if (d.channel === devChannel && d.type === 'menu') leave('back');
    }
  });

  async function finish() {
    stop(dig);
    // 진엔딩: 3페이즈 시안의 부탁 3줄 → 기존 AI 스위치 길게 눌러 끄기 → 진엔딩
    if (trueEnding()) { location.href = 'dev-pages/phase3/index.html#scene=ask'; return; }
    // 일반 엔딩: 버튼 화면 없이 AI가 한마디 → 클리어 화면
    const talk = document.createElement('div'); talk.className = 'p3run-talk';
    const line = document.createElement('p'); talk.append(line); root.append(talk);
    await cover(false, true);
    const voice = new Audio(window.P3RunVoice || '');
    line.textContent = '고마워요.';
    await Promise.race([new Promise(r => { voice.onended = voice.onerror = r; voice.play().catch(r); }), sleep(4000)]);
    await sleep(1600);
    await cover(true);
    talk.remove();
    const clear = G[CLEAR];
    // 11/07 AI 집착 단서: 클리어 화면 아래 아주 작게 「다음 세션 준비 중…」(고마워요 뒤에도 AI가 또 돌린다는 암시)
    const next = '<p style="position:fixed;left:0;right:0;bottom:10px;margin:0;text-align:center;font:10px/1 Consolas,\'Courier New\',monospace;color:#a8a8a8;letter-spacing:.05em;pointer-events:none;z-index:2147483000" aria-hidden="true">다음 세션 준비 중…</p>';
    if (clear) frame(clear.html.replace(/<\/head>/i, () => '<style>#preview-bar,#preview-hint{display:none!important}</style></head>').replace(/<\/body>/i, () => next + '</body>'), clear.title);
    await sleep(60); await cover(false);
  }
})();

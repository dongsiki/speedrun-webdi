/* 개발자용 02: 각 게임 화면 위 「1페」「2페」「3페」 버튼(2026-10-29, Claude Code). 본편 01에는 없다.
   10/29 사용자: 「일단 1페2페3페 버튼을 각 게임화면의 위에 배치시켜줘」(10/28 메모: 「딱미로에서 위에 1페2페 버튼 있던 것처럼」)
   미로는 게임 안에 자기 버튼이 있어서 여기서는 빼고, 나머지 게임에 같은 모양으로 둔다.
   2·3페 내용은 아직 정해 만들지 않았으므로 눌러도 화면은 그대로(1페)다. */
(() => {
  'use strict';
  // 10/29: 마지막 걸음은 게임 안에 자기 1/2/3페 버튼이 생겨 여기서 뺌(미로와 같음).
  const GAMES = ['01-switches.html', '03-memory-routine.html', '07-mri.html', '09-needle.html', '10-suitcase.html'];
  const bar = document.createElement('div');
  bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈'); bar.hidden = true;
  bar.innerHTML = '<button type="button" data-p="1" aria-pressed="true">1페</button><button type="button" data-p="2" aria-pressed="false">2페</button><button type="button" data-p="3" aria-pressed="false">3페</button><button type="button" data-cut hidden>컷신</button>';
  document.body.append(bar);
  // 페이즈 내용이 만들어진 게임은 누른 페이즈를 게임 화면에 알린다(10/29 MRI부터). 나머지는 아직 그대로.
  // 게임마다 받는 메시지 모양이 다르다(각 게임 스레드가 정함).
  const READY = {
    '07-mri.html': p => ({ channel: 'speedrun-dev-phase', phase: p }),
    '10-suitcase.html': p => ({ type: 'phase', phase: p }), // 10/29 짐 싸기: 2페 = 잠긴 가방, 3페 = 더 깊은 컷신
    '03-memory-routine.html': p => ({ channel: 'speedrun-memory-phase', phase: p }) // 10/29 치매(기억 속 하루)
  };
  // 10/31 사용자: 「각 게임마다, 페이즈마다 컷씬이 있다면 그 게임 속에 컷신 버튼을 추가해줘. 그래서 게임 안 하고도 바로 볼 수 있게끔」
  // 컷신이 있는 게임·페이즈에만 「컷신」 버튼이 보인다. 짐 싸기 1·3페, 기억 1·2·3페(마지막 걸음은 게임 안 자기 버튼).
  const CUT = {
    '10-suitcase.html': { phases: [1, 3], msg: () => ({ type: 'cutscene' }) },
    '03-memory-routine.html': { phases: [1, 2, 3], msg: () => ({ channel: 'speedrun-memory-cutscene' }) }
  };
  let current = 1;
  const cutBtn = bar.querySelector('button[data-cut]');
  const press = p => { current = p; for (const b of bar.querySelectorAll('button[data-p]')) b.setAttribute('aria-pressed', String(b.dataset.p === String(p))); const c = CUT[document.body.dataset.playing || '']; cutBtn.hidden = !(c && c.phases.includes(p)); };
  bar.addEventListener('click', e => {
    const id = document.body.dataset.playing || '';
    if (e.target.closest('button[data-cut]')) { const c = CUT[id]; try { if (c) document.getElementById('portable-stage').contentWindow.postMessage(c.msg(), '*'); } catch (_) {} return; }
    const b = e.target.closest('button[data-p]');
    if (!b || !READY[id]) return;
    const p = Number(b.dataset.p); press(p);
    const frame = document.getElementById('portable-stage');
    try { frame.contentWindow.postMessage(READY[id](p), '*'); } catch (_) {}
  });
  function sync() { bar.hidden = !GAMES.includes(document.body.dataset.playing || ''); press(1); }
  // 11 엔딩 크레딧: 크레딧이 끝나면(done) 개발자용 목록으로 돌아온다.
  addEventListener('message', e => { const d = e.data; if (d && d.channel === 'speedrun-ending-credits-v1' && d.type === 'done' && document.body.dataset.playing === '11-ending-credits.html') location.reload(); });
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-playing'] });
  sync();
})();

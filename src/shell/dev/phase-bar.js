/* 개발자용 02: 각 게임 화면 위 「1페」「2페」「3페」 버튼(2026-10-29, Claude Code). 본편 01에는 없다.
   10/29 사용자: 「일단 1페2페3페 버튼을 각 게임화면의 위에 배치시켜줘」(10/28 메모: 「딱미로에서 위에 1페2페 버튼 있던 것처럼」)
   미로는 게임 안에 자기 버튼이 있어서 여기서는 빼고, 나머지 게임에 같은 모양으로 둔다.
   2·3페 내용은 아직 정해 만들지 않았으므로 눌러도 화면은 그대로(1페)다. */
(() => {
  'use strict';
  const GAMES = ['01-switches.html', '03-memory-routine.html', '06-last-walk.html', '07-mri.html', '09-needle.html', '10-suitcase.html'];
  const bar = document.createElement('div');
  bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈'); bar.hidden = true;
  bar.innerHTML = '<button type="button" data-p="1" aria-pressed="true">1페</button><button type="button" data-p="2" aria-pressed="false">2페</button><button type="button" data-p="3" aria-pressed="false">3페</button>';
  document.body.append(bar);
  function sync() { bar.hidden = !GAMES.includes(document.body.dataset.playing || ''); }
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-playing'] });
  sync();
})();

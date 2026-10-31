/* 개발자용 02 마지막 걸음: 위쪽 「1페」「2페」「3페」 버튼(2026-10-29, Claude Code). 본편 01에는 없다.
   미로(phase-toggle.js)와 같은 방식: 누르면 게임 문서 head에 window.LastWalkPhase를 넣어 같은 판을 새로 연다.
   2페 = AI가 대신 해 주며 통제(숨·끌어당김·눈 감김) / 3페 = AI 시점(phases.js). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), body = document.body;
  const original = DevStage.html;
  const withPhase = n => n === 1 ? original : original.replace(/<head>/i, () => '<head><script>window.LastWalkPhase=' + n + ';<' + '/script>');
  const bar = document.createElement('div'); bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈');
  bar.innerHTML = '<button type="button" data-p="1">1페</button><button type="button" data-p="2">2페</button><button type="button" data-p="3">3페</button><button type="button" data-cut>컷신</button>';
  body.append(bar);
  function set(next) {
    body.dataset.devPhase = String(next);
    for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === String(next)));
    DevStage.html = withPhase(next);
    $('again').click(); // 같은 판을 새로 연다(guides-3.js start)
  }
  bar.addEventListener('click', event => { const b = event.target.closest('button[data-p]'); if (b) set(Number(b.dataset.p)); });
  // 10/31 「컷신」: 걷지 않고 중환자실 컷신만 바로 본다(game.js가 받음).
  bar.addEventListener('click', event => { if (!event.target.closest('button[data-cut]')) return; try { $('stage').contentWindow.postMessage({ channel: 'speedrun-dev-cutscene' }, '*'); } catch (_) {} });
  for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === '1'));
  body.dataset.devPhase = '1';
})();

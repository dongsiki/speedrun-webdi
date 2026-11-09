/* 개발자용 02 물류센터 야간 분류: 위쪽 「1페」「2페」「3페」 버튼(2026-11-10, Claude Code, 마지막 걸음 것을 그대로 옮김). 본편 01에는 없다.
   누르면 게임 문서 head에 window.WarehousePhase를 넣어 같은 판을 새로 연다. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), body = document.body;
  const original = DevStage.html;
  const withPhase = n => n === 1 ? original : original.replace(/<head>/i, () => '<head><script>window.WarehousePhase=' + n + ';<' + '/script>');
  const bar = document.createElement('div'); bar.id = 'dev-phase-bar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '페이즈');
  bar.innerHTML = '<button type="button" data-p="1">1페</button><button type="button" data-p="2">2페</button><button type="button" data-p="3">3페</button>';
  body.append(bar);
  function set(next) {
    body.dataset.devPhase = String(next);
    for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === String(next)));
    DevStage.html = withPhase(next);
    $('again').click(); // 같은 판을 새로 연다(guides-3.js start)
  }
  bar.addEventListener('click', event => { const b = event.target.closest('button[data-p]'); if (b) set(Number(b.dataset.p)); });
  for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.p === '1'));
  body.dataset.devPhase = '1';
})();

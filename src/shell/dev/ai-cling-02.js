/* 02 목록 파일: 게임 화면이 열려 있는 동안(목록 화면 빼고) 심전도 삑 소리와 구석 「세션 #4,812」(ai-cling.js). 11/07 Claude Code. */
(() => {
  'use strict';
  const sync = () => { const on = !!document.body.dataset.playing; AiCling.session(on); AiCling.ecg(on); };
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-playing'] });
  sync();
})();

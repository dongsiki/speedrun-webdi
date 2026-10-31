// 기억(치매) 스테이지 1·2·3페이즈 설정(2026-10-29, Claude Code).
// 사용자 원문(10/29): 「치매 1. 그 3번째부터는 … 아이 때의 맵으로 변환 … 2. 심화되고 집이 어질러진상태에서, 막 뭔 이상한 걸 먹는다던가 …
//   생리적인 불쾌감 … 3. 아이상태가 디폴트. 그래서 스토리 전개」
//   「치매1 아이맵에서 메모대신, 엄마가 다 알아서 알려주고 뭐 양치도 해주고 음식도 차려주고 … 아이맵이 끝나면 집이 어질러져 있고,
//   그 상태에서도 1스테이지처럼 지 할 일만 하는 거지. 뭐 치운다던가 그런 건 안 하고.」
//
// 페이즈 받는 법(합치는 쪽에서 셋 중 하나):
//   1) 스테이지 문서 head 맨 앞에 window.MEMORY_PHASE=2 를 넣는 script 태그 하나를 끼운다
//      (본편 phase.js의 soundGlitch처럼 html.replace(/<head>/i, …)). ※ 이 파일 주석에는 닫는 script 태그 글자를 쓰지 않는다(HTML이 끊김).
//   2) 파일로 바로 열 때 주소 끝에 ?phase=2 또는 #phase=2.
//   3) 열린 뒤 바꾸기: iframe.contentWindow.postMessage({ channel: 'speedrun-memory-phase', phase: 2 }, '*')
//      → 그 페이즈 1회차(침대에서 눈 뜨기)부터 다시 시작한다.
//   아무것도 없으면 1페이즈.
(function (root) {
  'use strict';
  const CHANNEL = 'speedrun-memory-phase';
  const parse = v => { v = Number(v); return v === 2 || v === 3 ? v : 1; };
  function initial() {
    if (root.MEMORY_PHASE != null) return parse(root.MEMORY_PHASE);
    const m = /[?&#]phase=(\d)/.exec((location.search || '') + (location.hash || ''));
    return m ? parse(m[1]) : 1;
  }
  // notes = 기존 회차 메모·변화(1~4: 기존 1~4회차와 같다). child = 아이 맵(메모 없음, 엄마).
  // mess = 어질러진 정도(0~4). food = 이상한 음식. story = 아이 맵 대사 묶음 이름.
  const ROUNDS = {
    // 2026-10-31 사용자: 치매 스테이지 5회차로. 1페 5회차 = 더 어질러진 집, 2페 5회차 = 침대 컷신(cutscene, 엔딩 아님), 3페 = 아이 맵 한 번 더.
    // roaches/bathRoaches = 2페 바퀴벌레 수(주방/화장실).
    1: [{ notes: 1 }, { notes: 2 }, { child: true, story: 'mom' }, { notes: 1, mess: 2 }, { notes: 1, mess: 4 }],
    2: [{ notes: 1, mess: 1, food: 'mold', roaches: 1 }, { notes: 2, mess: 2, food: 'rotten', roaches: 2 }, { notes: 3, mess: 3, food: 'tissue', roaches: 3, bathRoaches: 1 }, { notes: 4, mess: 4, food: 'soap', roaches: 5, bathRoaches: 2 }, { notes: 1, mess: 4, cutscene: 'collapse' }],
    3: [{ child: true, story: 'mom' }, { child: true, story: 'mom' }, { child: true, story: 'key' }, { child: true, story: 'voice' }, { child: true, story: 'road', ending: 'road' }]
  };
  // 엄마 말(메모 대신). 방 번호: 0 화장실, 1 주방, 2 현관, 3 침실.
  const LINES = {
    mom: {
      wake: '일어나. 학교 가야지.',
      room: { 0: '이 닦자. 이리 와.', 1: '앉아. 엄마가 차려 줄게.', 2: '잘 다녀와.' },
      brush: ['아— 해 봐.', '옳지. 다 됐다.'],
      serve: '많이 먹어.',
      ate: '잘 먹었네.'
    },
    key: {
      wake: '일어나. 학교 가야지.',
      room: { 0: '이 닦자. 이리 와.', 1: '앉아. 엄마가 차려 줄게.', 2: '이리 와. 열쇠 걸어 줄게. 잃어버리지 마.' },
      brush: ['아— 해 봐.', '옳지. 다 됐다.'],
      serve: '많이 먹어.',
      ate: '잘 먹었네.'
    },
    voice: { // 목소리만 들리고 엄마는 보이지 않는다.
      hidden: true,
      wake: '…일어나.',
      room: { 0: '이 닦아야지.', 1: '먹고 가.', 2: '잘 다녀와.' },
      brush: ['…', '…다 됐다.'],
      serve: '…',
      ate: ''
    },
    road: { // 엄마도 목소리도 없다. 현관 너머가 길이다.
      hidden: true, silent: true,
      wake: '', room: { 0: '', 1: '', 2: '' }, brush: ['', ''], serve: '', ate: ''
    }
  };
  const listeners = [];
  root.addEventListener('message', event => {
    if (event.data?.channel !== CHANNEL) return;
    const p = parse(event.data.phase);
    for (const fn of listeners) fn(p);
  });
  root.MemoryPhase = Object.freeze({
    CHANNEL, initial, parse,
    round(phase, round) { const list = ROUNDS[phase] || ROUNDS[1]; return Object.assign({ notes: 0, mess: 0, food: null, child: false, story: null }, list[Math.max(0, Math.min(list.length - 1, round - 1))]); },
    lines(story) { return LINES[story] || null; },
    rounds(phase) { return (ROUNDS[phase] || ROUNDS[1]).length; },
    // 2페 거울 일그러짐 0~1: 1회차 0 → 거울이 나오는 마지막 회차(컷신 회차 제외) 1. 회차가 늘어도 마지막 = 최대.
    distort(phase, round) {
      if (phase !== 2) return 0;
      const mirrorRounds = ROUNDS[2].filter(r => !r.cutscene).length;
      return mirrorRounds > 1 ? Math.max(0, Math.min(1, (round - 1) / (mirrorRounds - 1))) : 1;
    },
    onChange(fn) { listeners.push(fn); }
  });
})(window);

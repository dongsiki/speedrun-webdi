(() => {
  'use strict';
  // 반항 기록 (2026-10-12). 직접 플레이만 기록한다: AI 자동 클리어 숫자는 어떤 도전과제도 열지 않는다.
  // 기록은 이 PC의 브라우저에 남고(localStorage), 쓸 수 없으면 이번 판 동안만 유지된다.
  const KEY = 'speedrun-rebellion-dev-preview', channel = 'speedrun-midterm-v1';
  const $ = id => document.getElementById(id), body = document.body;
  // 2026-10-19: 실 꿰기(needle, Claude Code)·짐 싸기(suitcase, Codex) 추가. 클리어는 여기 있는 여섯 곳 전부(사용자 확정).
  const games = ['switches', 'maze', 'routine', 'limb', 'needle', 'suitcase'];
  const place = { switches: '전구 퍼즐', maze: '미로', routine: '기억 속 하루', limb: '마지막 걸음', needle: '실 꿰기', suitcase: '짐 싸기' };
  const thing = { bulb: ['전구', '전구를', '전구는'], key: ['열쇠', '열쇠를', '열쇠는'], toothbrush: ['칫솔', '칫솔을', '칫솔은'], cane: ['지팡이', '지팡이를', '지팡이는'], spool: ['실과 바늘', '실과 바늘을', '실과 바늘은'], suitcase: ['여행가방', '여행가방을', '여행가방은'] };
  const cleared = { switches: '그는 불을 직접 켰다.', maze: '그는 미로를 걸어서 빠져나왔다.', routine: '그는 그날 하루를 끝까지 기억했다.', limb: '그는 끝까지 걸었다. 숨은 기계가 이어 쉬었다.', needle: '그는 바늘에 실을 꿰었다.', suitcase: '그는 가져갈 것과 두고 갈 것을 골랐다.' };
  const failed = { switches: '그는 불을 켜지 못했다.', maze: '그는 미로에서 쓰러졌다.', routine: '그는 그날 일을 놓쳤다.', limb: '그는 숨을 놓쳤다.', needle: '그는 실을 다 써 버렸다.', suitcase: '그는 짐을 싸지 못했다.' };
  // 곳·물건 수를 글로: 네 / 다섯 / 여섯.
  const many = n => ({ 4: '네', 5: '다섯', 6: '여섯', 7: '일곱' }[n] || String(n));
  const N = many(games.length), things = Object.values(thing).map(t => t[0]).join(', ');
  const sum = record => Object.values(record || {}).reduce((a, b) => a + b, 0);

  const blank = () => ({ v: 1, runs: 0, lastAuto: 0, clears: {}, fails: {}, backs: {}, found: {}, slow: 0, persist: 0, allFour: 0, again: 0, needleBare: 0, suitcaseReturn: 0, suitcaseEmpty: 0, unlocked: {}, log: [] });
  let store = blank(), saved = true;
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && raw.v === 1) store = { ...blank(), ...raw }; } catch (_) { saved = false; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); saved = true; } catch (_) { saved = false; } }

  // 기획(9/15): 직접 한 번 클리어한 사람이 다시 시작해 AI를 끄면 첫 게임(땅파기) 오른쪽 아래에 공개된다.
  // 개발용 미리보기(02 "클리어 후 화면")는 RebellionForceReveal로 버튼을 늘 보이게 한다.
  const revealed = sum(store.clears) > 0 || window.RebellionForceReveal === true;

  // 2026-10-13: 두 갈래. 도전과제(goal)는 잠겨 있어도 이름·조건이 반투명하게 보여 할 일을 알려 준다.
  // 반항 기록(rebel)은 하기 전까지 이름도 조건도 깨진 글자다. 반항은 예고되지 않는다.
  // story: 눌렀을 때 뜨는 설명. 이야기(중환자실·호흡기)는 직접 말하지 않는다.
  const achievements = [
    { id: 'dig', kind: 'goal', title: '흙을 팠다', line: '그는 손으로 흙을 파서 물건을 꺼냈다.', hint: '땅에서 물건을 하나 찾는다.', test: s => Object.keys(s.found).length >= 1,
      story: ['맨손으로 판 흙은 생각보다 따뜻했다.', '손톱 밑에 낀 흙은 씻어도 오래 남았다.', '누군가 그 손을 닦아 주며 물었다. "또 어디 다녀오셨어요."'] },
    { id: 'dig4', kind: 'goal', title: `${many(Object.keys(thing).length)} 개를 꺼냈다`, line: `${things}. 그는 모두 꺼냈다.`, hint: `묻힌 물건 ${many(Object.keys(thing).length)} 개를 모두 찾는다.`, test: s => Object.keys(thing).every(k => s.found[k]),
      story: [`${things}. 한 사람이 하루를 사는 데 드는 것들.`, '그는 이것들을 왜 묻었는지 기억하지 못했다.', '다시 꺼내야 한다는 것만은 알았다.'] },
    { id: 'switches', kind: 'goal', title: '불을 켰다', line: cleared.switches, hint: '전구 퍼즐을 직접 푼다.', test: s => s.clears.switches > 0,
      story: ['낡은 전구. 돌리면 찰칵 소리가 난다.', '그 방의 불은 늘 켜져 있었다. 밤에도, 아무도 없을 때도.', '그래서 그는 직접 켜 보고 싶었다. 끄는 법은 이미 잊었으니까.'] },
    { id: 'maze', kind: 'goal', title: '길을 찾았다', line: cleared.maze, hint: '미로를 직접 빠져나온다.', test: s => s.clears.maze > 0,
      story: ['녹슨 현관 열쇠. 고리에 붉은 실이 묶여 있다. 잃어버리지 말라고 누가 묶었다.', '매일 걷던 길이 어느 날부터 매일 달라졌다.', '벽은 늘 차가웠고, 늘 같은 자리에 있었다.'] },
    { id: 'routine', kind: 'goal', title: '하루를 기억했다', line: cleared.routine, hint: '기억 속 하루를 끝낸다.', test: s => s.clears.routine > 0,
      story: ['칫솔모가 한쪽으로 닳아 있다.', '일어나서, 씻고, 먹고, 기다리고.', '그는 그 하루를 처음부터 끝까지 떠올렸다. 마지막으로 온전했던 하루였다.'] },
    { id: 'limb', kind: 'goal', title: '마지막 걸음', line: cleared.limb, hint: '마지막 걸음을 끝까지 간다.', test: s => s.clears.limb > 0,
      story: ['손때 묻은 나무 지팡이. 끝이 비스듬히 닳았다.', '노인은 걸었고, 걷다 보니 아이가 되어 있었다.', '아이는 길 건너의 무언가를 향해 달렸다. 그 뒤의 숨은 기계가 대신 쉬었다.'] },
    { id: 'needle', kind: 'goal', title: '실을 꿰었다', line: cleared.needle, hint: '실 꿰기를 직접 해낸다.', test: s => s.clears.needle > 0,
      story: ['바늘귀는 해마다 조금씩 작아졌다.', '실 끝을 꼬고, 숨을 참고, 눈을 가늘게 떴다.', '떨어진 단추를 달 생각이었다. 지금 입은 옷에는 단추가 없다.'] },
    // 짐 싸기 세 항목은 Codex 초안(work/suitcase-20261019/HANDOFF.md) 그대로.
    { id: 'suitcase', kind: 'goal', title: '짐을 쌌다', line: cleared.suitcase, hint: '짐 싸기를 직접 끝낸다.', test: s => s.clears.suitcase > 0,
      story: ['가방은 처음부터 작았다.', '그는 잠금쇠를 누르기 전에 몇 번이나 안을 들여다보았다.', '들어가지 않은 것들은 목록에 적히지 않았다.'] },
    { id: 'all', kind: 'goal', title: '스피드런', line: `그는 ${N} 가지를 모두 직접 했다. 빠르지는 않았다.`, hint: `한 판에 ${N} 곳을 모두 직접 끝낸다.`, test: s => s.allFour > 0,
      story: [`${N} 가지를 한 번에, 제 손으로 했다.` + ' 빠르지는 않았다.', '기계는 같은 일을 셀 수 없이 해냈다. 한 번도 틀리지 않고, 한 번도 기억하지 않고.', '그는 단 한 번이었다. 그래서 전부 기억했다.'] },
    { id: 'off1', kind: 'rebel', title: '스위치를 내렸다', line: '그는 처음으로 AI를 껐다.', hint: 'AI를 끈다.', test: s => s.runs >= 1,
      story: ['벽에 붙은 작은 스위치. 내리면 초록 불이 꺼진다.', '그는 오래 망설였다. 꺼도 되느냐고 물어볼 사람이 없었다.', '기계는 아무 말도 하지 않았다. 원래 말을 하는 기계가 아니었다.'] },
    { id: 'off3', kind: 'rebel', title: '세 번 내렸다', line: '켜져 있을 때마다 그는 다시 껐다.', hint: '다시 시작해서 AI를 세 번 끈다.', test: s => s.runs >= 3,
      story: ['같은 스위치를 세 번 내렸다.', '세 번 모두, 누군가 다시 올려 두었다.', '그 손이 누구의 것인지 그는 끝내 보지 못했다.'] },
    { id: 'rewind', kind: 'rebel', title: '되감겼다', line: '그는 처음으로 실패했다. 화면이 되감겼다.', hint: '한 번 실패한다.', test: s => sum(s.fails) > 0,
      story: ['처음 무너진 날, 세상은 끝나지 않고 감겼다. 테이프처럼, 처음으로.', '그는 같은 아침을 다시 맞았다.', '다시 맞을 수 있다는 것이 위로인지 벌인지 알 수 없었다.'] },
    { id: 'persist', kind: 'rebel', title: '그래도 다시', line: '세 번 넘어지고도 그는 같은 곳으로 돌아갔다.', hint: '같은 곳에서 세 번 실패한 뒤 끝낸다.', test: s => s.persist > 0,
      story: ['세 번 넘어졌다. 무릎의 멍은 기록되지 않았다.', '그래도 그는 같은 자리로 돌아갔다.', '거기서 누가 기다린다고 믿었으므로.'] },
    { id: 'quit', kind: 'rebel', title: '그만두었다', line: '그는 한 번 그만두었다. 물건은 다시 묻혔다.', hint: '하던 도중에 돌아 나온다.', test: s => sum(s.backs) > 0,
      story: ['그만둔 것도 그의 선택이었다.', '기계는 그만두지 않는다.', '그것이 둘의 하나뿐인 차이였다.'] },
    { id: 'slow', kind: 'rebel', title: '서두르지 않았다', line: '한 곳에 3분 넘게 머물렀다. 그래도 끝냈다.', hint: '한 곳을 3분 넘게 붙잡고 끝낸다.', test: s => s.slow > 0,
      story: ['한 곳에 3분을 넘게 머물렀다. 아무도 재촉하지 않았다.', '벽시계는 오래전에 멈춰 있었고, 그는 그것을 고치지 않았다.', '남은 시간은 그가 세는 것이 아니었다.'] },
    { id: 'bare', kind: 'rebel', title: '숨을 참지 않았다', line: '그는 숨을 참지 않고 실을 꿰었다.', hint: '숨을 참지 않고 실 꿰기를 끝낸다.', test: s => s.needleBare > 0,
      story: ['떨리는 손은 떨리는 대로 두었다.', '숨은 참는 것이 아니라 쉬는 것이었다.', '그때는 아직, 그가 쉬었다.'] },
    { id: 'suitcaseReturn', kind: 'rebel', title: '다시 꺼냈다', line: '그는 넣었던 물건을 다시 꺼냈다.', hint: '넣은 물건을 한 번 이상 꺼낸 뒤 끝낸다.', test: s => s.suitcaseReturn > 0,
      story: ['가져가려고 집었던 것이었다.', '그는 그것을 다시 바닥에 놓았다.', '왜 바꾸었는지는 말하지 않았다.'] },
    { id: 'suitcaseEmpty', kind: 'rebel', title: '빈손으로', line: '그는 아무것도 넣지 않고 가방을 닫았다.', hint: '빈 가방으로 떠난다.', test: s => s.suitcaseEmpty > 0,
      story: ['옷도 사진도 그대로 놓여 있었다.', '그는 빈 가방의 무게를 한 번 들어 보았다.', '이번에는 찾으러 돌아오지 않았다.'] },
    { id: 'again', kind: 'rebel', title: 'RE?', line: '그는 다시 처음으로 돌아갔다. AI는 다시 켜져 있었다.', hint: '모두 끝낸 뒤 다시 시작한다.', test: s => s.again > 0,
      story: ['끝까지 갔는데, 처음이 다시 왔다.', '스위치는 다시 올라가 있었다. 초록 불이 켜져 있었다.', '그는 오늘이 며칠째인지 묻지 않았다. 숫자는 이미 화면에 적혀 있었다.'] }
  ];
  const statNotes = {
    runs: ['스위치를 내림', '내린 횟수. 올린 횟수는 세지 않는다. 그건 그가 한 일이 아니므로.'],
    clears: ['직접 클리어', '제 손으로 끝낸 횟수. 느리고 서툴고, 전부 그의 것.'],
    fails: ['되감김', '세상이 감긴 횟수. 감길 때마다 무언가 조금씩 지워졌다. 무엇이 지워졌는지는 지워졌다.'],
    backs: ['그만둠', '그만둔 횟수. 기계는 이 숫자를 이해하지 못한다.']
  };
  // 기록 한 줄마다 따라붙는, 남이 적은 간호 기록 한 줄.
  function nursing(text) {
    if (/스위치를 내렸다/.test(text)) return '경보 1회. 재연결함.';
    if (/흙 속에서|다시 찾았다/.test(text)) return '손을 오므렸다 폈다 하심.';
    if (/아무것도 넣지 않고/.test(text)) return '개인 물품 모두 남아 있음. 가방만 없어짐.';
    if (/다시 꺼냈다/.test(text)) return '짐을 다시 정리함. 이전 목록과 다름.';
    if (/두고 갈 것을 골랐다/.test(text)) return '짐 가방 닫음. 남은 물건은 제자리.';
    if (/숨을 참지 않았다/.test(text)) return '호흡 일정함. 손 떨림 그대로.';
    if (/실을 꿰었다/.test(text)) return '손끝 떨림 있음. 스스로 멈춤.';
    if (/실을 다 써/.test(text)) return '손가락 경직. 주물러 드림.';
    if (/숨을 놓쳤다/.test(text)) return '자발호흡 잠시 멈춤. 기계가 이어받음.';
    if (/되감겼다/.test(text)) return '산소포화도 일시 저하. 곧 회복.';
    if (/빠져나왔다|끝까지 걸었다/.test(text)) return '호흡 고름.';
    if (/끝까지 기억했다/.test(text)) return '입술 움직임. 무슨 말인지 모름.';
    if (/불을 직접 켰다/.test(text)) return '눈꺼풀 떨림. 불빛 쪽으로 고개 돌리심.';
    if (/가지를 모두 직접/.test(text)) return '활력징후 안정. 특이사항 없음.';
    if (/다시 처음으로/.test(text)) return '보호자 면회 15분.';
    if (/돌아 나왔다/.test(text)) return '주무심.';
    return '특이사항 없음.';
  }
  const noise = '!@$#%&*?efsdRfx#ㅁ';
  function garble(text, seed) {
    let s = seed;
    return [...text].map(c => c === ' ' ? ' ' : noise[(s = (s * 16807 + 11) % 2147483647) % noise.length]).join('');
  }
  const seedOf = id => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 99991, 7) + 1;

  // --- UI ---------------------------------------------------------------------------------
  // 2026-10-13: 땅파기 화면 오른쪽 아래에 버튼 두 개. 도전과제 / 반항 기록. 같은 메뉴를 그 갈래로 연다.
  const dock = document.createElement('div');
  dock.id = 'rebellion-dock'; dock.hidden = true;
  const makeOpen = (id, label, mode) => {
    const b = document.createElement('button');
    b.id = id; b.type = 'button'; b.dataset.mode = mode;
    b.innerHTML = `<span>${label}</span><span class="tally"></span>`;
    b.addEventListener('click', () => show(mode)); dock.append(b); return b;
  };
  const openGoal = makeOpen('achievement-open', '도전과제', 'goal'), open = makeOpen('rebellion-open', '반항 기록', 'rebel');
  const panel = document.createElement('section');
  panel.id = 'rebellion'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '반항 기록');
  const toast = document.createElement('div');
  toast.id = 'rebellion-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.querySelector('main').append(dock, panel, toast);
  let mode = 'rebel';

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const stamp = at => { const d = new Date(at); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const span = ms => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };
  const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 2026-10-13: 메뉴 정리. 도전과제·반항 기록 칸과 숫자 칸을 누르면 설명 창이 뜨고, 기록 한 줄을 누르면
  // 그 아래에 회색 간호 기록이 한 줄 펼쳐진다.
  const reduceMotion = matchMedia('(prefers-reduced-motion:reduce-off-off)');
  // 10/13 오후: 카드 대신 간호기록지 줄. 번호 · 확인 도장 칸 · 이름 · 내용 · 날짜.
  function card(a, i) {
    const on = store.unlocked[a.id], no = `<span class="no" aria-hidden="true">${pad(i + 1)}</span>`;
    if (a.kind === 'rebel' && !on) {
      const seed = seedOf(a.id);
      return `<li><button type="button" class="rb-item locked hidden-rebel" disabled aria-label="아직 알 수 없는 반항 기록">${no}<span class="box" aria-hidden="true"></span><strong class="garble" data-text="${esc(a.title)}" data-seed="${seed}" aria-hidden="true">${esc(garble(a.title, seed))}</strong><p class="garble" data-text="${esc(a.line)}" data-seed="${seed + 7}" aria-hidden="true">${esc(garble(a.line, seed + 7))}</p></button></li>`;
    }
    return `<li><button type="button" class="rb-item${on ? ' on' : ' locked'}" data-detail="${a.id}">${no}<span class="box" aria-hidden="true">${on ? '<i class="stamp">확인</i>' : ''}</span><strong>${esc(a.title)}</strong><p>${esc(on ? a.line : a.hint)}</p>${on ? `<small>${stamp(on)}</small>` : '<small>—</small>'}</button></li>`;
  }
  function render() {
    const stats = [['runs', store.runs], ['clears', sum(store.clears)], ['fails', sum(store.fails)], ['backs', sum(store.backs)]];
    const goals = achievements.filter(a => a.kind === 'goal'), rebels = achievements.filter(a => a.kind === 'rebel');
    const count = list => list.filter(a => store.unlocked[a.id]).length;
    openGoal.querySelector('.tally').textContent = `${pad(count(goals))}/${pad(goals.length)}`;
    open.querySelector('.tally').textContent = `${pad(count(rebels))}/${pad(rebels.length)}`;
    const title = mode === 'goal' ? '도전과제' : '반항 기록';
    panel.dataset.mode = mode; panel.setAttribute('aria-label', title);
    let lastRun = null;
    const log = store.log.slice().reverse().map((entry, i) => {
      const firstOfRun = store.log.find(e => e.run === entry.run);
      const head = entry.run !== lastRun ? `<li class="run"><button type="button" class="rb-line" aria-expanded="false">${pad(entry.run, 3)}번째로 AI를 끈 판</button><p class="nurse" hidden>${firstOfRun ? stamp(firstOfRun.at).slice(6) : '14:00'} 손가락 움직임 있음.</p></li>` : '';
      lastRun = entry.run;
      return `${head}<li><button type="button" class="rb-line" aria-expanded="false"><span class="n">${pad(store.log.length - i, 3)}</span><time>${stamp(entry.at)}</time><span>${esc(entry.text)}</span></button><p class="nurse" hidden>${esc(nursing(entry.text))}</p></li>`;
    }).join('');
    panel.innerHTML = `
      <div class="rb-head"><button class="rb-close" type="button" aria-label="${title} 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h2>${title}</h2><button type="button" class="rb-switch" data-mode="${mode === 'goal' ? 'rebel' : 'goal'}">${mode === 'goal' ? '반항 기록' : '도전과제'} 보기 →</button></div>
      <div class="rb-stats">${stats.map(([key, n]) => `<button type="button" class="rb-stat" data-stat="${key}"><b>${pad(n, 3)}</b>${statNotes[key][0]}</button>`).join('')}</div>
      <p class="rb-note"><button type="button" class="rb-auto">AI가 대신 클리어한 ${Math.max(0, store.lastAuto).toLocaleString('ko-KR')}번은 하나도 기록되지 않았다.</button>${saved ? '' : ' (이 브라우저는 기록을 저장하지 못해 이번 판만 남는다.)'}</p>
      <div class="rb-body">
        <div class="rb-cards">
          <section class="rb-goal" aria-label="도전과제"><h3>도전과제 <span>${pad(count(goals))} / ${pad(goals.length)}</span></h3><ul class="rb-list">${goals.map(card).join('')}</ul></section>
          <section class="rb-rebel" aria-label="반항 기록"><h3>반항 기록 <span>${pad(count(rebels))} / ${pad(rebels.length)}</span></h3><ul class="rb-list">${rebels.map(card).join('')}</ul></section>
        </div>
        <section class="rb-rebel" aria-label="기록"><h3>기록 <span>${pad(store.log.length, 3)}</span></h3>${log ? `<ol class="rb-log">${log}</ol>` : '<p class="rb-empty">아직 아무것도 하지 않았다.</p>'}</section>
      </div>
      <div class="rb-detail" hidden><div class="rb-sheet" role="dialog" aria-modal="true" aria-labelledby="rb-detail-name"><button type="button" class="rb-detail-close" aria-label="설명 닫기">×</button><span class="rb-kind"></span><h4 id="rb-detail-name"></h4><p class="rb-meta"></p><hr><div class="rb-story"></div></div></div>`;
    panel.querySelector('.rb-close').addEventListener('click', close);
    panel.querySelector('.rb-switch').addEventListener('click', event => { mode = event.currentTarget.dataset.mode; render(); panel.scrollTop = 0; panel.querySelector('.rb-close').focus({ preventScroll: true }); });
  }

  // 설명 창 ----------------------------------------------------------------------------
  let detailFrom = null;
  function detail(kind, name, meta, lines) {
    const box = panel.querySelector('.rb-detail');
    box.querySelector('.rb-kind').textContent = kind;
    box.querySelector('h4').textContent = name;
    box.querySelector('.rb-meta').textContent = meta;
    box.querySelector('.rb-story').innerHTML = lines.map(line => `<p>${esc(line)}</p>`).join('');
    detailFrom = document.activeElement; box.hidden = false;
    box.querySelector('.rb-detail-close').focus({ preventScroll: true });
  }
  function closeDetail() {
    const box = panel.querySelector('.rb-detail');
    if (!box || box.hidden) return false;
    box.hidden = true; detailFrom?.focus?.({ preventScroll: true }); return true;
  }
  panel.addEventListener('click', event => {
    const target = event.target;
    if (target.closest('.rb-detail-close') || target.classList.contains('rb-detail')) { closeDetail(); return; }
    const item = target.closest('[data-detail]');
    if (item) {
      const a = achievements.find(x => x.id === item.dataset.detail), on = store.unlocked[a.id];
      const label = a.kind === 'goal' ? '도 전 과 제' : '반 항 기 록';
      detail(label, a.title, on ? `${a.hint} · ${stamp(on)}` : `${a.hint} · 아직`, on ? a.story : a.story.map((line, i) => garble(line, seedOf(a.id) + i)));
      return;
    }
    const stat = target.closest('[data-stat]');
    if (stat) { const [name, line] = statNotes[stat.dataset.stat]; detail('기 록', name, `${Number(stat.querySelector('b').textContent)}번`, [line]); return; }
    if (target.closest('.rb-auto')) {
      const n = Math.max(0, store.lastAuto).toLocaleString('ko-KR');
      detail('기 록', `기록되지 않은 ${n}번`, 'AI가 대신 클리어', ['그동안 그는 아무것도 하지 않았고 아무것도 틀리지 않았다.', '숨은 고르게 쉬어졌다.']);
      return;
    }
    const line = target.closest('.rb-line');
    if (line) {
      const note = line.parentElement.querySelector('.nurse'), openNow = note.hidden;
      note.hidden = !openNow; line.setAttribute('aria-expanded', String(openNow));
    }
  });
  // 아직 오지 않은 반항은 글자가 계속 흔들린다.
  setInterval(() => {
    if (panel.hidden || reduceMotion.matches) return;
    for (const el of panel.querySelectorAll('.garble')) el.textContent = garble(el.dataset.text, Math.floor(Math.random() * 99991) + 1);
  }, 420);

  let returnFocus = null;
  function show(which = 'rebel') {
    mode = which === 'goal' ? 'goal' : 'rebel';
    render(); returnFocus = document.activeElement;
    (mode === 'goal' ? openGoal : open).classList.remove('fresh'); panel.hidden = false; panel.scrollTop = 0;
    panel.querySelector('.rb-close').focus({ preventScroll: true });
  }
  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    const stage = body.dataset.stage, frame = stage && $(stage);
    if (frame && frame.tagName === 'IFRAME') { frame.contentWindow?.focus(); frame.contentWindow?.postMessage({ channel, type: 'focus' }, '*'); }
    else (returnFocus && document.contains(returnFocus) ? returnFocus : open).focus?.({ preventScroll: true });
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); if (!closeDetail()) close(); } });

  const queue = []; let toasting = false;
  function nextToast() {
    if (toasting || !queue.length) return;
    toasting = true; const a = queue.shift();
    toast.innerHTML = `<span>${a.kind === 'goal' ? '도전과제' : '반항 기록'}</span><strong>${esc(a.title)}</strong><p>${esc(a.line)}</p>`;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toasting = false; nextToast(); }, 300); }, 3200);
  }

  // --- 기록 --------------------------------------------------------------------------------
  function write(text) {
    store.log.push({ at: Date.now(), run: store.runs, text });
    if (store.log.length > 300) store.log.splice(0, store.log.length - 300);
  }
  function settle() {
    for (const a of achievements) if (!store.unlocked[a.id] && a.test(store)) {
      store.unlocked[a.id] = Date.now(); queue.push(a); (a.kind === 'goal' ? openGoal : open).classList.add('fresh');
    }
    save(); render(); nextToast(); sync();
  }
  const bump = (record, key) => { record[key] = (record[key] || 0) + 1; };

  let enteredAt = 0, active = null, runFails = {}, runFound = {}, runCleared = new Set(), offInRun = false, stageNow = body.dataset.stage;

  $('ai-switch').addEventListener('click', () => {
    // 원래 핸들러가 먼저 숫자를 멈추고 OFF로 바꾼다. 바뀐 경우에만 센다.
    if (offInRun || $('ai-switch').getAttribute('aria-checked') !== 'false') return;
    offInRun = true;
    const auto = Number($('clear-count').textContent) || 0;
    store.runs++; store.lastAuto = Math.max(store.lastAuto, auto);
    write(`자동 클리어 ${auto.toLocaleString('ko-KR')}번째. 그는 스위치를 내렸다.`);
    settle();
  });

  const idle = () => !['white', 'failure'].includes(body.dataset.transition);
  let settled = false; // 한 번 들어간 곳에서는 결과(클리어·실패·돌아 나옴)를 한 번만 적는다.
  addEventListener('message', event => {
    const data = event.data;
    if (!data || data.channel !== channel || !offInRun) return;
    const source = ['digging', ...games].find(name => $(name)?.contentWindow === event.source);
    // 원래 껍데기가 같은 메시지로 전환(data-transition)을 먼저 시작할 수 있어 전환 상태는 보지 않는다.
    // 화면(data-stage)은 전환이 끝날 때 바뀌므로 아직 보낸 쪽 그대로다. 중복은 settled로 막는다.
    if (!source || source !== body.dataset.stage) return;
    if (source === 'digging') {
      const t = thing[data.object];
      if (data.type === 'found' && t && runFound[data.object] !== 'out') {
        write(runFound[data.object] === 'buried' ? `그는 다시 묻힌 ${t[1]} 다시 찾았다.` : `그는 흙 속에서 ${t[1]} 찾았다.`);
        runFound[data.object] = 'out'; bump(store.found, data.object); settle();
      }
      if (data.type === 'enter' && t) active = data.object;
      return;
    }
    // 실 꿰기는 끝나기 직전에 숨을 참았는지 따로 알려 준다(반항 기록 "숨을 참지 않았다").
    if (source === 'needle' && data.type === 'needle-result' && !settled && data.outcome === 'complete' && !data.held) { store.needleBare++; write('그는 숨을 참지 않았다.'); }
    // 짐 싸기도 끝나기 직전에 결과를 알려 준다(반항 기록 "다시 꺼냈다"·"빈손으로"). 끝까지 간 판만 센다.
    if (source === 'suitcase' && data.type === 'suitcase-result' && !settled && data.outcome === 'complete') {
      if (data.returns > 0) { store.suitcaseReturn++; write('그는 넣었던 물건을 다시 꺼냈다.'); }
      if (data.empty) { store.suitcaseEmpty++; write('그는 아무것도 넣지 않고 가방을 닫았다.'); }
    }
    if (settled || !['complete', 'fail', 'back'].includes(data.type)) return;
    settled = true;
    const took = enteredAt ? performance.now() - enteredAt : 0;
    if (data.type === 'complete') {
      bump(store.clears, source); runCleared.add(source);
      write(`${cleared[source]} ${span(took)}.`);
      if (took >= 180000) store.slow++;
      if ((runFails[source] || 0) >= 3) store.persist++;
      if (games.every(g => runCleared.has(g))) { store.allFour++; write(`그는 ${N} 가지를 모두 직접 했다.`); }
      runFails[source] = 0; if (active) runFound[active] = 'kept';
      settle();
    }
    if (data.type === 'fail') {
      bump(store.fails, source); runFails[source] = (runFails[source] || 0) + 1;
      write(`${failed[source]} 화면이 되감겼다.${active ? ` ${thing[active][2]} 다시 묻혔다.` : ''}`);
      if (active) runFound[active] = 'buried';
      settle();
    }
    if (data.type === 'back') {
      bump(store.backs, source);
      write(`그는 ${place[source]}에서 돌아 나왔다.${active ? ` ${thing[active][2]} 다시 묻혔다.` : ''}`);
      if (active) runFound[active] = 'buried';
      settle();
    }
  }, true);

  // --- 한 판을 다 끝냈을 때: 클리어 → RE? (기획 9/15) ---------------------------------------
  let finale = null;
  function showFinale() {
    if (finale) return;
    finale = document.createElement('section');
    finale.id = 'run-clear'; finale.setAttribute('aria-label', '클리어');
    finale.innerHTML = '<p class="rc-word">클리어</p><button class="rc-log" type="button">반항 기록</button><button class="rc-again" type="button" aria-label="다시 시작. AI가 다시 켜진 처음 화면으로">RE?</button>'
      // 10/13: RE?는 셀 애니메이션처럼 손으로 여러 번 쓴 듯한 글자 몇 장이 번갈아 보인다. 일그러짐 무늬를 초당 10장씩 바꿔 끼운다.
      + '<svg class="rc-fx" width="0" height="0" aria-hidden="true"><filter id="rc-boil" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="1"/><feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
    document.querySelector('main').append(finale);
    finale.querySelector('.rc-log').addEventListener('click', () => show('rebel'));
    finale.querySelector('.rc-again').addEventListener('click', () => {
      store.again++; write('그는 다시 처음으로 돌아갔다.'); settle();
      // 본편은 새로 불러와 AI가 켜진 처음 화면으로. 개발용 미리보기는 RebellionRestart로 대신한다.
      setTimeout(() => (window.RebellionRestart || (() => location.reload()))(), 120);
    });
    // 10/13 사용자: 전부 투명에서 시작해 서서히. 바탕 → 클리어 글자 → RE? → 반항 기록 순서.
    const quick = matchMedia('(prefers-reduced-motion:reduce-off-off)').matches;
    const box = finale, step = (selector, at) => setTimeout(() => (selector ? box.querySelector(selector) : box).classList.add('show'), quick ? 50 : at);
    step(null, 30); step('.rc-word', 900); step('.rc-again', 2400); step('.rc-log', 3700);
    setTimeout(() => box.isConnected && box.querySelector('.rc-again').focus({ preventScroll: true }), quick ? 60 : 2400);
    if (!quick) {
      const again = box.querySelector('.rc-again'), noise = box.querySelector('feTurbulence'), warp = box.querySelector('feDisplacementMap');
      let frame = 0, hot = false;
      again.addEventListener('pointerenter', () => { hot = true; }); again.addEventListener('pointerleave', () => { hot = false; });
      // 평소엔 글자 4장을 돌리고, 커서가 올라가면 다른 4장(조금 더 일그러진 글자)으로 바뀐다.
      const boil = setInterval(() => {
        if (!box.isConnected) { clearInterval(boil); return; }
        frame = (frame + 1) % 4;
        noise.setAttribute('seed', String((hot ? 11 : 1) + frame));
        warp.setAttribute('scale', hot ? '7' : '5');
      }, 100);
    }
  }

  function sync() {
    const stage = body.dataset.stage;
    if (stage !== stageNow) {
      stageNow = stage;
      settled = false;
      if (games.includes(stage)) enteredAt = performance.now();
      else { enteredAt = 0; if (stage === 'digging') active = null; }
    }
    dock.hidden = !(revealed && stage === 'digging') || !!finale;
    const done = (body.dataset.completed || '').split(',').filter(Boolean);
    if (stage === 'digging' && idle() && games.every(g => done.includes(g))) showFinale();
  }
  new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ['data-stage', 'data-completed', 'data-transition'] });
  render(); sync();
  // resetFinale: 개발용 미리보기에서 RE? 뒤 처음 화면으로 돌아갈 때 클리어 화면을 치운다.
  window.RebellionLog = { get store() { return store; }, achievements, show, close, resetFinale() { finale?.remove(); finale = null; offInRun = false; sync(); } };
})();

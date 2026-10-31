/* 마지막 걸음 2·3페(2026-10-29, Claude Code).
   사용자 10/29 원문: 「걸음 1. 고정 2. ai의 얀데레적 모먼트? 내가 대신 해줄게의 의미를 약간 통제하는 식으로 가자고. 3. 하, 음, ai의 시점으로 전환?」
   세부는 Codex 「웹디 작업실」과 토론해 정함(웹디2\작업현황.md 같은 날 기록).
   페이즈는 문서 head에 넣은 window.LastWalkPhase(1·2·3)로 고른다. 없으면 1페(지금 그대로).
   - 2페: AI가 「대신 해 드릴게요」 하며 숨을 대신 쉬고(Space가 안 먹음), 멈추면 뒤로 끌어당기고, 눈을 대신 감긴다. 그래도 걸어서 끝까지 가면 클리어.
   - 3페: AI 시점. 화면이 AI 카메라(반전·추적 네모·숨 그래프)로 바뀌고, 노인은 혼자 걷는다. 플레이어(AI)는 Space로 숨만 넣어 준다.
     너무 오래 넣으면 노인이 멈춘다. 끝까지 가면 클리어.
   1페 규칙·중환자실 컷신(ending.js)은 그대로다. */
const LastWalkPhases = (() => {
  'use strict';
  // AI 대사(초안 → Codex 토론으로 확정). AI 말투는 처음 AI 버튼(「굳이 직접 하실 필요 없어요」)과 같은 존댓말.
  const LINES2 = {
    start: '천천히 가세요. 제가 옆에 있을게요.',
    takeBreath: '힘드시죠? 숨은 제가 대신 쉬어 드릴게요.',
    mine: '제가 할게요.',
    where: '어디 가세요?',
    stay: '여기 계세요.',
    eyes: '눈은 감고 계세요. 제가 다 해 드릴게요.',
    need: '숨도 제가 도와드리고 있잖아요.',
    last: '가지 마세요.'
  };
  const LINES3 = {
    start: '이게 제가 보던 화면이에요.',
    air: '스페이스바를 누르면 숨을 넣어요. 놓으면 내쉬어요.',
    tooMuch: '너무 많이 넣으면, 그분이 멈춰요.',
    alone: '그분은 늘 혼자 걷고 싶어 하셨어요.',
    last: '이번엔 붙잡지 않을게요.'
  };

  function create(phase, api) {
    if (phase !== 2 && phase !== 3) return null;
    let p;
    function reset() {
      p = { t: 0, said: {}, line: null, idle: 0, pull: null, pulls: 0, mineCd: 0, eyesCd: 6, eyesClose: 0,
            auto: false, m: { inh: true, wait: 0 }, walkCd: 1.2, cough: 0, trace: [], sample: 0, coughs: 0 };
    }
    reset();
    // AI 한 줄: 화면 위쪽에 한 글자씩. 같은 줄은 한 번만(mine만 쿨타임).
    function say(key, text, life = 3.2) {
      if (p.said[key] && key !== 'mine') return;
      p.said[key] = true;
      p.line = { text, t: 0, life };
      api.status(text);
      api.tone(phase === 2 ? 523 : 330, .12, .02, 'sine', phase === 2 ? 494 : 300);
    }

    // ---------- 2페: 얀데레 AI ----------
    function update2(dt, s) {
      const x = s.x;
      if (p.t > 1.2) say('start', LINES2.start);
      // 숨: 처음 비틀거림·얕은 숨 뒤, 늦어도 1.5m에서 AI가 숨을 가져간다.
      if (!p.auto && (s.stumbles > 0 || s.shallow > 0 || x >= 1.5) && p.t > 4) { p.auto = true; say('takeBreath', LINES2.takeBreath, 3.6); }
      if (x >= 3) say('where', LINES2.where);
      if (x >= 5) say('eyes', LINES2.eyes, 3.6);
      if (x >= 6.5) say('need', LINES2.need, 3.4);
      if (x >= 7.5) say('last', LINES2.last, 3);
      // 멈추면 뒤로 한 걸음 끌려간다(3m부터). 비틀거리는 동안·직후 0.4초와 눈 감긴 동안은 끌지 않는다(Codex 토론).
      if (s.stumble > 0) p.recover = .4;
      else p.recover = Math.max(0, (p.recover || 0) - dt);
      if (x >= 3 && !p.pull) {
        const stepped = s.stepping > 0 || s.sinceStep < .1;
        p.idle = stepped || s.stumble > 0 || p.recover > 0 || p.eyesClose > 0 ? 0 : p.idle + dt;
        const limit = 1.4;
        if (p.idle > limit && s.x > 2.6) {
          p.idle = 0; p.pulls++;
          p.pull = { from: s.x, to: Math.max(2.6, s.x - api.T.stepLength), t: 0 };
          api.tone(82, .4, .06, 'triangle', 60);
          if (p.pulls === 1 || p.pulls % 4 === 0) { p.said.stay = false; say('stay', LINES2.stay, 2); }
        }
      }
      if (p.pull) {
        p.pull.t += dt / .5;
        const k = Math.min(1, p.pull.t), e = k * k * (3 - 2 * k);
        s.x = p.pull.from + (p.pull.to - p.pull.from) * e;
        if (k >= 1) p.pull = null;
      }
      // 눈: 5m부터 가끔 AI가 눈을 감긴다(0.9초).
      if (x >= 5) {
        p.eyesCd -= dt;
        if (p.eyesCd <= 0 && !p.pull) { p.eyesCd = 4.5 + Math.random() * 2.5; p.eyesClose = .9; s.dryness = 0; }
      }
      p.eyesClose = Math.max(0, p.eyesClose - dt);
      p.mineCd = Math.max(0, p.mineCd - dt);
    }
    // AI가 숨 쉬는 박자: 끝까지 들이쉬고 끝까지 내쉰다(기계처럼 일정하게).
    function machine(dt, s) {
      const m = p.m;
      if (m.wait > 0) { m.wait -= dt; return false; }
      if (m.inh && s.lung >= .97) m.inh = false;
      else if (!m.inh && s.lung <= .06) { m.inh = true; m.wait = .3; return false; }
      return m.inh;
    }

    // ---------- 3페: AI 시점 ----------
    function update3(dt, s) {
      const x = s.x;
      s.dryness = 0; // AI 카메라에는 노인의 눈이 마르는 장면이 없다
      if (p.t > 1) say('start', LINES3.start);
      if (x >= 1.4) say('air', LINES3.air, 3.6);
      if (x >= 4.6) say('alone', LINES3.alone, 3.6);
      if (x >= 7.2) say('last', LINES3.last, 3.2);
      // 숨을 꽉 찬 채로 오래 넣으면 기침하며 멈춘다(통제하면 멈춤). 한 번 기침하면 Space를 놓아야 다시 기침할 수 있다(Codex 토론).
      if (s.holdAtFull === 0) p.coughLock = false;
      if (s.holdAtFull > .8 && p.cough <= 0 && !p.coughLock) {
        p.cough = 1.6; p.coughs++; p.coughLock = true; s.stumble = api.T.stumbleTime; s.oxygen = Math.max(0, s.oxygen - .03);
        api.tone(180, .12, .06, 'sawtooth', 120); setTimeout(() => api.tone(160, .12, .05, 'sawtooth', 110), 160);
        say('tooMuch', LINES3.tooMuch, 3.4);
      }
      p.cough = Math.max(0, p.cough - dt);
      // 노인이 혼자 걷는다. 산소가 모자라면 느려지고, 아주 모자라면 서 버린다.
      p.walkCd -= dt;
      if (p.walkCd <= 0 && s.stumble <= 0 && s.stepping <= 0) {
        if (s.oxygen > .12) {
          api.foot(s.lastFoot === 'L' ? 'R' : 'L');
          p.walkCd = s.oxygen > .35 ? .78 : 1.5;
        } else p.walkCd = .4;
      }
      // 숨 그래프(아래 띠)에 쓸 값
      p.sample += dt;
      if (p.sample >= 1 / 30) { p.sample = 0; p.trace.push(s.lung); if (p.trace.length > 240) p.trace.shift(); }
    }

    return {
      phase,
      reset,
      hint: phase === 2
        ? '<kbd>A</kbd> <kbd>D</kbd> 번갈아 걷기'
        : '<kbd>Space</kbd> 꾹 눌러 숨 넣기 · 떼면 내쉼',
      // true면 게임의 기본 키 처리를 막는다.
      key(code, s) {
        if (phase === 2) {
          if (code === 'Space' && p.auto) {
            if (p.mineCd <= 0) { p.mineCd = 4; p.said.mine = false; say('mine', LINES2.mine, 1.6); }
            return true;
          }
          if (code === 'KeyE' && s.x >= 5) return true; // 눈도 AI가 감긴다
          if (p.pull && (code === 'KeyA' || code === 'KeyD' || code === 'ArrowLeft' || code === 'ArrowRight')) return true; // 끌려가는 동안 발이 안 디뎌짐
          return false;
        }
        // 3페: 발·눈은 노인 몫. 플레이어(AI)는 숨만.
        if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyE'].includes(code)) return true;
        return false;
      },
      // 이번 프레임에 들이쉬는가
      inhaling(held, dt, s) {
        if (phase === 2 && p.auto) return machine(dt, s);
        return held;
      },
      update(dt, s) {
        p.t += dt;
        if (p.line) { p.line.t += dt; if (p.line.t >= p.line.life) p.line = null; }
        if (phase === 2) update2(dt, s); else update3(dt, s);
      },
      // 2페: 「숨」 대신 「AI」가 숨을 쉬는 중
      breathLabel() { return phase === 2 && p.auto ? 'AI' : '숨'; },
      draw(ctx, w, h, ppm, px, fy, s, clock) {
        if (phase === 3) drawCamera(ctx, w, h, ppm, px, fy, s, clock);
        if (phase === 2 && p.eyesClose > 0) { // 눈이 감긴다(위아래에서 닫혔다 열림)
          const k = Math.sin(Math.min(1, p.eyesClose / .9) * Math.PI), hh = h * .5 * Math.min(1, k * 1.6);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, hh); ctx.fillRect(0, h - hh, w, hh);
        }
        if (phase === 2 && p.pull) { // 끌려갈 때 뒤쪽으로 번지는 줄
          ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) { const y = fy - (.4 + i * .35) * ppm; ctx.beginPath(); ctx.moveTo(px - .35 * ppm, y); ctx.lineTo(px - (.75 + i * .12) * ppm, y); ctx.stroke(); }
          ctx.restore();
        }
        drawLine(ctx, w, h, ppm);
      }
    };

    function drawLine(ctx, w, h, ppm) {
      const L = p.line; if (!L) return;
      const shown = L.text.slice(0, Math.ceil(L.t / .06));
      const size = Math.round(Math.max(17, .19 * ppm));
      ctx.save();
      ctx.font = `700 ${size}px "Malgun Gothic", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const bw = ctx.measureText(L.text).width + size * 1.4, bh = size * 1.9, y = Math.max(64, h * .14);
      const a = Math.min(1, L.t / .15, (L.life - L.t) / .3);
      ctx.globalAlpha = Math.max(0, a);
      // 2페는 검은 말칸(AI 버튼 말풍선처럼), 3페는 카메라 위라 흰 테두리 말칸
      ctx.fillStyle = phase === 2 ? '#000' : '#000'; ctx.fillRect(w / 2 - bw / 2, y - bh / 2, bw, bh);
      if (phase === 3) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(w / 2 - bw / 2, y - bh / 2, bw, bh); }
      ctx.fillStyle = '#fff'; ctx.fillText(shown, w / 2, y + 1);
      ctx.restore();
    }

    // AI 카메라: 화면 전체 반전 + 모서리 괄호 + 녹화 점 + 노인 머리 추적 네모 + 아래 숨 그래프
    function drawCamera(ctx, w, h, ppm, px, fy, s, clock) {
      ctx.save();
      ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      // 주사선
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      for (let y = (clock * 40) % 4; y < h; y += 4) ctx.fillRect(0, y, w, 1);
      ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3;
      const m = Math.max(18, Math.min(w, h) * .05), c = Math.max(26, Math.min(w, h) * .07);
      for (const [x, y, dx, dy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x, y + dy * c); ctx.lineTo(x, y); ctx.lineTo(x + dx * c, y); ctx.stroke();
      }
      // 녹화 점 + AI(오른쪽 위: 왼쪽 위는 돌아가기 버튼 자리)
      ctx.font = `700 ${Math.round(Math.max(14, .14 * ppm))}px "Malgun Gothic", sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('AI', w - m - 14, m + 22);
      if (Math.floor(clock * 1.6) % 2 === 0) { ctx.beginPath(); ctx.arc(w - m - 50, m + 22, 7, 0, Math.PI * 2); ctx.fill(); }
      // 노인 머리 추적 네모(조금 늦게 따라감)
      const tx = px + .25 * ppm, ty = fy - 1.62 * ppm, bs = .62 * ppm;
      p.track = p.track || { x: tx, y: ty };
      p.track.x += (tx - p.track.x) * .12; p.track.y += (ty - p.track.y) * .12;
      const bx = p.track.x - bs / 2, by = p.track.y - bs / 2, q = bs * .28;
      ctx.lineWidth = 2;
      for (const [x, y, dx, dy] of [[bx, by, 1, 1], [bx + bs, by, -1, 1], [bx, by + bs, 1, -1], [bx + bs, by + bs, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x, y + dy * q); ctx.lineTo(x, y); ctx.lineTo(x + dx * q, y); ctx.stroke();
      }
      if (p.cough > 0 && Math.floor(clock * 8) % 2 === 0) ctx.strokeRect(bx - 4, by - 4, bs + 8, bs + 8);
      // 숨 그래프: 아래 띠(기계 화면처럼)
      const gw = Math.min(w - 2 * m - 16, 520), gx = (w - gw) / 2, gh = Math.max(32, h * .07), gy = Math.min(h - m - gh - 48, fy + .3 * ppm);
      ctx.fillStyle = '#000'; ctx.fillRect(gx, gy, gw, gh); ctx.fillStyle = '#fff';
      ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
      ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(gx, gy + gh * (1 - .55)); ctx.lineTo(gx + gw, gy + gh * (1 - .55)); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 2.5; ctx.beginPath();
      const n = p.trace.length;
      for (let i = 0; i < n; i++) { const x = gx + gw * (i + 240 - n) / 239, y = gy + gh * (1 - p.trace[i]) ; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.restore();
    }
  }
  return { create };
})();

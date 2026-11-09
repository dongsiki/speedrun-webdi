  // ── 5장. 판정: 부딪힘·실 풀림·통과·끝 ──
  // ---- 판정 ------------------------------------------------------------------------------
  const tipR = () => (1.6 + st.fray * 1.9) * s;
  function say(text) { status.textContent = text; }
  function bump() {
    st.bumps++; st.cool = T.bumpCooldown; st.fray++; tick(); st.guideSeen = true;
    if (st.fray >= T.frayMax) snip(); else say(st.fray === 1 ? '실 끝이 바늘에 걸려 풀렸습니다.' : '실 끝이 더 풀렸습니다.');
  }
  function snip() {
    st.fray = 0; st.notches--; st.cuts++; st.snipT = .55; snipSound();
    st.bits.push({ x: st.tip.x - 4 * s + rand() * 8 * s, y: H * (.9 + rand() * .07), a: rand() * TAU, k: rand() });
    st.hand.x -= 30 * s; st.threading = false;
    if (st.notches <= 0) { finish('fail'); return; }
    say(`풀린 끝을 잘랐습니다. 실이 ${st.notches}번 자를 만큼 남았습니다.`);
  }
  function finish(kind) {
    if (st.phase !== 'play') return;
    st.phase = kind === 'complete' ? 'pulled' : 'failed'; st.endT = 0; st.holding = false;
    if (kind === 'complete') { throughSound(); const left = T.passes - st.done - 1; say(left > 0 ? `실을 꿰었습니다. ${left}번 더 꿰어야 합니다.` : '실을 세 번 다 꿰었습니다.'); }
    else say('실이 다 닳았습니다.');
  }
  // 한 번 꿴 뒤: 꿴 실은 바늘귀에 남기고, 손을 처음 자리로 돌려 새 실 끝으로 다시 시작한다.
  function nextPass() {
    st.strands.push({ x: st.tip.x, y: st.tip.y + st.pull * 18 * s });
    st.done++;
    st.phase = 'play'; st.endT = 0; st.pull = 0; st.fray = 0; st.threading = false; st.side = 'L';
    st.holding = false; st.holdT = 0;
    st.hand = { x: W * .34, y: geo.eyeY + 60 * s }; st.target = { ...st.hand }; st.tip = { ...st.hand };
  }
  function report(kind) {
    if (st.reported) return; st.reported = true;
    const ms = Math.round(performance.now() - st.start);
    parent.postMessage({ channel, type: 'needle-result', outcome: kind, held: st.everHeld, bumps: st.bumps, cuts: st.cuts, ms }, '*');
    parent.postMessage({ channel, type: kind }, '*');
    if (dev) { again.hidden = false; again.focus({ preventScroll: true }); }
  }
  again.addEventListener('click', () => { again.hidden = true; st = fresh(); layout(); canvas.focus({ preventScroll: true }); say(''); });

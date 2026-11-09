  // ── 6장. 그림: 길과 노인 몸 그리기 ──
  // ---------- drawing (1-bit) ----------
  const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16);
  const veil = document.createElement('canvas'), veilCtx = veil.getContext('2d');
  let veilImage = null;
  function edgeVeil(amount, black) {
    if (amount <= .004) return;
    const cell = 3, w = Math.ceil(width / cell), h = Math.ceil(height / cell);
    if (veil.width !== w || veil.height !== h) { veil.width = w; veil.height = h; veilImage = veilCtx.createImageData(w, h); }
    const d = veilImage.data, v = black ? 0 : 255, front = 1 - amount * .85;
    for (let y = 0; y < h; y++) {
      const ny = Math.abs(y / (h - 1) * 2 - 1);
      for (let x = 0; x < w; x++) {
        const nx = Math.abs(x / (w - 1) * 2 - 1), r = Math.pow(nx ** 4 + ny ** 4, .25), i = (y * w + x) * 4;
        const on = r > front + (bayer[(y & 3) * 4 + (x & 3)] - .5) * .35;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = on ? 255 : 0;
      }
    }
    veilCtx.putImageData(veilImage, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(veil, 0, 0, width, height); ctx.restore();
  }
  function line(x1, y1, x2, y2, w = 2) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function rect(x, y, w, h, lw = 2) { ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
  const floorY = () => height * .78;
  const sx = (wx, camX) => (wx - camX) * ppm + width * .32;

  function drawWorld(camX) {
    const fy = floorY(), ceil = fy - 2.7 * ppm;
    ctx.strokeStyle = '#000'; ctx.fillStyle = '#000';
    const from = camX - 4, to = camX + 8;
    // Corridor (inside) until the exit door, street outside after it.
    const inEnd = Math.min(to, T.exitAt);
    if (from < T.exitAt) {
      line(sx(Math.max(from, -2), camX), fy, sx(inEnd, camX), fy, 3);
      line(sx(Math.max(from, -2), camX), ceil, sx(inEnd, camX), ceil, 2);
      line(sx(Math.max(from, -2), camX), fy - .9 * ppm, sx(inEnd, camX), fy - .9 * ppm, 4); // handrail
      for (let d = Math.ceil(from / 3) * 3; d < Math.min(to, T.exitAt - 1); d += 3) {
        if (d < 0) continue;
        const x = sx(d + .6, camX); rect(x, fy - 2.1 * ppm, ppm, 2.1 * ppm, 2);
        rect(x + .3 * ppm, fy - 1.75 * ppm, .4 * ppm, .5 * ppm, 2);
        line(x + .82 * ppm, fy - 1.0 * ppm, x + .92 * ppm, fy - 1.0 * ppm, 3);
      }
      // Exit door (open) with sign
      const ex = sx(T.exitAt - 1, camX);
      rect(ex, fy - 2.1 * ppm, ppm, 2.1 * ppm, 4);
      ctx.fillRect(ex + .2 * ppm, fy - 2.5 * ppm, .6 * ppm, .28 * ppm);
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(.17 * ppm)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', ex + .5 * ppm, fy - 2.36 * ppm); ctx.fillStyle = '#000';
      line(sx(T.exitAt, camX), ceil, sx(T.exitAt, camX), fy - 2.1 * ppm, 3);
    }
    if (to > T.exitAt) {
      const a = Math.max(from, T.exitAt);
      // sidewalk then curb drop and road
      line(sx(a, camX), fy, sx(Math.min(to, T.curbAt), camX), fy, 3);
      if (to > T.curbAt) {
        line(sx(T.curbAt, camX), fy, sx(T.curbAt, camX), fy + .15 * ppm, 3);
        line(sx(T.curbAt, camX), fy + .15 * ppm, sx(to, camX), fy + .15 * ppm, 3);
        for (let z = T.curbAt + .5; z < Math.min(to, T.roadEnd); z += .9) ctx.fillRect(sx(z, camX), fy + .15 * ppm + 2, .45 * ppm, .07 * ppm);
      }
      // houses and a traffic light, outlines only
      for (let hx = T.exitAt + 1; hx < T.curbAt - 1; hx += 3.2) {
        if (hx + 2.4 < from || hx > to) continue;
        const x = sx(hx, camX), w = 2.4 * ppm, h = 2.2 * ppm;
        rect(x, fy - h - .8 * ppm, w, h, 1.5);
        line(x - .1 * ppm, fy - h - .8 * ppm, x + w / 2, fy - h - 1.6 * ppm, 1.5); line(x + w / 2, fy - h - 1.6 * ppm, x + w + .1 * ppm, fy - h - .8 * ppm, 1.5);
      }
      const lx = sx(T.curbAt - .4, camX); line(lx, fy, lx, fy - 2.6 * ppm, 4); rect(lx - .14 * ppm, fy - 3.1 * ppm, .28 * ppm, .55 * ppm, 3);
    }
  }
// Kinematic cutout rigs: the renderer follows the game state; it does not own it.
const elderArt = createLastWalkArtwork(LIMB_MODEL_ART, false);
const P = (x,y) => ({x,y});
function bodyAt(p,angle=0) {
  return {getPosition:()=>p,getAngle:()=>angle,getWorldPoint:q=>P(p.x+q.x*Math.cos(angle)-q.y*Math.sin(angle),p.y+q.x*Math.sin(angle)+q.y*Math.cos(angle))};
}
function segment(a,b) {
  return bodyAt(P((a.x+b.x)/2,(a.y+b.y)/2), Math.atan2(-(a.x-b.x),a.y-b.y));
}
const anchor = p => ({getAnchorA:()=>p});
function solveKnee(hip,foot,upper,lower) {
  const dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.min(Math.hypot(dx,dy),upper+lower-.002);
  const along=(upper*upper-lower*lower+d*d)/(2*d), side=Math.sqrt(Math.max(0,upper*upper-along*along));
  const len=Math.hypot(dx,dy)||1;
  return P(hip.x+dx/len*along-dy/len*side,hip.y+dy/len*along+dx/len*side);
}
function rigAt({hip,shoulder,neck,head,feet,elbows,hands,child=false,tilt=0,headTilt=tilt}) {
  const dims=child?{thigh:.28,shin:.27}:{thigh:.405,shin:.39};
  const bodies={pelvis:bodyAt(hip,tilt*.35),torso:bodyAt(P((hip.x+shoulder.x)/2,(hip.y+shoulder.y)/2),tilt),head:bodyAt(head,headTilt)};
  const limbs={};
  for(const [i,key] of ['o','p'].entries()) {
    const top=P(hip.x+(i? .025:-.025),hip.y-.015),ank=feet[i];
    const knee=solveKnee(top,ank,dims.thigh,dims.shin);
    limbs[key]={primary:anchor(top),secondary:anchor(knee),ankle:anchor(ank),upper:{body:segment(top,knee)},lower:{body:segment(knee,ank)},tip:bodyAt(P(ank.x+.03,ank.y-.015))};
  }
  for(const [i,key] of ['q','w'].entries()) {
    const top=P(shoulder.x+(i?.035:-.035),shoulder.y-.03);
    limbs[key]={primary:anchor(top),secondary:anchor(elbows[i]),upper:{body:segment(top,elbows[i])},lower:{body:segment(elbows[i],hands[i])},tip:bodyAt(hands[i],child?segment(elbows[i],hands[i]).getAngle():.2)};
  }
  return {bodies,limbs,joints:{neck:anchor(neck)},cane:{held:!child}};
}
function drawElder(px,fy) {
  const move=s.stepping>0, t=move?1-s.stepping/T.stepTime:0;
  const lift=Math.sin(t*Math.PI),stumble=s.stumble>0;
  const sway=stumble&&!reducedQuery.matches?Math.sin(s.stumble*18)*.075:0;
  const rise=s.lung*.014,hip=P(sway,.84-(stumble?.1:0)+rise);
  const tilt=-(.14+(stumble?.13:0)),shoulder=P(hip.x+.08+(stumble?.06:0),hip.y+.49);
  const neck=P(shoulder.x+.035,shoulder.y+.055),head=P(neck.x+.055,neck.y+.166);
  const feet=['L','R'].map((which,i)=> {
    const active=move&&s.stepFoot===which;
    const x=active?-.14+.28*t:(!s.lastFoot?(i?.08:-.10):s.lastFoot===which?.14:-.14);
    return P(x+hip.x,.075+(active?.13*lift:0));
  });
  const hands=[P(shoulder.x+.31,hip.y+.10),P(shoulder.x+.025,hip.y-.025)];
  const elbows=[P(shoulder.x+.25,shoulder.y-.14),P(shoulder.x+.08,shoulder.y-.29)];
  const rig=rigAt({hip,shoulder,neck,head,feet,hands,elbows,tilt});
  const project=p=>P(px+p.x*ppm,fy-p.y*ppm);
  elderArt.drawFigure(ctx,rig,project,ppm,()=> {
    const hand=project(hands[0]),tip=project(P(hands[0].x+.12,.015));
    ctx.strokeStyle='#000';ctx.lineWidth=Math.max(2,ppm*.023);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(hand.x-.028*ppm,hand.y-.01*ppm);
    ctx.quadraticCurveTo(hand.x+.067*ppm,hand.y-.07*ppm,hand.x+.062*ppm,hand.y+.07*ppm);
    ctx.lineTo(tip.x,tip.y);ctx.stroke();
    ctx.fillStyle='#000';ctx.fillRect(tip.x-.023*ppm,fy-.016*ppm,.046*ppm,.016*ppm);
  });
}
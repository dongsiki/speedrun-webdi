// 2026-11-17 Claude Code. 개발자용 02에만 쓰는 할배 숨소리(assets/audio/phase3/breath.mp3)를 처음부터 합성한다.
// 사용자(코디네이터 되묻기에 「ㅇㅇ」): 매뉴얼 사무엘의 소리 파일은 가져오지 않고 「그 느낌」으로 새로 만든다.
//   → 귀 바로 옆에서 들리는 늙은 사람의 무겁고 느린 숨: 쉰 소리 섞인 들숨, 가래 끓는 듯 그르렁거리는 날숨, 사이사이 멈춤.
//   ① 3페 시작 첫 점프스케어 뒤 까만 화면 ② 02 어디서든 아무 소리도 안 날 때, 두 곳에 이 소리 하나를 쓴다.
// 실행: 웹디2/github 에서  node src/phase/phase3/make-breath.cjs   (ffmpeg로 MP3까지 만든다. 다시 돌려도 같은 소리: 난수 씨앗 고정)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const SR = 44100, out = path.join(__dirname, '../../../assets/audio/phase3');
const FFMPEG = 'C:/Users/admin/Documents/Codex/2026-09-12/unfriendly-digging-prototype/work/elder-dance/encoder/package/ffmpeg.exe';

let seed = 20261117;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;
// 2차 필터(RBJ). type: lp / bp / hp
function biquad(type, f, q) {
  const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = a; b1 = 0; b2 = -a; }
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f0 = b0 / a0, f1 = b1 / a0, f2 = b2 / a0, g1 = a1 / a0, g2 = a2 / a0;
  return x => { const y = f0 * x + f1 * x1 + f2 * x2 - g1 * y1 - g2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 숨 한 번 = 들숨 → 짧게 멈춤 → 날숨 → 쉼. 세 번을 조금씩 다르게(길이·세기·그르렁).
const cycles = [
  { inh: 1.45, hold: .22, exh: 2.05, rest: .75, gain: 1, rattle: .55 },
  { inh: 1.25, hold: .16, exh: 2.35, rest: .95, gain: .9, rattle: .85 },
  { inh: 1.6, hold: .3, exh: 1.85, rest: .7, gain: 1.05, rattle: .4 }
];
const total = cycles.reduce((s, c) => s + c.inh + c.hold + c.exh + c.rest, 0);
const N = Math.round(total * SR), buf = new Float32Array(N);

// 들숨: 입으로 들이켜는 쉭 소리(높은 쪽) + 끝에 가늘게 새는 쌕쌕 소리
const inBody = [biquad('bp', 1350, .9), biquad('bp', 2600, 1.4)], inLp = biquad('lp', 5200, .7), inHp = biquad('hp', 260, .7);
const wheeze = biquad('bp', 1850, 28);
// 날숨: 목에서 긁히는 낮은 소리(쉰 소리) + 가래 그르렁 + 아주 작은 목소리 울림(끙)
const exBody = [biquad('bp', 520, 1.1), biquad('bp', 1150, 1.6)], exLp = biquad('lp', 2600, .7), exHp = biquad('hp', 120, .7);
const rattleBp = biquad('bp', 310, 2.2), groanF1 = biquad('bp', 480, 4), groanF2 = biquad('bp', 900, 5);
const room = biquad('lp', 7000, .7);
let gPhase = 0, rPhase = 0, crack = 0;

let t0 = 0;
for (const c of cycles) {
  const a = Math.round(t0 * SR), inEnd = c.inh, exStart = c.inh + c.hold, exEnd = exStart + c.exh;
  const len = Math.round((c.inh + c.hold + c.exh + c.rest) * SR);
  for (let i = 0; i < len && a + i < N; i++) {
    const t = i / SR;
    let s = 0;
    // 들숨
    if (t < inEnd + .05) {
      const p = t / c.inh;
      const env = smooth(0, .35, p) * (1 - smooth(.82, 1.02, p)) * (.75 + .25 * Math.sin(p * Math.PI));
      const n = noise();
      let v = inBody[0](n) * .9 + inBody[1](n) * .5;
      v = inHp(inLp(v));
      const wz = wheeze(noise()) * smooth(.45, .8, p) * (1 - smooth(.9, 1, p)) * 2.2;
      s += (v * 1.25 + wz) * env * .5;
    }
    // 날숨
    if (t > exStart - .02 && t < exEnd + .1) {
      const p = (t - exStart) / c.exh;
      const env = smooth(0, .12, p) * (1 - smooth(.55, 1.05, p)) * (1.1 - .35 * p);
      // 쉰 소리: 25~38Hz로 거칠게 흔들어 그르렁거리게
      rPhase += 2 * Math.PI * (27 + 9 * Math.sin(t * 3.1 + c.rattle * 7)) / SR;
      const grit = .45 + .55 * Math.abs(Math.sin(rPhase)) ** 1.6;
      const n = noise();
      let v = exBody[0](n) * 1.1 + exBody[1](n) * .55;
      v = exHp(exLp(v)) * grit;
      // 가래: 날숨 앞쪽에 띄엄띄엄 톡톡 끓는 소리
      if (rnd() < .0035 * c.rattle * (1 - p)) crack = 1;
      crack *= .992;
      const rat = rattleBp(noise() * crack) * 3.2 * c.rattle * smooth(0, .1, p) * (1 - smooth(.5, .8, p));
      // 끙: 95Hz 아래로 처지는 아주 작은 목 울림(날숨 첫머리만)
      gPhase += 2 * Math.PI * (98 - 14 * p + 2 * Math.sin(t * 31)) / SR;
      const buzz = ((gPhase / Math.PI) % 2) - 1;
      const groan = (groanF1(buzz) * .9 + groanF2(buzz) * .4) * smooth(0, .08, p) * (1 - smooth(.18, .45, p)) * .55;
      s += (v * 1.35 + rat + groan) * env * .55;
    }
    buf[a + i] += s * c.gain;
  }
  t0 += c.inh + c.hold + c.exh + c.rest;
}
// 귀 옆 공기감: 아주 작은 바닥 소음(이어 붙일 때 뚝 끊기지 않게 처음과 끝 같은 크기)
for (let i = 0; i < N; i++) buf[i] = room(buf[i] + noise() * .0025);
// 고르기: 가장 큰 소리를 -3dB 근처로
let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const k = .7 / peak;
// 처음·끝 20ms 페이드(반복 재생 이음새)
const fadeN = Math.round(.02 * SR);
const pcm = Buffer.alloc(44 + N * 2);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const f = Math.min(1, i / fadeN, (N - 1 - i) / fadeN);
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * k * f * 32767))), 44 + i * 2);
}
const wav = path.join(out, 'breath.44k.wav'), mp3 = path.join(out, 'breath.mp3');
fs.writeFileSync(wav, pcm);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '5', '-ac', '1', '-ar', '22050', mp3]);
fs.unlinkSync(wav);
console.log('breath.mp3', total.toFixed(2) + 's', fs.statSync(mp3).size + ' bytes');

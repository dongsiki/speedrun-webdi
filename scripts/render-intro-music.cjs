/* 인트로 음악을 들어 볼 수 있는 wav로 뽑는다(게임은 이 파일을 쓰지 않고 브라우저에서 직접 합성).
   사용: node scripts/render-intro-music.cjs <출력 폴더>
   - intro-music-clean.wav : 1페이즈(첫 인트로) 그대로
   - intro-music-glitch-demo.wav : 2페이즈 이후처럼 중간중간 깨지는 예시 */
const fs = require('node:fs');
const path = require('node:path');
const { renderSync, datamosh } = require('../src/intro/intro-music.js');

const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'test-results', 'intro-music'));
fs.mkdirSync(out, { recursive: true });
const sr = 44100;
const t0 = Date.now();
const clean = renderSync(sr);
const ms = Date.now() - t0;
const mosh = datamosh(clean);

function wav(file, L, R) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(out, file), buf);
}
wav('intro-music-clean.wav', clean.L, clean.R);

// 글리치 예시: 게임의 intro-glitch와 비슷한 간격으로 깨진 소리판을 끼우고, 가끔 같은 조각을 되풀이(멈칫).
const L = Float32Array.from(clean.L), R = Float32Array.from(clean.R);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let t = 0.9;
while (t < 9.6) {
  const amount = Math.min(1, 0.25 + (t / 10) * 0.6);
  const dur = (70 + rnd() * (160 + amount * 380)) / 1000;
  const a = Math.floor(t * sr), b = Math.min(L.length, Math.floor((t + dur) * sr));
  if (rnd() < 0.4) { // 멈칫: 같은 조각 반복
    const len = Math.floor((0.05 + rnd() * 0.08) * sr);
    for (let i = a; i < b; i++) { const s = a - len + ((i - a) % len); L[i] = mosh.L[Math.max(0, s)]; R[i] = mosh.R[Math.max(0, s)]; }
  } else for (let i = a; i < b; i++) { L[i] = mosh.L[i]; R[i] = mosh.R[i]; }
  t += dur + 0.5 + rnd() * (2.6 * (1 - amount) + 0.3);
}
wav('intro-music-glitch-demo.wav', L, R);
console.log(`합성 ${ms}ms, 저장: ${out}`);

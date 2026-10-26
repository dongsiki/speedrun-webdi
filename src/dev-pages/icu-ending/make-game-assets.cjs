// 중환자실 엔딩 그림·음성을 「마지막 걸음」 안에 넣을 수 있게 data URI 스크립트로 만듭니다.
// 실행: 깃허브 폴더에서 node src/dev-pages/icu-ending/make-game-assets.cjs
// 결과: src/stages/last-walk/ending-assets.js (game 템플릿이 @inline 으로 넣음)
// 음성은 용량을 줄이려고 44.1kHz → 22.05kHz(모노 16비트)로 낮춥니다.
const fs = require('node:fs');
const path = require('node:path');
const here = __dirname;
const out = path.resolve(here, '../../stages/last-walk/ending-assets.js');

function halfRateWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not wav');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') data = buf.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data || fmt.channels !== 1 || fmt.bits !== 16) return buf;
  const n = Math.floor(data.length / 4), pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round((data.readInt16LE(i * 4) + data.readInt16LE(i * 4 + 2)) / 2), i * 2);
  const rate = Math.round(fmt.rate / 2), head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
}

const img = {}, audio = {};
for (const f of fs.readdirSync(path.join(here, 'images')).filter(f => f.endsWith('.png')).sort())
  img[f.replace(/\.png$/, '')] = 'data:image/png;base64,' + fs.readFileSync(path.join(here, 'images', f)).toString('base64');
for (const f of fs.readdirSync(path.join(here, 'audio')).filter(f => f.endsWith('.wav')).sort())
  audio[f.replace(/\.wav$/, '')] = 'data:audio/wav;base64,' + halfRateWav(fs.readFileSync(path.join(here, 'audio', f))).toString('base64');

const text = '/* 자동 생성: src/dev-pages/icu-ending/make-game-assets.cjs — 직접 고치지 말 것. 그림 Codex 이미지 생성, 음성 Supertonic 3 F1. */\n' +
  'const LAST_WALK_ENDING_ASSETS=' + JSON.stringify({ img, audio }) + ';\n';
fs.writeFileSync(out, text);
console.log('wrote', path.relative(process.cwd(), out), (text.length / 1024 / 1024).toFixed(2) + 'MB', Object.keys(img).length, 'images', Object.keys(audio).length, 'voices');

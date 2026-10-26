// 44.1kHz 16비트 모노 wav를 22.05kHz로 줄인다(두 샘플 평균). 목소리는 그대로 들리고 용량은 절반.
// 사용: node wav-half.cjs 입력.wav 출력.wav
const fs = require('fs');
function half(src, dst) {
  const b = fs.readFileSync(src);
  let p = 12, fmt = null, data = null;
  while (p < b.length) { const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4); if (id === 'fmt ') fmt = b.subarray(p + 8, p + 8 + n); if (id === 'data') data = b.subarray(p + 8, p + 8 + n); p += 8 + n + (n & 1); }
  const rate = fmt.readUInt32LE(4), ch = fmt.readUInt16LE(2), bits = fmt.readUInt16LE(14);
  if (ch !== 1 || bits !== 16) throw new Error('mono 16-bit only: ' + src);
  if (rate <= 22050) { fs.copyFileSync(src, dst); return; }
  const n = Math.floor(data.length / 4), out = Buffer.alloc(44 + n * 2);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.round((data.readInt16LE(i * 4) + data.readInt16LE(i * 4 + 2)) / 2), 44 + i * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate / 2, 24); out.writeUInt32LE(rate, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  fs.writeFileSync(dst, out);
}
if (require.main === module) half(process.argv[2], process.argv[3]);
module.exports = half;

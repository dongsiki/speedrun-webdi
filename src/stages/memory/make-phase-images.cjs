// 기억 스테이지 페이즈 그림(Codex 제작, WebP)을 phase-images.js 한 파일로 묶는다(2026-10-29, Claude Code).
// 공용 manifest.json을 고치지 않으려고 그림을 이 스테이지 소스 안에 직접 넣는다.
// 실행: node src/stages/memory/make-phase-images.cjs   (그림: assets/images/memory-phase/*.webp)
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'assets/images/memory-phase');
const out = path.join(__dirname, 'phase-images.js');
const images = {};
// 2026-11-23 Claude Code: 2페 4회차 아빠 스킨(Codex 11/10 제작, PNG)도 그대로 묶는다. 다른 PNG(로봇 스킨 등)는 넣지 않는다.
const PNG_KEEP = ['dad-model-atlas.png'];
for (const file of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
  if (/\.webp$/i.test(file)) images[file.replace(/\.webp$/i, '')] = 'data:image/webp;base64,' + fs.readFileSync(path.join(dir, file)).toString('base64');
  else if (PNG_KEEP.includes(file)) images[file.replace(/\.png$/i, '')] = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, file)).toString('base64');
}
const text = '// 자동 생성(make-phase-images.cjs). 직접 고치지 말고 assets/images/memory-phase/의 WebP를 바꾼 뒤 다시 만든다.\n'
  + 'window.MemoryPhaseImages=' + JSON.stringify(images) + ';\n';
fs.writeFileSync(out, text);
console.log(Object.keys(images).length + ' images → ' + path.relative(root, out) + ' (' + text.length.toLocaleString('en-US') + ' bytes)');

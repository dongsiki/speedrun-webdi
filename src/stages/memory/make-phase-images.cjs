// 기억 스테이지 페이즈 그림(Codex 제작 PNG)을 phase-images.js 한 파일로 묶는다(2026-10-29, Claude Code).
// 공용 manifest.json을 고치지 않으려고 그림을 이 스테이지 소스 안에 직접 넣는다.
// 실행: node src/stages/memory/make-phase-images.cjs   (그림: assets/images/memory-phase/*.png)
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'assets/images/memory-phase');
const out = path.join(__dirname, 'phase-images.js');
const images = {};
for (const file of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
  if (!/\.png$/i.test(file)) continue;
  images[file.replace(/\.png$/i, '')] = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, file)).toString('base64');
}
const text = '// 자동 생성(make-phase-images.cjs). 직접 고치지 말고 assets/images/memory-phase/의 PNG를 바꾼 뒤 다시 만든다.\n'
  + 'window.MemoryPhaseImages=' + JSON.stringify(images) + ';\n';
fs.writeFileSync(out, text);
console.log(Object.keys(images).length + ' images → ' + path.relative(root, out) + ' (' + text.length.toLocaleString('en-US') + ' bytes)');

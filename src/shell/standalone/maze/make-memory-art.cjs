/* 미로 3페 기억의 단편 그림(assets/images/maze-memory/memory-1~4.png, Codex 생성)을 memory-art.js 한 파일로 묶는다.
   공용 manifest.json을 건드리지 않으려고 따로 둔다. 그림을 바꾸면: node src/shell/standalone/maze/make-memory-art.cjs */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const uris = [1, 2, 3, 4].map(n => 'data:image/png;base64,' + fs.readFileSync(path.join(root, `assets/images/maze-memory/memory-${n}.png`)).toString('base64'));
const text = '/* 미로 3페 기억의 단편 그림(Codex 생성, 막다른 길 순서대로): ①엄마가 양치해 줌 ②엄마가 밥을 차려 줌 ③침실 화장대와 세일러 교복 ④길을 건너 달리는 아이와 헤드라이트.\n'
  + '   make-memory-art.cjs가 assets/images/maze-memory/에서 만든 파일이라 직접 고치지 않는다. */\n'
  + 'window.MazeMemoryArt = ' + JSON.stringify(uris) + ';\n';
fs.writeFileSync(path.join(__dirname, 'memory-art.js'), text);
console.log('memory-art.js', text.length);

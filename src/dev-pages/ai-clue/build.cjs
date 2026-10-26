/** 개발자 전용 'AI 단서(물건이 바뀜)' 페이지만 빌드. 01·02와 공용 build.cjs는 건드리지 않는다.
 *  사용: node src/dev-pages/ai-clue/build.cjs → dev-pages/ai-clue.html (그림은 data URI로 한 파일에 넣음) */
const fs = require('node:fs');
const path = require('node:path');
const { createBuilder, root } = require('../../../scripts/build.cjs');
const imageDir = path.join(__dirname, 'img');
const images = {};
for (const file of fs.readdirSync(imageDir).sort()) {
  const m = file.match(/^((?:before|after)-[a-z]+)\.png$/);
  if (m) images[m[1]] = 'data:image/png;base64,' + fs.readFileSync(path.join(imageDir, file)).toString('base64');
}
let html = createBuilder().render('src/dev-pages/ai-clue/page.template.html');
html = html.replace('/* @clue-images */ {}', () => JSON.stringify(images));
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents|clue-images) /.test(html)) throw new Error('Unexpanded directive');
const out = path.join(root, '../게임/개발자용/dev-pages', 'ai-clue.html'); // 10/27 게임 폴더로 이동
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)}: ${Buffer.byteLength(html).toLocaleString('en-US')} bytes, images: ${Object.keys(images).join(', ')}`);

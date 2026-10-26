/** 개발자 전용 침실 취향 페이지만 빌드. 01·02와 공용 build.cjs는 건드리지 않는다.
 *  사용: node src/dev-pages/bedroom-taste/build.cjs → dev-pages/bedroom-taste.html */
const fs = require('node:fs');
const path = require('node:path');
const { createBuilder, root } = require('../../../scripts/build.cjs');
const here = __dirname;
const imageDir = path.join(here, 'images');
const images = {};
if (fs.existsSync(imageDir)) for (const file of fs.readdirSync(imageDir).sort()) {
  const m = file.match(/^([a-z]+)\.(png|jpg|webp)$/);
  if (!m) continue;
  const mime = m[2] === 'jpg' ? 'image/jpeg' : 'image/' + m[2];
  images[m[1]] = `data:${mime};base64,${fs.readFileSync(path.join(imageDir, file)).toString('base64')}`;
}
let html = createBuilder().render('src/dev-pages/bedroom-taste/page.template.html');
html = html.replace('/* @taste-images */ {}', () => JSON.stringify(images));
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents|taste-images) /.test(html)) throw new Error('Unexpanded directive');
const out = path.join(root, '../게임/개발자용/dev-pages', 'bedroom-taste.html'); // 10/27 게임 폴더로 이동
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)}: ${Buffer.byteLength(html).toLocaleString('en-US')} bytes, images: ${Object.keys(images).join(', ') || '(none)'}`);

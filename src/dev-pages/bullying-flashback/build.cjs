// 한 파일로 묶기: site 폴더에서 `node src/dev-pages/bullying-flashback/build.cjs`
// 결과: site/dev-pages/bullying-flashback.html (그림·음성·CSS·JS 모두 안에 넣음)
const fs = require('node:fs');
const path = require('node:path');
const here = __dirname;
const site = path.resolve(here, '../../..');
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const mime = { '.jpg': 'image/jpeg', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const dataUri = f => `data:${mime[path.extname(f)]};base64,` + fs.readFileSync(path.join(here, f)).toString('base64');

let cuts = read('cuts.js').replace(/'((?:images|audio)\/[^']+)'/g, (_, f) => `'${dataUri(f)}'`);
let html = read('index.html')
  .replace('<link rel="stylesheet" href="flashback.css">', `<style>\n${read('flashback.css')}</style>`)
  .replace('<script src="cuts.js"></script>', `<script>\n${cuts}</script>`)
  .replace('<script src="flashback.js"></script>', `<script>\n${read('flashback.js')}</script>`)
  .replaceAll('../../../02_speedrun_dev.html', '../02_speedrun_dev.html');

const outDir = path.join(site, '../게임/개발자용/dev-pages'); // 10/27 게임 폴더로 이동
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'bullying-flashback.html');
fs.writeFileSync(out, html);
console.log(out, fs.statSync(out).size, 'bytes');

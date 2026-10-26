/** 개발자용 새 항목 '도전과제 옆 메뉴 처음부터 보이기' 페이지를 만든다 (2026-10-26 Claude Code).
 *  공용 build.cjs는 고치지 않고 불러 쓰기만 한다. 본편(01)과 같은 템플릿에 inject.html을 <body> 바로 뒤에 끼운다.
 *  실행: site 폴더에서  node src/dev-pages/achievement-dock/make.cjs
 *  결과: dev-pages/achievement-dock.html */
const fs = require('node:fs');
const path = require('node:path');
const { createBuilder, root } = require('../../../scripts/build.cjs');

const builder = createBuilder();
let text = builder.render('src/shell/play/index.template.html');
const inject = builder.render('src/dev-pages/achievement-dock/inject.html');
const bodyTag = /<body\b[^>]*>/;
if (!bodyTag.test(text)) throw new Error('No <body> in play template');
text = text.replace(bodyTag, tag => tag + '\n' + inject);
text = text.replace(/<title>[^<]*<\/title>/, '<title>speedrun — 개발자용 · 도전과제 메뉴 처음부터</title>');
// 결과 파일이 dev-pages/ 안에 있으므로 인트로 영상(따로 둔 파일)을 한 칸 위에서 찾게 한다.
const before = text;
text = text.replace(/\.src = 'assets\/video\//g, ".src = '../assets/video/");
if (text === before) throw new Error('Intro video path not found');
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(text)) throw new Error('Unexpanded source directive');
const outDir = path.join(root, '../게임/개발자용/dev-pages'); // 10/27 게임 폴더로 이동
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'achievement-dock.html');
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
console.log(`dev-pages/achievement-dock.html: ${Buffer.byteLength(text).toLocaleString('en-US')} bytes`);

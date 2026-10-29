/** 개발자용 새 항목 '처음 AI 버튼 스테이지'(1페/2페/3페 버튼) 페이지를 만든다 (2026-10-29 Claude Code).
 *  achievement-dock/make.cjs와 같은 방식: 본편 템플릿에 inject.html을 <body> 바로 뒤에 끼운다.
 *  실행: 웹디2/깃허브 에서  node src/dev-pages/ai-button/make.cjs
 *  결과: ../게임/개발자용/dev-pages/ai-button.html */
const fs = require('node:fs');
const path = require('node:path');
const { createBuilder, root } = require('../../../scripts/build.cjs');

const builder = createBuilder();
let text = builder.render('src/shell/play/index.template.html');
const inject = builder.render('src/dev-pages/ai-button/inject.html');
const bodyTag = /<body\b[^>]*>/;
if (!bodyTag.test(text)) throw new Error('No <body> in play template');
text = text.replace(bodyTag, tag => tag + '\n' + inject);
text = text.replace(/<title>[^<]*<\/title>/, '<title>speedrun — 개발자용 · 처음 AI 버튼 스테이지</title>');
// 결과 파일이 dev-pages/ 안에 있으므로 인트로 영상(따로 둔 파일)을 한 칸 위에서 찾게 한다.
const before = text;
text = text.replace(/\.src = 'assets\/video\//g, ".src = '../assets/video/");
if (text === before) throw new Error('Intro video path not found');
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(text)) throw new Error('Unexpanded source directive');
const outDir = path.join(root, '../게임/개발자용/dev-pages'); // 10/27 게임 폴더로 이동
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'ai-button.html');
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
console.log(`dev-pages/ai-button.html: ${Buffer.byteLength(text).toLocaleString('en-US')} bytes`);

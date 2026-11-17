/** 개발자용 새 항목 '처음 AI 버튼 스테이지'(1페/2페/3페 버튼) 페이지를 만든다 (2026-10-29 Claude Code).
 *  achievement-dock/make.cjs와 같은 방식: 본편 템플릿에 inject.html을 <body> 바로 뒤에 끼운다.
 *  실행: 웹디2/github 에서  node src/dev-pages/ai-button/make.cjs
 *  결과: ../game/dev/dev-pages/ai-button.html */
const fs = require('node:fs');
const path = require('node:path');
const { createBuilder, root } = require('../../../scripts/build.cjs');

const builder = createBuilder();
let text = builder.render('src/shell/play/index.template.html');
const inject = builder.render('src/dev-pages/ai-button/inject.html');
const bodyTag = /<body\b[^>]*>/;
if (!bodyTag.test(text)) throw new Error('No <body> in play template');
text = text.replace(bodyTag, tag => tag + '\n' + inject);
// 11/07: 놀리는 목소리(tease.js)는 개발자용 줄(1페 실패 때 가끔 「다시 해요. 몇 번이든 …」)로 바꿔 넣는다.
const teasePlay = builder.render('src/phase/tease.js', 'play'), teaseDev = builder.render('src/phase/tease.js', 'dev');
if (!text.includes(teasePlay)) throw new Error('tease.js not found in play template');
text = text.replace(teasePlay, () => teaseDev);
// 11/17: 2페 끝 점프스케어 얼굴이 사라진 뒤의 0.9초 까만 화면을 이 페이지에서만 inject.html의 DevAfterScare(4.5초 + 숨소리)로 바꾼다. 01은 그대로.
const scareEnd = "mode = 'dark'; stage.classList.remove('scare'); FX.droneOff(true);\n    await sleep(900);";
if (text.split(scareEnd).length !== 2) throw new Error('phase.js scare end not found once');
text = text.replace(scareEnd, () => "mode = 'dark'; stage.classList.remove('scare'); FX.droneOff(true);\n    await (window.DevAfterScare ? window.DevAfterScare() : sleep(900));");
text = text.replace(/<title>[^<]*<\/title>/, '<title>speedrun — 개발자용 · 처음 AI 버튼 스테이지</title>');
// 결과 파일이 dev-pages/ 안에 있으므로 인트로 영상(따로 둔 파일)을 한 칸 위에서 찾게 한다.
const before = text;
text = text.replace(/\.src = 'assets\/video\//g, ".src = '../assets/video/");
if (text === before) throw new Error('Intro video path not found');
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(text)) throw new Error('Unexpanded source directive');
const outDir = path.join(root, '../game/dev/dev-pages'); // 10/27 game 폴더로 이동
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'ai-button.html');
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
console.log(`dev-pages/ai-button.html: ${Buffer.byteLength(text).toLocaleString('en-US')} bytes`);

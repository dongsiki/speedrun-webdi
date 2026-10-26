/** 개발자용 새 항목 '음성 내레이션·놀리는 음성' 페이지를 만든다 (2026-10-26 Claude Code).
 *  공용 build.cjs는 고치지 않고 불러 쓰기만 한다. 본편(01)과 같은 템플릿에 inject.html을 <body> 바로 뒤에 끼우고,
 *  audio/*.wav(Supertonic 3, F1)를 data URI로 넣는다.
 *  실행: site 폴더에서  node src/dev-pages/voice-narration/make.cjs
 *  결과: dev-pages/voice-narration.html */
const fs = require('node:fs');
const path = require('node:path');
const { createBuilder, root } = require('../../../scripts/build.cjs');

const here = __dirname;
const clips = {};
for (const file of fs.readdirSync(path.join(here, 'audio')).sort()) {
  const m = file.match(/^([a-z]-[a-z0-9]+)\.wav$/);
  if (m) clips[m[1]] = 'data:audio/wav;base64,' + fs.readFileSync(path.join(here, 'audio', file)).toString('base64');
}
const builder = createBuilder();
let text = builder.render('src/shell/play/index.template.html');
let inject = builder.render('src/dev-pages/voice-narration/inject.html');
if (!inject.includes('/* @voice-clips */ {}')) throw new Error('No clip slot in voice.js');
inject = inject.replace('/* @voice-clips */ {}', () => JSON.stringify(clips));
const bodyTag = /<body\b[^>]*>/;
if (!bodyTag.test(text)) throw new Error('No <body> in play template');
text = text.replace(bodyTag, tag => tag + '\n' + inject);
text = text.replace(/<title>[^<]*<\/title>/, '<title>speedrun — 개발자용 · 음성 내레이션·놀리는 음성</title>');
// 결과 파일이 dev-pages/ 안에 있으므로 따로 둔 영상을 한 칸 위에서 찾게 한다.
// 인트로(video.src)와 점프스케어 얼굴을 자르는 fx.js(v.src) 두 곳.
let moved = 0;
text = text.replace(/\b(video|v)\.src = 'assets\/video\//g, (_, name) => { moved++; return `${name}.src = '../assets/video/`; });
if (moved < 2) throw new Error(`Video paths found: ${moved} (expected intro + face)`);
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents|voice-clips) /.test(text)) throw new Error('Unexpanded source directive');
const outDir = path.join(root, '../게임/개발자용/dev-pages'); // 10/27 게임 폴더로 이동
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'voice-narration.html');
if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
console.log(`dev-pages/voice-narration.html: ${Buffer.byteLength(text).toLocaleString('en-US')} bytes, clips: ${Object.keys(clips).length}`);

/** 깃허브에 올리기 전 준비(2026-10-27 Claude Code). push는 하지 않는다 — 사용자가 올리라고 할 때만 그 뒤에 git으로 올린다.
 *  사용자 원칙: 「다 됐을 때에서야 깃허브로 그 파일 혹은 폴더들을 복붙해서 올리든 하자고」
 *  하는 일: 웹디2\게임 의 결과를 저장소 맨 위 예전 자리로 복사해, 공개 주소
 *    …/speedrun-webdi/01_speedrun_play.html, …/02_speedrun_dev.html, …/dev-pages/… 가 그대로 열리게 한다.
 *    - 게임/플레이용/01_speedrun_play.html → 01_speedrun_play.html
 *    - 게임/개발자용/02_speedrun_dev.html → 02_speedrun_dev.html (바로가기 ../플레이용/01… → 01…)
 *    - 게임/개발자용/dev-pages/ → dev-pages/  (영상은 저장소 assets/video 를 그대로 씀)
 *    - src/dev-pages/icu-ending·mobile-touch 는 저장소에 원래 있음
 *  실행: 웹디2\깃허브 에서  node scripts/publish.cjs           (저장소 맨 위에 씀)
 *        미리 보기만:       node scripts/publish.cjs --out <폴더> (그 폴더에 같은 구성을 만든다) */
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./build.cjs');
const game = path.resolve(root, '../게임');
const outArg = process.argv.indexOf('--out');
const out = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : root;

function copy(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function copyTree(from, to) {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyTree(a, b) : copy(a, b);
  }
}
copy(path.join(game, '플레이용/01_speedrun_play.html'), path.join(out, '01_speedrun_play.html'));
const dev = fs.readFileSync(path.join(game, '개발자용/02_speedrun_dev.html'), 'utf8');
const devFixed = dev.split('href="../플레이용/01_speedrun_play.html#').join('href="01_speedrun_play.html#');
if (devFixed === dev) throw new Error('개발자용 바로가기 링크를 찾지 못함');
fs.writeFileSync(path.join(out, '02_speedrun_dev.html'), devFixed);
copyTree(path.join(game, '개발자용/dev-pages'), path.join(out, 'dev-pages'));
if (out !== root) { // 미리 보기 폴더에는 저장소에서 가져올 것들도 함께
  copy(path.join(root, 'assets/video/elder-transformation-10s.mp4'), path.join(out, 'assets/video/elder-transformation-10s.mp4'));
  for (const p of ['icu-ending', 'mobile-touch']) copyTree(path.join(root, 'src/dev-pages', p), path.join(out, 'src/dev-pages', p));
  for (const f of ['index.html', '.nojekyll']) if (fs.existsSync(path.join(root, f))) copy(path.join(root, f), path.join(out, f));
}
console.log('준비 완료:', out);

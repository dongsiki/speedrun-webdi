/** Build portable HTML from this repository only. No historical work folder is read. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// 2026-11-03: 플레이용(01)과 개발자용(02)이 몇 줄만 다른 파일은 한 파일로 두고, 다른 줄만 표시한다.
//   //#play … //#end            → 플레이용에만 들어가는 줄
//   //#dev … //#end             → 개발자용에만 들어가는 줄
//   //#play … //#dev … //#end   → 앞은 플레이용, 뒤는 개발자용
//   CSS에서는 /* #play */, /* #dev */, /* #end */ 로 쓴다. 표시 줄 자체는 결과에 들어가지 않는다.
//   개발자용으로 넣을 때는 템플릿에서 `/* @inline 파일 #dev */`처럼 끝에 #dev를 붙인다.
const marker = /^\s*(?:\/\/|\/\*)\s*#(play|dev|end)\b.*$/;
function pickVariant(text, variant, file) {
  if (!/^\s*(?:\/\/|\/\*)\s*#(?:play|dev)\b/m.test(text)) return text;
  let mode = null;
  const kept = [];
  for (const line of text.split('\n')) {
    const m = line.replace(/\r$/, '').match(marker);
    if (m) {
      if (m[1] === 'end') { if (!mode) throw new Error('#end without #play/#dev in ' + file); mode = null; }
      else mode = m[1];
      continue;
    }
    if (!mode || mode === variant) kept.push(line);
  }
  if (mode) throw new Error('Missing #end in ' + file);
  return kept.join('\n');
}
function createBuilder() {
  const cache = new Map();
  const inputs = new Set();
  const assetManifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
  function local(file) {
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(root + path.sep)) throw new Error('Path leaves the repository: ' + file);
    inputs.add(file);
    return absolute;
  }
  function documents(variant) {
    const entries = JSON.parse(fs.readFileSync(local(`src/shell/${variant}/documents.json`), 'utf8'));
    const result = {};
    for (const [key, value] of Object.entries(entries)) {
      const html = render(value.entry);
      if (variant === 'play') result[key] = html;
      else {
        const item = {};
        for (const property of value.propertyOrder) item[property] = property === 'html' ? html : value.metadata[property];
        result[key] = item;
      }
    }
    return result;
  }
  function expand(text, variant = 'play') {
    text = text.replace(/@@data:([^@\r\n]+)@@/g, (_, file) => {
      const meta = assetManifest[file];
      if (!meta) throw new Error('Unregistered asset: ' + file);
      return `data:${meta.mime};base64,${fs.readFileSync(local(file)).toString('base64')}`;
    });
    text = text.replace(/\/\* @json ([^*\r\n]+) \*\/\s*null/g, (_, file) => JSON.stringify(JSON.parse(render(file))));
    text = text.replace(/\/\* @jsonraw ([^*\r\n]+) \*\/\s*null/g, (_, file) => {
      const raw = render(file).trim();
      JSON.parse(raw);
      return raw;
    });
    text = text.replace(/\/\* @inline ([^*\r\n]+) \*\//g, (_, spec) => {
      const [file, flag] = spec.trim().split(/\s+/);
      // 안에서 다시 부르는 조각 파일은 부른 쪽(플레이용/개발자용)을 그대로 따른다.
      return render(file, flag === '#dev' ? 'dev' : flag === '#play' ? 'play' : variant);
    });
    text = text.replace(/\/\* @standalone ([^*\r\n]+) \*\/\s*\{\}/g, (_, file) => {
      const entry = JSON.parse(render(file)), payload = {};
      for (const property of entry.propertyOrder) payload[property] = property === 'html' ? render(entry.entry) : entry.metadata[property];
      return JSON.stringify(payload).replace(/</g, '\\u003c');
    });
    text = text.replace(/\/\* @documents (play|dev) \*\/\s*\{\}/g, (_, variant) => JSON.stringify(documents(variant)).replace(/</g, '\\u003c'));
    return text;
  }
  function render(file, variant = 'play') {
    const key = file + '|' + variant;
    if (cache.has(key)) {
      if (cache.get(key) === undefined) throw new Error('Include cycle: ' + file);
      return cache.get(key);
    }
    // A temporary guard catches accidental include cycles with a useful path.
    cache.set(key, undefined);
    const text = expand(pickVariant(fs.readFileSync(local(file), 'utf8'), variant, file), variant);
    cache.set(key, text);
    return text;
  }
  return { render, documents, inputs };
}

// 2026-10-27 사용자: 「웹디2 여기 안에 폴더 하나 더 만들고 거기다가 실제 플레이용과 데브용 폴더를 만들고, 거기에다가 각자 파일들을 박아놔」
// → 결과는 game/play/01_speedrun_play.html, game/dev/02_speedrun_dev.html 에 쓴다(각 폴더에 인트로 영상도 함께).
//   저장소 맨 위 01·02는 그 파일로 넘어가는 작은 안내 파일이라 공개 주소(…/01_speedrun_play.html)는 그대로 열린다.
const PLAY_DIR = '../game/play', DEV_DIR = '../game/dev'; // 10/27 정리: 저장소는 웹디2/github, 결과는 웹디2/game
const INTRO_VIDEO = 'assets/video/elder-transformation-10s.mp4';
function copyIfChanged(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size && fs.readFileSync(to).equals(fs.readFileSync(from))) return;
  fs.copyFileSync(from, to);
}
function copyTree(from, to, patch) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(a, b, patch);
    else if (patch && patch[entry.name]) { fs.mkdirSync(to, { recursive: true }); const t = patch[entry.name](fs.readFileSync(a, 'utf8')); if (!fs.existsSync(b) || fs.readFileSync(b, 'utf8') !== t) fs.writeFileSync(b, t); }
    else copyIfChanged(a, b);
  }
}
function stub(target) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>speedrun</title>`
    + `<meta http-equiv="refresh" content="0;url=${encodeURI(target)}"><script>location.replace(${JSON.stringify(encodeURI(target))}+location.search+location.hash)</script></head>`
    + `<body><a href="${encodeURI(target)}">${target}</a></body></html>\n`;
}
function build({ write = false } = {}) {
  const builder = createBuilder();
  const outputs = {};
  for (const [variant, name, dir] of [['play', '01_speedrun_play.html', PLAY_DIR], ['dev', '02_speedrun_dev.html', DEV_DIR]]) {
    const text = builder.render(`src/shell/${variant}/index.template.html`);
    if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(text)) throw new Error('Unexpanded source directive in ' + name);
    outputs[dir + '/' + name] = text;
    if (write) {
      const file = path.join(root, dir, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
      copyIfChanged(path.join(root, INTRO_VIDEO), path.join(root, dir, INTRO_VIDEO));
      // 10/27: 맨 위 안내 파일은 만들지 않는다(깃허브에 올릴 때 scripts/publish.cjs가 저장소 맨 위 01·02를 채움).
    }
  }
  if (write) {
    // 개발자용 시안 중 소스 폴더에 그대로 있는 두 페이지를 개발자용 폴더로 복사(휴대폰 터치는 본편을 옆 플레이용 폴더에서 연다).
    // 10/29: 개발자용 3페이즈 시안(dev-pages/phase3)을 본편과 같은 소스(src/phase/phase3)로 맞춘다.
    const p3 = path.join(root, DEV_DIR, 'dev-pages/phase3');
    const p3src = path.join(root, 'src/phase/phase3');
    copyIfChanged(path.join(root, 'src/shell/dev/ai-cling.js'), path.join(p3, 'ai-cling.js')); // 11/07 AI 집착 단서(세션 번호)
    // 11/07: phase3.js·story.js의 //#dev 줄(개발자용 3페 땅파기 흐름)이 들어가도록 개발자용으로 골라 쓴다. 본편 01은 //#play 줄 그대로.
    for (const [from, to] of [['dev-index.html', 'index.html'], ['phase3.js', 'phase3.js'], ['phase3.css', 'phase3.css'], ['story.js', 'story.js']]) {
      const text = pickVariant(fs.readFileSync(path.join(p3src, from), 'utf8'), 'dev', from), out = path.join(p3, to);
      fs.mkdirSync(p3, { recursive: true });
      if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== text) fs.writeFileSync(out, text);
    }
    for (const f of fs.readdirSync(path.join(root, 'assets/audio/phase3'))) if (f.endsWith('.mp3')) copyIfChanged(path.join(root, 'assets/audio/phase3', f), path.join(p3, 'voice', f));
    for (const f of fs.readdirSync(path.join(root, 'assets/images'))) if (/^phase3-.*.webp$/.test(f)) copyIfChanged(path.join(root, 'assets/images', f), path.join(p3, 'img', f.replace(/^phase3-/, '')));
    for (const page of ['icu-ending', 'mobile-touch']) {
      copyTree(path.join(root, 'src/dev-pages', page), path.join(root, DEV_DIR, 'src/dev-pages', page), {
        'index.html': t => t.replace("which === 'play' ? '01_speedrun_play.html'", "which === 'play' ? '../play/01_speedrun_play.html'")
      });
    }
  }
  return { outputs, builder };
}

if (require.main === module) {
  const result = build({ write: !process.argv.includes('--check') });
  for (const [file, text] of Object.entries(result.outputs)) console.log(`${file}: ${Buffer.byteLength(text).toLocaleString('en-US')} bytes`);
  console.log(`Built from ${result.builder.inputs.size} repository inputs; no external build dependency.`);
}
module.exports = { build, createBuilder, pickVariant, root };

/**
 * 기억 스테이지 "윤곽선 깜빡임 횟수 제한" 개발자용 시안 만들기.
 * 원본 src/stages/memory/game.dev.js 는 건드리지 않고, 복사본(game.blink.js)에 변경을 덧입힌 뒤
 * 확인용 HTML(site/dev-pages/memory-blink-limit.html)을 만든다.
 * 실행: node src/dev-pages/memory-blink-limit/make.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const here = __dirname;
const { createBuilder, root } = require('../../../scripts/build.cjs');

let code = fs.readFileSync(path.join(root, 'src/stages/memory/game.dev.js'), 'utf8');
function swap(from, to, count = 1) {
  const parts = code.split(from);
  if (parts.length - 1 !== count) throw new Error(`expected ${count} match(es), found ${parts.length - 1}: ${from.slice(0, 60)}`);
  code = parts.join(to);
}

// 1) 셰이더: 윤곽선 밝기를 전체 시계 대신 물건마다 마스크 G 채널(1=지금 흰 차례)로 받는다.
swap(`        float outside = 0.0;
        float inside = texture2D(silhouettes, uv).r;`, `        float outside = 0.0;
        float litNear = 0.0;
        float inside = texture2D(silhouettes, uv).r;`);
swap(`              float sampleMask = texture2D(silhouettes, uv + vec2(float(x), float(y)) / pixels).r;
              outside = max(outside, sampleMask);`, `              vec4 sampleTexel = texture2D(silhouettes, uv + vec2(float(x), float(y)) / pixels);
              float sampleMask = sampleTexel.r;
              outside = max(outside, sampleMask);
              litNear = max(litNear, sampleTexel.r * sampleTexel.g);`);
swap(`        float lit = step(0.5, fract(blinkTime));`, `        // 2026-10-26 개발자용 시안: 물건마다 정해진 횟수만 흰색으로 깜빡이고, 다 깜빡이면 검정 굵은 선으로 멈춘다.
        float lit = step(0.5, litNear);`);
swap(`            if (d > 4.0 && d <= 9.0) rim = max(rim, texture2D(silhouettes, uv + vec2(float(x), float(y)) / pixels).r);`,
     `            if (d > 4.0 && d <= 9.0) { vec4 rimTexel = texture2D(silhouettes, uv + vec2(float(x), float(y)) / pixels); rim = max(rim, rimTexel.r * rimTexel.g); }`);
swap(`        rim *= (1.0 - outside) * lit;`, `        rim *= (1.0 - outside);`);

// 2) 강조 물건마다 이름표(key)를 붙인다. userData는 복제 때 JSON으로 복사되므로 번호만 넣는다.
swap(`  function emphasize(object) {
    object.traverse(part => {
      if (part.isMesh && part.material.visible) part.userData.boldOutline = true;
    });
    return object;
  }`, `  // 깜빡임 횟수 제한: 물건(묶음)마다 마스크 재질을 따로 두고, 방에 들어와 보이기 시작한 때부터 센다.
  const blinkGroups = [];
  function emphasize(object, key = 'etc') {
    const group = { key, object, mask: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0, 0), side: THREE.DoubleSide }), start: null, flashes: 0, count: 0 };
    blinkGroups.push(group);
    object.traverse(part => {
      if (part.isMesh && part.material.visible) { part.userData.boldOutline = true; part.userData.blinkGroupIndex = blinkGroups.length - 1; }
    });
    return object;
  }`);
for (const [from, to] of [
  ['emphasize(basin);', "emphasize(basin,'basin');"],
  ['emphasize(tap);', "emphasize(tap,'tap');"],
  ['emphasize(mirrorDoor);', "emphasize(mirrorDoor,'mirror');"],
  ['emphasize(flushButton);', "emphasize(flushButton,'flush');"],
  ['emphasize(lotion);', "emphasize(lotion,'lotion');"],
  ['emphasize(fridgeDoor);', "emphasize(fridgeDoor,'fridge');"],
  ['emphasize(fridgeFood);', "emphasize(fridgeFood,'fridgeFood');"],
  ['emphasize(chair);', "emphasize(chair,'chair');"],
  ['emphasize(kettle); emphasize(cup);', "emphasize(kettle,'kettle'); emphasize(cup,'cup');"],
  ['emphasize(plate);', "emphasize(plate,'plate');"],
  ['emphasize(door);', "emphasize(door,'door');"],
  ['emphasize(bed);', "emphasize(bed,'bed');"],
]) swap(from, to);

// 3) 마스크: 강조 물건은 자기 묶음 재질을 쓴다.
swap(`mask: object.isMesh ? (object.userData.boldOutline ? maskForeground : maskOccluder) : maskHidden });`,
     `mask: object.isMesh ? (object.userData.boldOutline ? (object.userData.blinkGroupIndex !== undefined ? blinkGroups[object.userData.blinkGroupIndex].mask : maskForeground) : maskOccluder) : maskHidden });`);

// 4) 방이 바뀌면(다음 날 아침 포함) 다시 센다.
swap(`  function setRoom(index) {
    stageIndex = index;`, `  function setRoom(index) {
    stageIndex = index;
    for (const group of blinkGroups) { group.start = null; group.flashes = 0; }`);

// 5) 몇 번 깜빡일지 정하고 매 프레임 마스크 색을 갱신한다.
swap(`  function frame(now) {
    requestAnimationFrame(frame);`, `  // 필요한 물건 = 3번, 필요 없는 물건 = 1~2번 (todo.md 10/13 기록 기준).
  const BLINK_RULES = {
    bed: 3, basin: 3, tap: 3, chair: 3, kettle: 3, cup: 3, plate: 3, door: 3,
    fridge: () => foodInFridge() ? 3 : 2,
    fridgeFood: 3,
    flush: 1, mirror: 1, lotion: 2,
  };
  // 냉장고 안 음식은 문이 열렸을 때부터 센다(닫힌 문 뒤에서 횟수를 다 써 버리지 않게).
  const BLINK_READY = { fridgeFood: () => fridgeOpen };
  const shownInWorld = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
  function updateBlinkMasks() {
    const t = performance.now() / 1000, report = [];
    for (const group of blinkGroups) {
      const rule = BLINK_RULES[group.key];
      group.count = typeof rule === 'function' ? rule() : (rule ?? 3);
      // 눈을 뜨는 중·방 이동 중에는 세지 않는다. 조작할 수 있게 된(ready) 때부터 센다.
      const ready = phase === 'ready' && shownInWorld(group.object) && (!BLINK_READY[group.key] || BLINK_READY[group.key]());
      if (ready && group.start === null) group.start = t;
      let lit = 0;
      if (group.start !== null) {
        const age = t - group.start;
        // 0.5초 검정 → 0.5초 흰색을 1번으로 센다. 정해진 횟수가 끝나면 검정 선으로 멈춘다.
        group.flashes = Math.min(group.count, Math.floor(age + .5));
        lit = age < group.count && age % 1 >= .5 ? 1 : 0;
      }
      group.mask.color.setRGB(1, lit, 0);
      if (shownInWorld(group.object)) report.push(group.key + ':' + group.flashes + '/' + group.count);
    }
    canvas.dataset.blinkCounts = report.join(' ');
  }
  function frame(now) {
    requestAnimationFrame(frame);`);
swap(`    outlineObjects.forEach(({ object, mask }) => object.material = mask);
    renderer.setClearColor(C.ink);`, `    updateBlinkMasks();
    outlineObjects.forEach(({ object, mask }) => object.material = mask);
    renderer.setClearColor(C.ink);`);

fs.writeFileSync(path.join(here, 'game.blink.js'), code);

// 확인용 단독 HTML. 02 목록에 붙일 때는 dev.template.html 을 documents.json 항목으로 쓰면 된다.
const builder = createBuilder();
const html = builder.render('src/dev-pages/memory-blink-limit/dev.template.html');
if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(html)) throw new Error('Unexpanded directive');
const outDir = path.join(root, '../게임/개발자용/dev-pages'); // 10/27 게임 폴더로 이동
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'memory-blink-limit.html'), html);
console.log('game.blink.js + dev-pages/memory-blink-limit.html', Buffer.byteLength(html).toLocaleString('en-US'), 'bytes');

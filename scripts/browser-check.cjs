/** Browser routing smoke test. Completion/failure messages below are simulated,
 * not a claim that an automated player solved every puzzle. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { root } = require('./build.cjs');
const { chromium } = require(process.env.SPEEDRUN_PLAYWRIGHT || 'playwright');
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const reportDir = path.resolve(arg('--report-dir') || path.join(root, 'test-results'));
const remote = arg('--base-url');
const report = { checks: [], errors: [], limitations: ['Stage complete/fail messages are simulated for routing, not full puzzle playthroughs.', 'Headless automated mouse/keyboard checks do not verify a physical mouse or perceived FPS camera comfort.', 'Speaker output and USB hardware were not tested.'] };
let browser, server;
fs.mkdirSync(reportDir, { recursive: true });
const log = (name, detail = {}) => { report.checks.push({ name, ...detail }); console.log('PASS ' + name); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function watch(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror', e => report.errors.push(String(e)));
  return page;
}
async function iframe(page, id) {
  const el = await page.waitForSelector('iframe#' + id, { state: 'attached' });
  return el.contentFrame();
}
async function idle(page, stage) {
  await page.waitForFunction(s => document.body.dataset.stage === s && document.body.dataset.transition === 'idle', stage, { timeout: 45000 });
}
async function start(page) {
  await page.waitForFunction(() => !window.TransformationIntro?.active);
  await page.locator('#ai-switch').click();
  await page.locator('#ai-gate-dismiss').click();
  await delay(600);
  await page.locator('#ai-switch').click();
  await page.locator('#ai-gate-stop').waitFor({ state: 'visible' });
  await page.locator('#ai-gate-stop').focus();
  await page.keyboard.down('Space');
  await idle(page, 'digging');
  await page.keyboard.up('Space');
}
async function emit(frame, data) {
  await frame.evaluate(data => parent.postMessage({ channel: 'speedrun-midterm-v1', ...data }, '*'), data);
}
async function openFromLobby(page, object, stage) {
  const lobby = await iframe(page, 'digging');
  await emit(lobby, { type: 'found', object });
  await emit(lobby, { type: 'enter', object });
  await idle(page, stage);
  const frame = await iframe(page, stage);
  await frame.waitForSelector('canvas,button,svg', { state: 'attached' });
  await delay(200);
  return frame;
}
async function mazeInput(frame, page) {
  await frame.evaluate(() => {
    window.__inputSmoke = { mouse: [], keys: [] };
    addEventListener('mousemove', e => window.__inputSmoke.mouse.push([e.movementX, e.movementY]));
    addEventListener('keydown', e => window.__inputSmoke.keys.push(e.code));
  });
  const canvas = frame.locator('canvas').first();
  await canvas.click({ force: true });
  await delay(150);
  const locked = await frame.evaluate(() => !!document.pointerLockElement);
  await page.mouse.move(420, 260);
  await page.keyboard.down('KeyW'); await delay(120); await page.keyboard.up('KeyW');
  await page.mouse.move(450, 270);
  const input = await frame.evaluate(() => window.__inputSmoke);
  assert(input.keys.includes('KeyW'), 'Maze did not receive W');
  await page.keyboard.press('Escape');
  log('maze automated input delivery', { pointerLockAcquired: locked, mouseEvents: input.mouse.length, keys: input.keys });
}
async function actual(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  assert.equal(await page.locator('body').getAttribute('data-stage'), 'intro');
  await start(page); log('actual AI gate → digging');
  const entries = [['bulb','switches'],['key','maze'],['toothbrush','routine'],['cane','limb'],['spool','needle'],['suitcase','suitcase'],['chart','mri']];
  for (const [object, stage] of entries) {
    const frame = await openFromLobby(page, object, stage);
    if(stage==='maze')await mazeInput(frame,page);
    if(stage==='switches') {
      const buttons = await frame.locator('button').count();
      assert(buttons >= 15, 'Switch panel is missing');
      log('switch panel mounted', { buttons });
    }
    if(stage==='routine')await page.screenshot({ path: path.join(reportDir, 'actual-memory.png') });
    const outcome=stage==='switches'?'complete':stage==='maze'?'fail':'back';
    await emit(frame,{type:outcome});
    await idle(page,'digging');
    log('actual '+stage+' → lobby', { outcome, simulatedLifecycleMessage:true });
  }
  const stored = await page.evaluate(() => localStorage.getItem('speedrun-rebellion-v1'));
  assert(stored && JSON.parse(stored), 'Progress storage missing');
  await page.reload({waitUntil:'load',timeout:90000});
  assert.equal(await page.evaluate(() => localStorage.getItem('speedrun-rebellion-v1')),stored);
  log('progress record retained after reload');
}
async function developer(page,url,full=true) {
  await page.goto(url,{waitUntil:'load',timeout:90000});
  await page.waitForFunction(() => !window.TransformationIntro?.active);
  const links=await page.locator('a[href$=".html"]').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
  const wanted=links.filter(x=>/^\d\d-/.test(x));
  assert.equal(wanted.length,9,'Developer menu entries');
  for(const id of full?wanted:wanted.slice(0,1)){
    await page.locator(`a[href="${id}"]`).click();
    const frame=await iframe(page,'portable-stage');
    await frame.waitForSelector('body');
    const inner=await frame.$('iframe#stage');
    if(inner){const game=await inner.contentFrame();await game.waitForSelector('canvas,button,svg',{state:'attached'});}
    else await frame.waitForSelector('canvas,button,svg',{state:'attached'});
    await delay(250);
    if(id==='02-maze.html')await page.screenshot({path:path.join(reportDir,'developer-maze.png')});
    // This is the documented shell menu message, from the active source frame.
    await emit(frame,{type:'menu',channel:'speedrun-offline-developer-v1'});
    await page.waitForFunction(()=>!document.body.dataset.playing);
    assert.equal(await page.locator('#portable-stage').count(),0);
    log('developer '+id+' → menu',{simulatedLifecycleMessage:true});
  }
}
(async()=>{
  try {
    let base=remote;
    if(!base){
      server=http.createServer((req,res)=>{
        const name=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\//,'')||'index.html';
        const target=path.resolve(root,name);
        if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){res.writeHead(404);return res.end();}
        res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.mp4')?'video/mp4':'application/octet-stream');
        fs.createReadStream(target).pipe(res);
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      base=`http://127.0.0.1:${server.address().port}/`;
    }
    const executablePath=process.env.SPEEDRUN_CHROME || undefined;
    browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:800,height:600}});
    report.base=base;report.browser=await browser.version();
    const page=await watch(context);
    if(arg('--only')!=='dev')await actual(page,new URL('01_speedrun_play.html',base).href);
    await developer(page,new URL('02_speedrun_dev.html',base).href);
    if(!remote){
      const offline=await watch(context);
      await offline.goto(pathToFileURL(path.join(root,'01_speedrun_play.html')).href,{waitUntil:'load',timeout:90000});
      await start(offline);log('file:// actual AI gate → digging');
      await developer(offline,pathToFileURL(path.join(root,'02_speedrun_dev.html')).href,false);
      log('file:// developer entry and return');await offline.close();
    }
    assert.deepEqual(report.errors,[],'Browser runtime errors');
    report.status='passed';
  } catch(e){report.status='failed';report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
  finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(reportDir,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log('REPORT '+path.join(reportDir,'browser.json'));}
})();

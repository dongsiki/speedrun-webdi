/* Isolated source preview. Does not import/run scripts/build.cjs or write 01/02/game. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const output = path.join(__dirname, 'phase3-3d-review');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function expand(file, stack = []) {
  if (stack.includes(file)) throw new Error('include cycle');
  let text = fs.readFileSync(path.join(root, file), 'utf8');
  text = text.replace(/@@data:([^@\r\n]+)@@/g, (_, f) => {
    const mime = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'))[f].mime;
    return 'data:' + mime + ';base64,' + fs.readFileSync(path.join(root, f)).toString('base64');
  });
  text = text.replace(/\/\* @json ([^*\r\n]+) \*\/\s*null/g, (_, f) => JSON.stringify(JSON.parse(expand(f, [...stack, file]))));
  text = text.replace(/\/\* @inline ([^*\r\n]+) \*\//g, (_, f) => expand(f.trim().split(/\s+/)[0], [...stack, file]));
  // The maze files used here have no variant blocks. Refuse to silently render one incorrectly.
  if (/^\s*(?:\/\/|\/\*)\s*#(?:play|dev|end)\b/m.test(text)) throw new Error('variant block needs explicit support: ' + file);
  return text;
}
class CDP {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.waiters = new Map(); this.errors = [];
    ws.addEventListener('message', event => {
      const m = JSON.parse(event.data);
      if (process.env.MAZE_CDP_DEBUG) console.log('CDP message', m.id || m.method);
      if (m.id) {
        const p = this.waiters.get(m.id); if (!p) return;
        this.waiters.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      } else if (m.method === 'Runtime.exceptionThrown') this.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    });
  }
  call(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiters.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
      this.waiters.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const r = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}
(async () => {
  if (process.argv.includes('--preview-only')) {
    let html = expand('src/stages/maze/dev-game.template.html');
    const code = expand('src/shell/standalone/maze/maze-phase3-3d.js');
    const review = `addEventListener('keydown',event=>{const index=Number(event.key)-1,v=window.MazeDevPhase3?.views[index];if(!v)return;const p=MazeRuntime.player;p.x=v.cell[0]+.5+v.direction[0]*1.1;p.z=v.cell[1]+.5+v.direction[1]*1.1;p.yaw=Math.atan2(-v.direction[1],-v.direction[0]);p.pitch=0;});`;
    html = html.replace('</body>', '<script>' + code + '\n' + review + '<' + '/script></body>');
    fs.writeFileSync(path.join(__dirname, 'phase3-3d-review.html'), html);
    console.log(path.join(__dirname, 'phase3-3d-review.html')); return;
  }
  const keepAlive = setInterval(() => {}, 1000);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'maze-source-qa-'));
  const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const gpu = process.argv.includes('--decode-only') ? ['--disable-gpu', '--disable-software-rasterizer'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const child = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile, ...gpu, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = ''; child.stderr.on('data', data => { browserLog = (browserLog + data).slice(-5000); });
  let ws, c;
  try {
    const active = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 150 && !fs.existsSync(active); i++) await pause(100);
    const port = fs.readFileSync(active, 'utf8').split('\n')[0];
    console.log('CDP port ready');
    let targets;
    for (let i = 0; i < 30; i++) {
      try { targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); break; }
      catch (error) { if (i === 29) throw error; await pause(150); }
    }
    ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    console.log('CDP target found');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket connection timeout')), 10000);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener('error', event => { clearTimeout(timer); reject(new Error('CDP WebSocket error: ' + (event.message || 'unknown'))); }, { once: true });
    });
    console.log('CDP connected');
    c = new CDP(ws);
    console.log(JSON.stringify(await c.call('Browser.getVersion')));
    await c.call('Runtime.enable');
    console.log('Runtime enabled');
    if (process.argv.includes('--decode-only')) {
      const uri = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'assets/images/maze-npc-neighbor.webp')).toString('base64');
      const png = await c.evaluate(`new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').drawImage(img,0,0);resolve(canvas.toDataURL('image/png').split(',')[1]);};img.onerror=reject;img.src=${JSON.stringify(uri)};})`);
      fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'neighbor-decoded.png'), Buffer.from(png, 'base64'));
      console.log('Decoded current WebP atlas for software preview'); return;
    }
    await c.call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
    let html = expand('src/stages/maze/dev-game.template.html');
    const code = expand('src/shell/standalone/maze/maze-phase3-3d.js');
    html = html.replace('</body>', '<script>' + code + '<' + '/script></body>');
    await c.evaluate('document.open();document.write(' + JSON.stringify(html) + ');document.close();');
    for (let i = 0; i < 150; i++) {
      if (await c.evaluate("!!window.MazeDevPhase3 && document.querySelector('canvas').dataset.worldReady === 'true'")) break;
      await pause(100);
    }
    const info = await c.evaluate('({hasRuntime:!!window.MazeRuntime,hasStory:!!window.MazeDevPhase3,worldError:document.querySelector("canvas").dataset.worldError,views:window.MazeDevPhase3?.views,inspect:window.MazeDevPhase3?.inspect()})');
    assert.equal(info.hasStory, true, JSON.stringify(info)); assert.equal(info.worldError, undefined);
    assert.equal(info.views.length, 6); assert.equal(info.inspect.figures, 6);
    fs.mkdirSync(output, { recursive: true });
    const shots = [];
    for (let i = 0; i < info.views.length; i++) {
      const v = info.views[i];
      const camera = await c.evaluate(`(() => { const v=${JSON.stringify(v)},r=MazeRuntime,p=r.player; p.x=v.cell[0]+.5+v.direction[0]*1.10;p.z=v.cell[1]+.5+v.direction[1]*1.10;p.yaw=Math.atan2(-v.direction[1],-v.direction[0]);p.pitch=0;return {fits:r.E.fits(p.x,p.z),x:p.x,z:p.z};})()`);
      assert(camera.fits, 'shot camera inside a wall: ' + i);
      await pause(350);
      const shot = await c.call('Page.captureScreenshot', { format: 'png' });
      const name = String(i + 1).padStart(2, '0') + '-' + (v.pair + 1) + '-' + v.type + '.png';
      fs.writeFileSync(path.join(output, name), Buffer.from(shot.data, 'base64')); shots.push(name);
    }
    // Progress visits are synthetic; verify actual movement along every grid segment separately.
    const movement = await c.evaluate(`(() => {const r=MazeRuntime,e=r.E,story=MazeDevPhase3;let from=[1,1],segments=0;for(const to of [...story.stops,[Math.floor(e.exit.x),Math.floor(e.exit.z)]]){const cells=story.route(from,to);for(let i=1;i<cells.length;i++){const a=cells[i-1],b=cells[i],p=e.initial();p.x=a[0]+.5;p.z=a[1]+.5;p.yaw=Math.atan2(b[1]-a[1],b[0]-a[0]);let k=0;while(Math.hypot(p.x-b[0]-.5,p.z-b[1]-.5)>.035&&k++<100)e.step(p,1,0,.01);if(p.damage||p.dead||k>=100)throw Error('route segment failed');segments++}from=to;}return {segments};})()`);
    const stops = await c.evaluate('MazeDevPhase3.stops');
    // Reset after the six independent screenshots, whose teleports may have visited the first stop.
    for (const [i, stop] of stops.entries()) {
      await c.evaluate(`Object.assign(MazeRuntime.player,{x:${stop[0] + .5},z:${stop[1] + .5}})`);
      await pause(100);
      assert.equal(await c.evaluate('MazeDevPhase3.stop'), i + 1);
    }
    await pause(1400);
    assert((await c.evaluate('MazeDevPhase3.inspect().arrowCount')) > 0);
    await c.call('Emulation.setDeviceMetricsOverride', { width: 600, height: 800, deviceScaleFactor: 1, mobile: false });
    await c.evaluate('Object.assign(MazeRuntime.player,{x:9.5,z:4.4,yaw:Math.PI/2,pitch:0})');
    await pause(350);
    const narrow = await c.call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, '07-narrow.png'), Buffer.from(narrow.data, 'base64'));
    assert.deepEqual(c.errors, []);
    const report = { info, movement, shots, errors: c.errors, limitations: ['Software WebGL; no hardware GPU test.', 'Scene visits use inspection teleports; each grid segment separately uses real movement logic.', '01/02 and their phase switch UI were not rebuilt or launched.'] };
    fs.writeFileSync(path.join(output, 'qa.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ figures: info.inspect.figures, shots: shots.length + 1, movement, errors: c.errors, output }));
  } finally {
    if (process.env.MAZE_CDP_DEBUG) console.log(browserLog);
    if (c) await c.call('Browser.close').catch(() => {});
    ws?.close(); child.kill(); clearInterval(keepAlive);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

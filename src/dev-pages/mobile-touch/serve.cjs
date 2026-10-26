/* 휴대폰 실기기 확인용 작은 서버. site 폴더를 그대로 보여 준다(파일 수정 없음).
 * 기본은 이 PC 안(127.0.0.1)에서만 열린다. 같은 와이파이의 폰에서 열려면 --lan 을 붙인다.
 *   node src/dev-pages/mobile-touch/serve.cjs          → USB 연결(안드로이드 크롬 포트 전달)용
 *   node src/dev-pages/mobile-touch/serve.cjs --lan    → 같은 와이파이 폰용(끝나면 Ctrl+C로 끄기) */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = path.resolve(__dirname, '../../..');
const port = 8080, lan = process.argv.includes('--lan');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('없음'); }
    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
}).listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  const page = '/src/dev-pages/mobile-touch/index.html';
  console.log('PC에서: http://localhost:' + port + page);
  if (lan) for (const list of Object.values(os.networkInterfaces())) for (const a of list) {
    if (a.family === 'IPv4' && !a.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) console.log('폰에서: http://' + a.address + ':' + port + page);
  }
  console.log('끄기: Ctrl+C');
});

/* CPU-only pose/placement evidence. No atlas sampling: NOT a game screenshot. */
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const { scene, api, E, T } = require('./check-phase3-structure.cjs');
const out = path.join(__dirname, 'phase3-3d-review'); fs.mkdirSync(out, { recursive: true });
function crc(b) { let c = -1; for (const x of b) { c ^= x; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ -1) >>> 0; }
function chunk(type, b) { const t = Buffer.from(type), n = Buffer.alloc(4), c = Buffer.alloc(4); n.writeUInt32BE(b.length); c.writeUInt32BE(crc(Buffer.concat([t, b]))); return Buffer.concat([n, t, b, c]); }
function png(w, h, pixels) { const hd = Buffer.alloc(13); hd.writeUInt32BE(w); hd.writeUInt32BE(h, 4); hd[8] = 8; const rows = Buffer.alloc((w + 1) * h); for (let y = 0; y < h; y++) pixels.copy(rows, y * (w + 1) + 1, y * w, (y + 1) * w); return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]); }
for (let index = 0; index < api.views.length; index++) {
  const v = api.views[index], w = 900, h = 650, pixels = Buffer.alloc(w * h, 250), depth = new Float64Array(w * h).fill(Infinity);
  const camera = new T.PerspectiveCamera(2 * Math.atan(h * .78 / w) * 180 / Math.PI, w / h, .025, 45);
  camera.position.set(v.cell[0] + .5 + v.direction[0] * 1.65, E.dimensions.eyeHeight, v.cell[1] + .5 + v.direction[1] * 1.65);
  camera.lookAt(v.cell[0] + .5, E.dimensions.eyeHeight, v.cell[1] + .5); camera.updateMatrixWorld();
  const group = scene.getObjectByName('memory-' + api.pairs[v.pair].id + '-' + v.type); group.updateMatrixWorld(true);
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, positions = geometry.attributes.position, normals = geometry.attributes.normal, ix = geometry.index;
    const transform = camera.matrixWorldInverse.clone().multiply(mesh.matrixWorld), normalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < (ix ? ix.count : positions.count); i += 3) {
      const ids = [0, 1, 2].map(j => ix ? ix.getX(i + j) : i + j), points = ids.map(id => new T.Vector3().fromBufferAttribute(positions, id).applyMatrix4(transform));
      if (points.some(p => p.z >= -.025)) continue;
      const a = points[1].clone().sub(points[0]), b = points[2].clone().sub(points[0]);
      if (a.cross(b).z <= 0) continue;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const normal = new T.Vector3().fromBufferAttribute(normals, ids[0]).applyMatrix3(normalMatrix).normalize();
      let gray = material.map ? 150 : Math.round(material.color.r * 255);
      gray = Math.min(245, gray * (.65 + .35 * Math.max(0, normal.dot(new T.Vector3(-.3, .6, 1).normalize()))));
      const p = points.map(q => { const z = -q.z; q.applyMatrix4(camera.projectionMatrix); return [(q.x + 1) * w / 2, (1 - q.y) * h / 2, z]; });
      const den = (p[1][1] - p[2][1]) * (p[0][0] - p[2][0]) + (p[2][0] - p[1][0]) * (p[0][1] - p[2][1]); if (Math.abs(den) < .001) continue;
      const x0 = Math.max(0, Math.floor(Math.min(...p.map(q => q[0])))), x1 = Math.min(w - 1, Math.ceil(Math.max(...p.map(q => q[0]))));
      const y0 = Math.max(0, Math.floor(Math.min(...p.map(q => q[1])))), y1 = Math.min(h - 1, Math.ceil(Math.max(...p.map(q => q[1]))));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const u = ((p[1][1] - p[2][1]) * (x - p[2][0]) + (p[2][0] - p[1][0]) * (y - p[2][1])) / den;
        const vv = ((p[2][1] - p[0][1]) * (x - p[2][0]) + (p[0][0] - p[2][0]) * (y - p[2][1])) / den, k = 1 - u - vv;
        if (u < 0 || vv < 0 || k < 0) continue;
        const z = 1 / (u / p[0][2] + vv / p[1][2] + k / p[2][2]), j = y * w + x;
        if (z < depth[j]) { depth[j] = z; pixels[j] = gray; }
      }
    }
  });
  const filename = String(index + 1).padStart(2, '0') + '-pose-only-' + v.type + '.png';
  fs.writeFileSync(path.join(out, filename), png(w, h, pixels));
}
console.log('Six CPU pose previews saved (untextured; not WebGL screenshots).');

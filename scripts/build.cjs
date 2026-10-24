/** Build portable HTML from this repository only. No historical work folder is read. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

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
  function expand(text) {
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
    text = text.replace(/\/\* @inline ([^*\r\n]+) \*\//g, (_, file) => render(file));
    text = text.replace(/\/\* @standalone ([^*\r\n]+) \*\/\s*\{\}/g, (_, file) => {
      const entry = JSON.parse(render(file)), payload = {};
      for (const property of entry.propertyOrder) payload[property] = property === 'html' ? render(entry.entry) : entry.metadata[property];
      return JSON.stringify(payload).replace(/</g, '\\u003c');
    });
    text = text.replace(/\/\* @documents (play|dev) \*\/\s*\{\}/g, (_, variant) => JSON.stringify(documents(variant)).replace(/</g, '\\u003c'));
    return text;
  }
  function render(file) {
    if (cache.has(file)) {
      if (cache.get(file) === undefined) throw new Error('Include cycle: ' + file);
      return cache.get(file);
    }
    // A temporary guard catches accidental include cycles with a useful path.
    cache.set(file, undefined);
    const text = expand(fs.readFileSync(local(file), 'utf8'));
    cache.set(file, text);
    return text;
  }
  return { render, documents, inputs };
}

function build({ write = false } = {}) {
  const builder = createBuilder();
  const outputs = {};
  for (const [variant, name] of [['play', '01_speedrun_play.html'], ['dev', '02_speedrun_dev.html']]) {
    const text = builder.render(`src/shell/${variant}/index.template.html`);
    if (/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(text)) throw new Error('Unexpanded source directive in ' + name);
    outputs[name] = text;
    if (write) {
      const file = path.join(root, name);
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
    }
  }
  return { outputs, builder };
}

if (require.main === module) {
  const result = build({ write: !process.argv.includes('--check') });
  for (const [file, text] of Object.entries(result.outputs)) console.log(`${file}: ${Buffer.byteLength(text).toLocaleString('en-US')} bytes`);
  console.log(`Built from ${result.builder.inputs.size} repository inputs; no external build dependency.`);
}
module.exports = { build, createBuilder, root };

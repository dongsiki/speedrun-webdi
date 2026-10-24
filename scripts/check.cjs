/** Structural checks; --baseline additionally proves the lossless migration. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { build, root } = require('./build.cjs');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline.json'), 'utf8'));
const result = build();
let scriptCount = 0, documentCount = 0;
function inspect(html, label) {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/type\s*=\s*["']application\/(?:ld\+)?json/.test(script[1])) continue;
    assert(!/\bsrc\s*=/.test(script[1]), 'Unexpected runtime script dependency: ' + label);
    new vm.Script(script[2], { filename: label + '.script-' + (++scriptCount) });
  }
  assert(!/<script[^>]*type\s*=\s*["']module/.test(html), 'Portable output must keep the current classic-script runtime');
  assert(!/@@data:|\/\* @(?:inline|json|jsonraw|standalone|documents) /.test(html), 'Unexpanded source in ' + label);
}
for (const [file, text] of Object.entries(result.outputs)) {
  // This tests both deterministic rebuilding and generated-file freshness.
  assert.equal(sha(fs.readFileSync(path.join(root, file))), sha(text), file + ' is stale; run npm run build');
  inspect(text, file);
  if (process.argv.includes('--baseline')) assert.equal(sha(text), baseline.outputs[file].sha256, file + ' differs from approved release');
}
for (const variant of ['play', 'dev']) {
  for (const [key, item] of Object.entries(result.builder.documents(variant))) {
    const html = variant === 'play' ? item : item.html;
    inspect(html, variant + '/' + key);
    documentCount++;
    if (process.argv.includes('--baseline')) assert.equal(sha(html), baseline.documents[variant][key].sha256, 'Stage changed: ' + key);
  }
}
// Three developer entries contain a second iframe. Check the inner game's
// scripts too, rather than merely parsing its JSON-encoded HTML as a string.
const standalone = path.join(root, 'src/shell/standalone');
for (const folder of fs.readdirSync(standalone, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const file = `src/shell/standalone/${folder.name}/document.json`;
  const entry = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  inspect(result.builder.render(entry.entry), 'developer-inner/' + folder.name);
}
const assets = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
for (const [file, meta] of Object.entries(assets)) assert.equal(sha(fs.readFileSync(path.join(root, file))), meta.sha256, 'Asset changed without manifest update: ' + file);
console.log(JSON.stringify({ status: 'passed', stageDocuments: documentCount, scriptBlocks: scriptCount, binaryAssets: Object.keys(assets).length, sourceInputs: result.builder.inputs.size, baseline: process.argv.includes('--baseline') }));

const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = __dirname, out = require('path').join(__dirname, '../../../assets/audio/phase3'); // story.js를 고친 뒤: node src/phase/phase3/make-voice.cjs  (일부만: … h1,m3)
const window = {}; eval(fs.readFileSync(dir + '/story.js', 'utf8'));
const S = window.Phase3Story, jobs = [];
// refuse는 단계별 묶음(10/29)이라 안을 다 훑어 voice가 있는 줄을 모은다.
(function walk(x) { if (!x || typeof x !== 'object') return; if (x.voice && x.say) jobs.push([x.voice, x.say]); for (const v of Object.values(x)) walk(v); })(S.refuse);
for (const k of ['help', 'ask']) for (const x of S[k]) if (x.voice) jobs.push([x.voice, x.say]);
jobs.push([S.holdWait.voice, S.holdWait.say]);
for (const m of S.memories) jobs.push([m.voice, [...m.lines, m.clue].filter(Boolean).join(' ')]);
const only = process.argv[2] ? process.argv[2].split(',') : null;
const py = 'C:/Users/admin/Documents/코덱스 섹션/소설/로컬ai/음성/supertonic-venv/Scripts/python.exe';
for (const [id, text] of jobs) {
  if (only && !only.includes(id)) continue;
  execFileSync(py, ['-m', 'supertonic.cli', 'tts', text, '-o', path.join(out, id + '.44k.wav'), '--lang', 'ko', '--voice', 'F1'], { stdio: 'ignore' });
  console.log(id, text);
}
// 44.1kHz로 만든 파일을 22.05kHz로 줄여 같은 이름(.wav)으로 두고 원본(.44k.wav)은 지운다.
for (const f of require('fs').readdirSync(out)) if (f.endsWith('.44k.wav')) { require('./wav-half.cjs')(path.join(out, f), path.join(out, f.replace('.44k', ''))); require('fs').unlinkSync(path.join(out, f)); }

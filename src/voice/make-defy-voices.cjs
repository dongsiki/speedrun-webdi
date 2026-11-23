/* 반항하는 재미 목소리 만들기(2026-11-24, Claude Code). src/phase/defy.js의 LINES 7줄을 기존 AI와 같은 Supertonic F1로 읽어
   assets/audio/defy/<id>.mp3로 둔다(22.05kHz wav → ffmpeg libmp3lame -q:a 3, make-story-voices.cjs·taunt와 같은 방식).
   실행: node src/voice/make-defy-voices.cjs  (이미 있는 mp3는 건너뜀) */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '../..');
const half = require('../phase/phase3/wav-half.cjs');
const py = 'C:/Users/admin/Documents/코덱스 섹션/소설/로컬ai/음성/supertonic-venv/Scripts/python.exe';
const ffmpeg = process.env.FFMPEG || 'C:/Users/admin/Documents/Codex/2026-09-12/unfriendly-digging-prototype/work/elder-dance/encoder/package/ffmpeg.exe';
const src = fs.readFileSync(path.join(__dirname, '../phase/defy.js'), 'utf8');
const LINES = Function('return ' + src.split('const LINES = ')[1].split('};')[0] + '}')();
const out = path.join(root, 'assets/audio/defy'); fs.mkdirSync(out, { recursive: true });
for (const [id, text] of Object.entries(LINES)) {
  const mp3 = path.join(out, id + '.mp3');
  if (fs.existsSync(mp3)) continue;
  const big = path.join(out, id + '.44k.wav'), wav = path.join(out, id + '.wav');
  execFileSync(py, ['-m', 'supertonic.cli', 'tts', text, '-o', big, '--lang', 'ko', '--voice', 'F1'], { stdio: 'ignore' });
  half(big, wav); fs.unlinkSync(big);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '3', mp3], { stdio: 'ignore' });
  fs.unlinkSync(wav);
  console.log(id, fs.statSync(mp3).size, text);
}

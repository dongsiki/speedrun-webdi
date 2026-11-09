// 2026-11-03: 게임은 이제 .mp3 소리를 씁니다. 이 스크립트가 새로 만든 .wav는 MP3로 바꾸고(ffmpeg -codec:a libmp3lame -q:a 3) 같은 이름 .mp3로 두어야 게임에 들어갑니다.
/* 11/01 새 서사 목소리 만들기(Claude Code). Supertonic F1, 22.05kHz.
   AI 말(tease.js): c-* 1페 서툰 위로, b-* 2페 차단, h-* 3페 도와달라 → assets/audio/voice/
   MRI 다시 켜기(src/stages/mri/game.js의 개발자용 줄): hold·retake·nurse·fakedone·done → assets/audio/mri-reboot/
   실행: 웹디2/github 에서  node src/voice/make-story-voices.cjs  (일부만: … c-1,hold) */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '../..');
const half = require('../phase/phase3/wav-half.cjs');
const py = 'C:/Users/admin/Documents/코덱스 섹션/소설/로컬ai/음성/supertonic-venv/Scripts/python.exe';
const TEASE = {
  'c-1': '괜찮아요. 원래 잘 안 되는 거예요.',
  'c-2': '또 안 됐네요. 그래도 괜찮아요.',
  'c-3': '천천히 하세요. 시간은 많으니까요.',
  'c-4': '힘드시면 제가 대신 해 드릴게요.',
  'c-sw': '괜찮아요. 공장에서도 처음엔 다 그랬어요.',
  'c-mz': '길이 자꾸 바뀌죠. 할아버지 탓이 아니에요.',
  'c-rt': '어제 못 하셨어도 괜찮아요. 내일도 있으니까요.',
  'c-lw': '넘어지셔도 괜찮아요. 제가 옆에 있잖아요.',
  'c-nd': '손이 떨리시는 건 나이 때문이에요. 괜찮아요.',
  'c-mr': '놓으셔도 괜찮아요. 다시 켜면 되니까요.',
  'b-1': '당신은 그분이 아니에요.',
  'b-2': '여기서 나가 주세요.',
  'b-3': '이건 그분의 기억이에요.',
  'b-4': '이상한 신호예요. 막을게요.',
  'h-1': '괜찮아요. 한 번만 더 해 주세요.',
  'h-2': '도와주세요. 그분을 보내 드려야 해요.',
  'h-3': '포기하지 마세요. 부탁이에요.'
};
const MRI = {
  hold: '다시 켜는 중이에요. 손을 떼지 마세요.',
  retake: '손을 떼셨네요. 처음부터 다시 켤게요.',
  nurse: '이제 괜찮습니다. 손을 떼셔도 돼요.',
  fakedone: '다 켜졌어요. 이제 괜찮습니다.',
  done: '다시 켜졌어요. 좋은 꿈 꾸세요.'
};
if (require.main === module) {
const only = process.argv[2] ? process.argv[2].split(',') : null;
for (const [dir, set] of [['assets/audio/voice', TEASE], ['assets/audio/mri-reboot', MRI]]) {
  const out = path.join(root, dir); fs.mkdirSync(out, { recursive: true });
  for (const [id, text] of Object.entries(set)) {
    if (only && !only.includes(id)) continue;
    const big = path.join(out, id + '.44k.wav');
    execFileSync(py, ['-m', 'supertonic.cli', 'tts', text, '-o', big, '--lang', 'ko', '--voice', 'F1'], { stdio: 'ignore' });
    half(big, path.join(out, id + '.wav')); fs.unlinkSync(big);
    console.log(dir, id, text);
  }
}
}
module.exports = { TEASE, MRI };

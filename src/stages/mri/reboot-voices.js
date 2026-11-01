/* 11/01 개발자용 MRI = AI가 할배를 가상현실로 다시 켜는 과정(Claude Code). 검사실 목소리(audio.js)를 AI 목소리로 덮어쓴다.
   만들기: node src/voice/make-story-voices.cjs (MRI 묶음). */
window.MriVoices = {
  hold: '@@data:assets/audio/mri-reboot/hold.wav@@',
  retake: '@@data:assets/audio/mri-reboot/retake.wav@@',
  nurse: '@@data:assets/audio/mri-reboot/nurse.wav@@',
  fakedone: '@@data:assets/audio/mri-reboot/fakedone.wav@@',
  done: '@@data:assets/audio/mri-reboot/done.wav@@'
};

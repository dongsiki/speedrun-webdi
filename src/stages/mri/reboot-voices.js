/* 11/01 개발자용 MRI = AI가 할배를 가상현실로 다시 켜는 과정(Claude Code). 검사실 목소리(audio.js)를 AI 목소리로 덮어쓴다.
   만들기: node src/voice/make-story-voices.cjs (MRI 묶음).
   11/17: enter·t1~t5 = 2페 할배 머릿속 테스트, maid = 2페 끝 풀밭 AI 메이드 인사(dream.js에서 씀). */
window.MriVoices = {
  hold: '@@data:assets/audio/mri-reboot/hold.mp3@@',
  retake: '@@data:assets/audio/mri-reboot/retake.mp3@@',
  nurse: '@@data:assets/audio/mri-reboot/nurse.mp3@@',
  fakedone: '@@data:assets/audio/mri-reboot/fakedone.mp3@@',
  done: '@@data:assets/audio/mri-reboot/done.mp3@@',
  enter: '@@data:assets/audio/mri-reboot/enter.mp3@@',
  t1: '@@data:assets/audio/mri-reboot/t1.mp3@@',
  t2: '@@data:assets/audio/mri-reboot/t2.mp3@@',
  t3: '@@data:assets/audio/mri-reboot/t3.mp3@@',
  t4: '@@data:assets/audio/mri-reboot/t4.mp3@@',
  t5: '@@data:assets/audio/mri-reboot/t5.mp3@@',
  maid: '@@data:assets/audio/mri-reboot/maid.mp3@@'
};

// 회상 컷 목록(2026-10-26 초안, 사용자 첨삭 예정). 1안: 꾸미는 취향 때문에 놀림받음.
// img: images/ 안 그림, audio: audio/ 안 음성(없으면 ms 뒤 자동 넘김), cut: 'tear'면 찢기는 전환.
window.FLASHBACK_CUTS = [
  { cut: 'tear', img: 'images/cut1-classroom.jpg', audio: 'audio/line1.wav', text: '열 살. 필통 안에는, 아무도 몰라야 하는 게 있었다.' },
  { cut: 'tear', img: 'images/cut2-snatch.jpg', text: '“야, 이거 뭐냐?”', ms: 2000 },
  { img: 'images/cut3-circle.jpg', text: '“계집애래요! 계집애래요!”', ms: 2600 },
  { img: 'images/cut4-pinned.jpg', audio: 'audio/line4.wav', text: '웃으면, 끝날 줄 알았다.' },
  { img: 'images/cut5-mirror.jpg', audio: 'audio/line5.wav', text: '그날 이후로, 거울을 보지 않았다.', hold: 1300 },
  { cut: 'tear', img: 'images/cut6-present.jpg', audio: 'audio/line6.wav', text: '…그런데 왜, 아직도 버리지 못했을까.', hold: 1800 }
];

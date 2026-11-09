

// 치매 스테이지 본체. 한 권짜리 두꺼운 책이라 장별로 나눴습니다(game/ 폴더). 빌드가 장을 순서대로 이어 붙여 원래와 똑같은 코드가 됩니다.
// 플레이용(01)과 개발자용(02)이 다른 줄은 //#play, //#dev 표시로 구분합니다.
// 장 목록:
//   01-renderer.js  1장. 화면 준비: 3D 화면·카메라·흑백 점 인쇄 효과, 작은 계산 도구
//   02-shape-tools.js  2장. 모양 도구: 상자·선·원통 같은 기본 모양, 벽 메모·사진 만들기
//   03-rooms.js  3장. 방 4개 만들기: 화장실·주방·현관·침실
//   04-state.js  4장. 지금 상태: 몇 회차인지, 어느 방인지, 카메라·소리 상태
//   05-sound-and-actions.js  5장. 소리와 행동: 소리 내기, 방 옮기기, 앉기·냉장고·먹기, 버튼 연결
//   06-pointer-input.js  6장. 마우스 입력: 무엇을 눌렀는지 찾기, 끌어서 둘러보기
//   07-every-frame-updates.js  7장. 매 순간 움직임: 물·주방·버튼·카메라를 조금씩 움직이기
//   08-wall-notes-and-loop.js  8장. 벽 메모와 반복: 벽 메모 글씨를 선명하게 겹치고, 화면을 계속 다시 그리기
(() => {
  'use strict';
/* @inline src/stages/memory/game/01-renderer.js */
/* @inline src/stages/memory/game/02-shape-tools.js */
/* @inline src/stages/memory/game/03-rooms.js */
/* @inline src/stages/memory/game/04-state.js */
/* @inline src/stages/memory/game/05-sound-and-actions.js */
/* @inline src/stages/memory/game/06-pointer-input.js */
/* @inline src/stages/memory/game/07-every-frame-updates.js */
/* @inline src/stages/memory/game/08-wall-notes-and-loop.js */
  resize(); wakeAtBed(); soundUI(); motionUI(); requestAnimationFrame(frame);
})();

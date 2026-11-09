
/* 실 꿰기 (2026-10-19, Claude Code). 불편함: 정밀한 조작의 긴장 — 생각대로 따라주지 않는 손.
 * 조작: 마우스(또는 방향키)로 실 끝을 옮긴다. 손은 늘 떨린다. 누르고 있으면(Space도) 숨을 참아 덜 떨리지만,
 * 숨은 오래 못 참는다. 바늘 몸에 부딪히면 실 끝이 풀리고, 세 번 풀리면 가위로 끝을 잘라 낸다.
 * 실타래가 다 닳으면 실패. 바늘귀(구멍)를 왼쪽에서 오른쪽으로 통과하면 한 번 꿴 것.
 * 2026-10-29 사용자 「실꿰기. 1. 3번 꿰야 패스. 2. 2페,3페에도 1페랑 동일하게 가는 걸로.」(Claude Code):
 * 세 번 꿰야 끝난다. 꿴 실은 바늘귀에 꿰인 채 늘어져 남고, 손은 처음 자리로 돌아와 새 실 끝으로 다시 꿴다.
 * 실타래는 세 번 내내 이어 쓴다. 페이즈마다 다른 규칙 없음(2·3페도 이 규칙 그대로).
 * 움직임은 Windows 애니메이션 효과(동작 줄이기) 설정과 상관없이 돈다. 그림은 모두 이 파일 안에서 그린다. */
// 실 꿰기 본체. 장별로 나눴습니다(game/ 폴더). 빌드가 장을 순서대로 이어 붙여 원래와 똑같은 코드가 됩니다.
// 장 목록:
//   01-setup.js  1장. 준비: 화면·손 그림·처음 상태
//   02-layout.js  2장. 자리: 바늘·실타래·손의 위치와 크기
//   03-sound.js  3장. 소리: 바람 소리·째깍 소리
//   04-input.js  4장. 입력: 마우스·방향키·누르고 있기(숨 참기)
//   05-rules.js  5장. 판정: 부딪힘·실 풀림·통과·끝
//   06-hand-motion.js  6장. 움직임: 떨리는 손과 실 끝 움직이기
//   07-drawing.js  7장. 그림: 바늘·실·손·실타래 그리기
//   08-loop.js  8장. 돌리기: 매 순간 움직이고 다시 그리기, 일시정지
(() => {
  'use strict';
/* @inline src/stages/needle/game/01-setup.js */
/* @inline src/stages/needle/game/02-layout.js */
/* @inline src/stages/needle/game/03-sound.js */
/* @inline src/stages/needle/game/04-input.js */
/* @inline src/stages/needle/game/05-rules.js */
/* @inline src/stages/needle/game/06-hand-motion.js */
/* @inline src/stages/needle/game/07-drawing.js */
/* @inline src/stages/needle/game/08-loop.js */
})();

(function (root) {
  'use strict';
  const ROWS = [8, 7], TOTAL = 15, GOAL = (1 << TOTAL) - 1;
  const positions = Array.from({ length: TOTAL }, (_, i) => {
    const row = i < ROWS[0] ? 0 : 1, col = row ? i - ROWS[0] : i;
    return { row, col, x: (col + (row ? 1 : 0.5)) * 100, y: row ? 195 : 65 };
  });
  function mirror(index) {
    const { row, col } = positions[index];
    return (row ? ROWS[0] : 0) + ROWS[row] - 1 - col;
  }
  function affected(index) {
    const origin = positions[mirror(index)];
    return positions.flatMap((point, i) => {
      return point.row === origin.row && Math.abs(point.col - origin.col) <= 1 ? [i] : [];
    });
  }
  const masks = positions.map((_, i) => affected(i).reduce((mask, n) => mask | (1 << n), 0));
  function toggle(board, index) {
    if (!Number.isInteger(index) || index < 0 || index >= TOTAL) throw new RangeError('Invalid switch');
    return board ^ masks[index];
  }
  const litCount = board => board.toString(2).replace(/0/g, '').length;
  // Work backwards from the goal. Every generated board has a verified solution.
  const distance = Array(GOAL + 1).fill(-1), nextMove = Array(GOAL + 1).fill(-1);
  distance[GOAL] = 0;
  const queue = [GOAL];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const board = queue[cursor];
    for (let i = 0; i < TOTAL; i++) {
      const next = toggle(board, i);
      if (distance[next] !== -1) continue;
      distance[next] = distance[board] + 1;
      nextMove[next] = i; queue.push(next);
    }
  }
  function solution(board) {
    if (!Number.isInteger(board) || distance[board] < 0 || board < 0 || board > GOAL) return null;
    const moves = [];
    while (board !== GOAL) { const index = nextMove[board]; moves.push(index); board = toggle(board, index); }
    return moves;
  }
  // 10/13: 판 깊게. 정답까지 최단 7~9수.
  const pool = queue.filter(board => distance[board] >= 7 && distance[board] <= 9 && litCount(board) >= 6 && litCount(board) <= 10);
  const INITIAL = [0, 3, 10, 11, 5, 13, 7, 2].reduce(toggle, GOAL); // 8수, 켜진 전구 9개
  function createBoard(exclude = INITIAL, random = Math.random) {
    const choices = pool.filter(board => board !== exclude);
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  }
  const api = { ROWS, TOTAL, GOAL, INITIAL, positions, mirror, affected, masks, toggle, litCount, solution, createBoard, distance };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SwitchPuzzle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

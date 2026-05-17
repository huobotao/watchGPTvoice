// Tic-Tac-Toe full enumeration engine.
// A "game" is a sequence of legal moves that ends as soon as a player wins,
// or the board is full (draw). Players alternate X, O, X, O, ... starting with X.
//
// Memoized by (board, playerToMove). For each state we cache:
//   - total counts of {X-win, O-win, draw} games from this state
//   - histogram of "remaining moves until terminal" by outcome
// so we can derive game-length distributions without rebuilding the tree.

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWin(board, p) {
  for (const line of LINES) {
    if (board[line[0]] === p && board[line[1]] === p && board[line[2]] === p) return true;
  }
  return false;
}

function winningLine(board) {
  for (const line of LINES) {
    const a = board[line[0]];
    if (a && a === board[line[1]] && a === board[line[2]]) return { player: a, line };
  }
  return null;
}

function isFull(board) {
  for (let i = 0; i < 9; i++) if (!board[i]) return false;
  return true;
}

function emptyCount(board) {
  let n = 0;
  for (let i = 0; i < 9; i++) if (!board[i]) n++;
  return n;
}

const memo = new Map();

function key(board, player) {
  // 9 chars + player char
  let s = '';
  for (let i = 0; i < 9; i++) s += board[i] || '.';
  return s + player;
}

// Returns:
//   {
//     x, o, d, total,          // total counts of games from here
//     after: Map<remaining, {x, o, d}>   // games ending after `remaining` more moves
//   }
function countOutcomes(board, player) {
  const k = key(board, player);
  const cached = memo.get(k);
  if (cached) return cached;

  const other = player === 'X' ? 'O' : 'X';

  // Terminal: previous mover (other) just won? Check both for safety.
  if (checkWin(board, 'X')) {
    const r = { x: 1, o: 0, d: 0, total: 1, after: new Map([[0, { x: 1, o: 0, d: 0 }]]) };
    memo.set(k, r);
    return r;
  }
  if (checkWin(board, 'O')) {
    const r = { x: 0, o: 1, d: 0, total: 1, after: new Map([[0, { x: 0, o: 1, d: 0 }]]) };
    memo.set(k, r);
    return r;
  }
  if (isFull(board)) {
    const r = { x: 0, o: 0, d: 1, total: 1, after: new Map([[0, { x: 0, o: 0, d: 1 }]]) };
    memo.set(k, r);
    return r;
  }

  let x = 0, o = 0, d = 0, total = 0;
  const after = new Map();
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = player;
    const sub = countOutcomes(board, other);
    board[i] = '';
    x += sub.x; o += sub.o; d += sub.d; total += sub.total;
    for (const [r, v] of sub.after) {
      const rr = r + 1;
      const prev = after.get(rr) || { x: 0, o: 0, d: 0 };
      prev.x += v.x; prev.o += v.o; prev.d += v.d;
      after.set(rr, prev);
    }
  }
  const r = { x, o, d, total, after };
  memo.set(k, r);
  return r;
}

function globalStats() {
  const board = new Array(9).fill('');
  const r = countOutcomes(board, 'X');
  // game length == moves played at terminal == remaining moves from empty
  const lengthDist = {};
  for (const [rem, v] of r.after) lengthDist[rem] = v;
  return { total: r.total, x: r.x, o: r.o, d: r.d, lengthDist };
}

function firstMoveStats() {
  const out = [];
  for (let i = 0; i < 9; i++) {
    const board = new Array(9).fill('');
    board[i] = 'X';
    const r = countOutcomes(board, 'O');
    out.push({ cell: i, x: r.x, o: r.o, d: r.d, total: r.total });
  }
  return out;
}

// For tree explorer: from `board` with `player` to move, list each legal move
// and the subtree outcome counts after that move is played.
function moveOptions(board, player) {
  if (winningLine(board) || isFull(board)) return null;
  const other = player === 'X' ? 'O' : 'X';
  const opts = [];
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = player;
    const r = countOutcomes(board, other);
    opts.push({ cell: i, x: r.x, o: r.o, d: r.d, total: r.total });
    board[i] = '';
  }
  return opts;
}

// Build a hierarchical structure for sunburst, limited to `maxDepth` plies
// (root = empty board at depth 0). At maxDepth we stop expanding children
// and the node is treated as a leaf whose value = total games passing through.
function buildSunburst(maxDepth) {
  function rec(board, player, depth) {
    // countOutcomes(board, player) counts all completions assuming `player` is to move.
    const r = countOutcomes(board, player);
    const isTerminal = !!winningLine(board) || isFull(board);
    const node = {
      name: depth === 0 ? 'start' : '',
      depth,
      x: r.x, o: r.o, d: r.d, total: r.total,
      terminal: isTerminal,
      board: board.slice(),
    };
    if (isTerminal || depth >= maxDepth) return node;
    const other = player === 'X' ? 'O' : 'X';
    node.children = [];
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = player;
      const child = rec(board, other, depth + 1);
      child.move = i;
      child.player = player;
      node.children.push(child);
      board[i] = '';
    }
    return node;
  }
  const board = new Array(9).fill('');
  return rec(board, 'X', 0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LINES, checkWin, winningLine, isFull, emptyCount,
    countOutcomes, globalStats, firstMoveStats, moveOptions, buildSunburst,
  };
}
if (typeof window !== 'undefined') {
  window.TTT = {
    LINES, checkWin, winningLine, isFull, emptyCount,
    countOutcomes, globalStats, firstMoveStats, moveOptions, buildSunburst,
  };
}

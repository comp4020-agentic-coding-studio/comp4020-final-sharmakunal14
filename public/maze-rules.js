// Shared by the server (authority) and the browser (prediction only).

export const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

export function gateOpen(game, gate) {
  return (game.switchOn?.[gate.switch] ?? false) === gate.openWhen;
}

export function passable(game, x, y) {
  if (game.maze[y]?.[x] === ".") return true;
  return (game.gates ?? []).some((gate) => gate.x === x && gate.y === y && gateOpen(game, gate));
}

export function switchAt(game, x, y) {
  return (game.switches ?? []).findIndex((s) => s.x === x && s.y === y);
}

export function goalOf(game, slot) {
  const size = game.maze.length;
  return slot === 0 ? { x: size - 2, y: size - 2 } : { x: 1, y: 1 };
}

// Shared by the server (authority) and the browser (prediction only).

export const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

export function gateOpen(game, gate) {
  return (game.switchOn?.[gate.switch] ?? false) === gate.openWhen;
}

// Pulse gates cycle open then closed from the race start. Without a time (or
// before the start) they count as closed, the answer that never adds a route.
export function pulseOpen(game, pulse, now) {
  if (now == null || game.startsAt == null || now < game.startsAt) return false;
  return (now - game.startsAt) % (pulse.openMs + pulse.closedMs) < pulse.openMs;
}

// Milliseconds until a pulse gate next changes, or null when it is not running.
export function pulseRemaining(game, pulse, now) {
  if (now == null || game.startsAt == null || now < game.startsAt) return null;
  const phase = (now - game.startsAt) % (pulse.openMs + pulse.closedMs);
  return phase < pulse.openMs ? pulse.openMs - phase : pulse.openMs + pulse.closedMs - phase;
}

export function passable(game, x, y, now) {
  if (game.maze[y]?.[x] === ".") return true;
  if ((game.pulses ?? []).some((pulse) => pulse.x === x && pulse.y === y && pulseOpen(game, pulse, now))) return true;
  return (game.gates ?? []).some((gate) => gate.x === x && gate.y === y && gateOpen(game, gate));
}

export function switchAt(game, x, y) {
  return (game.switches ?? []).findIndex((s) => s.x === x && s.y === y);
}

export function goalOf(game, slot) {
  const size = game.maze.length;
  return slot === 0 ? { x: size - 2, y: size - 2 } : { x: 1, y: 1 };
}

// Sight radius in a fog race (decision 0011): straight-line grid distance.
export const FOG_RADIUS = 3;
export function inSight(viewer, x, y, radius = FOG_RADIUS) {
  return !viewer || (x - viewer.x) ** 2 + (y - viewer.y) ** 2 <= radius * radius;
}

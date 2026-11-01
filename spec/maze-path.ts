import { DIRECTIONS, entrance } from "../maze-game.ts";
import type { Direction, Game } from "../maze-game.ts";
import { passable } from "../public/maze-rules.js";

type Board = Pick<Game, "maze"> & Partial<Pick<Game, "gates" | "switchOn">>;

// Test-only breadth-first solver. Production clients do not receive a route.
export function route(game: Board, start = entrance(game, 0), end = entrance(game, 1)): Direction[] {
  const queue = [{ ...start, path: [] as Direction[] }];
  const seen = new Set([`${start.x},${start.y}`]);
  for (const point of queue) {
    if (point.x === end.x && point.y === end.y) return point.path;
    for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
      const x = point.x + dx, y = point.y + dy, key = `${x},${y}`;
      if (!passable(game, x, y) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x, y, path: [...point.path, dir as Direction] });
    }
  }
  throw new Error("No path to the goal");
}

// Passages are two-way, so every cell reached from a goal can reach that goal.
export function reachable(game: Board, from: { x: number; y: number }): Set<string> {
  const seen = new Set([`${from.x},${from.y}`]), queue = [from];
  for (const p of queue) for (const [dx, dy] of Object.values(DIRECTIONS)) {
    const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
    if (passable(game, x, y) && !seen.has(key)) { seen.add(key); queue.push({ x, y }); }
  }
  return seen;
}

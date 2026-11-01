import { DIRECTIONS, entrance } from "../maze-game.ts";
import type { Direction } from "../maze-game.ts";

// Test-only breadth-first solver. Production clients do not receive a route.
export function route(maze: readonly string[], start = entrance(0), end = entrance(1)): Direction[] {
  const queue = [{ ...start, path: [] as Direction[] }];
  const seen = new Set([`${start.x},${start.y}`]);
  for (const point of queue) {
    if (point.x === end.x && point.y === end.y) return point.path;
    for (const [dir, [dx, dy]] of Object.entries(DIRECTIONS)) {
      const x = point.x + dx, y = point.y + dy, key = `${x},${y}`;
      if (maze[y]?.[x] !== "." || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x, y, path: [...point.path, dir as Direction] });
    }
  }
  throw new Error("No path to the goal");
}

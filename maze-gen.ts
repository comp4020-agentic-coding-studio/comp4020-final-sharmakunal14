export type Point = { x: number; y: number };
export type Gate = Point & { switch: number; openWhen: boolean };
// A wall that opens for openMs then closes for closedMs, repeating from the race start.
export type Pulse = Point & { openMs: number; closedMs: number };
export type Layout = { mazeId: string; maze: string[]; switches: Point[]; gates: Gate[]; pulses: Pulse[]; rifts: Point[] };

export const CELLS = 7;
export const SIZE = CELLS * 2 + 1;
export const PULSE_OPEN_MS = 2_500;
export const PULSE_CLOSED_MS = 2_500;
// Rift limits (decision 0012): walking steps from the start to the entrance, and the largest share of the route it may save.
export const RIFT_DEPTH = 8;
export const RIFT_MAX_SHARE = 1 / 3;

// What a maze contains. The daily maze uses DAILY; levels (decision 0013)
// choose their own size and mechanics.
export type Spec = {
  cells: number;
  switches: boolean;
  // One entry per symmetric pulse pair: its open and closed time in ms.
  pulses: [number, number][];
  rifts: boolean;
  // Extra walls opened (in symmetric pairs) to add loops, as a share of walls left.
  loops?: number;
  // Keep the rift a gamble (deep entrance, capped saving). Quick play only;
  // levels keep the rifts their pinned layouts were tuned with.
  riftLimit?: boolean;
};
export const DAILY: Spec = { cells: CELLS, switches: true, pulses: [[PULSE_OPEN_MS, PULSE_CLOSED_MS]], rifts: true, riftLimit: true };

export function sydneyDate(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
}

function random(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (p: Point) => `${p.x},${p.y}`;

function distances(grid: string[][], from: Point, open = new Set<string>()): Map<string, number> {
  const seen = new Map([[key(from), 0]]), queue = [from];
  for (const p of queue) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: p.x + dx, y: p.y + dy };
      if ((grid[n.y]?.[n.x] === "." || open.has(key(n))) && !seen.has(key(n))) {
        seen.set(key(n), seen.get(key(p))! + 1);
        queue.push(n);
      }
    }
  }
  return seen;
}

// Breadth-first distance on the base grid where a step onto rift a lands on b
// and vice versa. Null when the goal cannot be reached.
function riftDistance(grid: string[][], from: Point, to: Point, a: Point | null, b: Point | null, open = new Set<string>()): number | null {
  const seen = new Map([[key(from), 0]]), queue = [from];
  for (const p of queue) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let n = { x: p.x + dx, y: p.y + dy };
      if (grid[n.y]?.[n.x] !== "." && !open.has(key(n))) continue;
      if (a && b) { if (key(n) === key(a)) n = b; else if (key(n) === key(b)) n = a; }
      if (seen.has(key(n))) continue;
      seen.set(key(n), seen.get(key(p))! + 1);
      queue.push(n);
    }
  }
  return seen.get(key(to)) ?? null;
}

// `seed` defaults to the maze id; levels pass a tuned seed so their
// mechanics are guaranteed present.
export function generate(mazeId: string, spec: Spec = DAILY, seed = mazeId): Layout {
  // Pulses draw from their own stream so adding them left every date's
  // maze, switches and gates exactly as before.
  const rand = random(seed), pulseRand = random(`${seed}:pulse`), riftRand = random(`${seed}:rift`);
  // Deterministic retries on the same stream until a layout has a switch pair.
  for (let attempt = 0; attempt < 50; attempt++) {
    const layout = attemptLayout(mazeId, spec, rand, pulseRand, riftRand);
    if (layout.gates.length || !spec.switches) return layout;
  }
  throw new Error(`No playable layout for ${mazeId}`);
}

function attemptLayout(mazeId: string, spec: Spec, rand: () => number, pulseRand: () => number, riftRand: () => number): Layout {
  const CELLS = spec.cells, SIZE = CELLS * 2 + 1;
  const rot = (p: Point): Point => ({ x: SIZE - 1 - p.x, y: SIZE - 1 - p.y });
  const grid = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill("#"));
  for (let y = 1; y < SIZE; y += 2) for (let x = 1; x < SIZE; x += 2) grid[y][x] = ".";

  // Kruskal over cells, adding each wall together with its 180° partner so
  // the layout stays rotationally symmetric for both players.
  const parent = Array.from({ length: CELLS * CELLS }, (_, i) => i);
  const find = (i: number): number => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const cellOf = (x: number, y: number) => ((y - 1) / 2) * CELLS + (x - 1) / 2;
  const walls: Point[] = [];
  for (let y = 1; y < SIZE - 1; y++) for (let x = 1; x < SIZE - 1; x++) {
    if ((x % 2 === 0) !== (y % 2 === 0)) walls.push({ x, y });
  }
  for (let i = walls.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [walls[i], walls[j]] = [walls[j], walls[i]];
  }
  const ends = (w: Point): [number, number] => w.x % 2 === 0
    ? [cellOf(w.x - 1, w.y), cellOf(w.x + 1, w.y)] : [cellOf(w.x, w.y - 1), cellOf(w.x, w.y + 1)];
  const join = (w: Point) => { const [a, b] = ends(w); parent[find(a)] = find(b); grid[w.y][w.x] = "."; };
  const separate = (w: Point) => { const [a, b] = ends(w); return find(a) !== find(b); };
  // Opening each wall together with its 180° partner keeps the layout
  // rotationally symmetric; a partner that closes a loop just adds a loop.
  for (const w of walls) {
    if (!separate(w)) continue;
    join(w);
    const r = rot(w);
    if (grid[r.y][r.x] === "#") separate(r) ? join(r) : (grid[r.y][r.x] = ".");
  }
  // Extra loops (more than one route) for levels that ask for them. Only
  // walls between two passages, in symmetric pairs; the daily maze adds none.
  if (spec.loops) {
    const closed = walls.filter((w) => grid[w.y][w.x] === "#" && key(w) !== key(rot(w)));
    for (const w of closed.slice(0, Math.round(closed.length * spec.loops / 2))) {
      grid[w.y][w.x] = ".";
      const r = rot(w);
      grid[r.y][r.x] = ".";
    }
  }

  const start = { x: 1, y: 1 }, goal = { x: SIZE - 2, y: SIZE - 2 };
  const base = distances(grid, start).get(key(goal))!;
  const fromStart = distances(grid, start);
  const blocked = new Set([key(start), key(goal), key(rot(start))]);

  // Gate candidates are base walls between two passages. Opening one only
  // adds a passage, so no switch state can disconnect the maze.
  const candidates = walls.filter((w) => grid[w.y][w.x] === "#" && key(w) !== key(rot(w)))
    .map((w) => {
      const open = new Set([key(w), key(rot(w))]);
      return { w, saving: base - distances(grid, start, open).get(key(goal))! };
    })
    .filter((c) => c.saving >= 2)
    .sort((a, b) => b.saving - a.saving || rand() - 0.5);
  const chosen: Point[] = [];
  for (const { w } of candidates) {
    const near = (p: Point) => Math.abs(p.x - w.x) + Math.abs(p.y - w.y) < 4;
    if (chosen.some((c) => near(c) || near(rot(c)))) continue;
    chosen.push(w);
    if (chosen.length === 2) break;
  }

  const switches: Point[] = [];
  const gates: Gate[] = [];
  if (spec.switches && chosen.length === 2) {
    const options = [...fromStart].map(([k, d]) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y, d };
    }).filter((p) => p.x % 2 === 1 && p.y % 2 === 1 && p.x + p.y < SIZE - 3 && p.d >= 4 && p.d <= 10 && !blocked.has(key(p)));
    const own = options[Math.floor(rand() * options.length)];
    if (own) {
      switches.push({ x: own.x, y: own.y }, rot(own));
      const [shortcut, closing] = rand() < 0.5 ? chosen : [chosen[1], chosen[0]];
      gates.push(
        { ...shortcut, switch: 0, openWhen: true }, { ...closing, switch: 0, openWhen: false },
        { ...rot(shortcut), switch: 1, openWhen: true }, { ...rot(closing), switch: 1, openWhen: false },
      );
    }
  }

  // Symmetric pulse pairs: shortcuts away from the switch gates and both
  // entrances. Closed, each is just a wall, so it can never disconnect the maze.
  const pulses: Pulse[] = [];
  const clear = (w: Point, others: Point[], gap: number) =>
    others.every((o) => Math.abs(o.x - w.x) + Math.abs(o.y - w.y) >= gap);
  for (const [openMs, closedMs] of spec.pulses) {
    const taken = [...gates, ...pulses].flatMap((g) => [g, rot(g)]);
    const pulseOptions = walls.filter((w) => grid[w.y][w.x] === "#" && key(w) !== key(rot(w))
      && clear(w, taken, 2) && clear(rot(w), taken, 2) && clear(w, [start, goal], 2) && clear(w, [rot(w)], 2))
      .map((w) => ({ w, saving: base - distances(grid, start, new Set([key(w), key(rot(w))])).get(key(goal))! }))
      .filter((c) => c.saving >= 1)
      .sort((a, b) => b.saving - a.saving);
    // Choose among the best few so the shortcut is worth timing.
    const pick = pulseOptions[Math.floor(pulseRand() * Math.min(3, pulseOptions.length))];
    if (pick) {
      for (const p of [pick.w, rot(pick.w)]) pulses.push({ ...p, openMs, closedMs });
    }
  }

  // One linked rift pair (decision 0012) on two open cells that are each
  // other's 180° rotation, so the pair is its own mirror and both players get
  // the same jump. A rift only adds an edge, so reachability is unchanged.
  const rifts: Point[] = [];
  const busy = [start, goal, ...switches, ...gates, ...pulses];
  const riftOptions: { p: Point; saving: number }[] = [];
  // Savings are measured as the race starts: switches off, so gates with
  // openWhen false are open.
  const startOpen = new Set(gates.filter((g) => !g.openWhen).map(key));
  const startBase = riftDistance(grid, start, goal, null, null, startOpen)!;
  for (let y = 1; y < SIZE - 1; y += 2) for (let x = 1; x < SIZE - 1; x += 2) {
    const p = { x, y }, r = rot(p);
    if (p.y > r.y || (p.y === r.y && p.x >= r.x)) continue; // each pair once, and never the centre
    if (!clear(p, busy, 3) || !clear(r, busy, 3) || Math.abs(p.x - r.x) + Math.abs(p.y - r.y) < 6) continue;
    // Stepping onto either rift always lands on the other, so a rift cell can
    // never be walked through; measure the real route under that rule.
    const best = riftDistance(grid, start, goal, p, r, startOpen);
    if (best === null) continue;
    riftOptions.push({ p, saving: startBase - best });
  }
  // The rift must be a gamble, not a free win: its entrance sits deep in the
  // maze (both cells at least RIFT_DEPTH steps from the start), so by symmetry
  // the landing is as far from the goal, and it saves at most a third of the route.
  const walk = distances(grid, start, startOpen);
  riftOptions.sort((a, b) => b.saving - a.saving);
  const worth = riftOptions.filter((o) => o.saving >= 4 && (!spec.riftLimit
    || (o.saving <= Math.max(4, Math.floor(startBase * RIFT_MAX_SHARE))
      && Math.min(walk.get(key(o.p)) ?? 0, walk.get(key(rot(o.p))) ?? 0) >= RIFT_DEPTH)));
  const riftPick = worth[Math.floor(riftRand() * Math.min(4, worth.length))];
  if (spec.rifts && riftPick) rifts.push(riftPick.p, rot(riftPick.p));
  return { mazeId, maze: grid.map((row) => row.join("")), switches, gates, pulses, rifts };
}

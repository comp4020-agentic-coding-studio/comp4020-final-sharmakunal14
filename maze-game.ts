export const MAZE = [
  "#############",
  "#.....#.....#",
  "#.###.#.###.#",
  "#...#...#...#",
  "###.###.#.###",
  "#...#...#...#",
  "#.###.#.###.#",
  "#...#...#...#",
  "###.#.###.###",
  "#...#...#...#",
  "#.###.#.###.#",
  "#.....#.....#",
  "#############",
] as const;

export const COUNTDOWN_MS = 3_000;
export const MOVE_INTERVAL_MS = 140;
export const RACE_LIMIT_MS = 10 * 60_000;
export const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
export type Direction = keyof typeof DIRECTIONS;
export type Identity = { id: string; name: string };
export type Player = Identity & {
  slot: 0 | 1; x: number; y: number; ready: boolean; sequence: number; lastMoveAt: number;
};
export type Game = {
  id: string;
  maze: readonly string[];
  players: Player[];
  status: "waiting" | "countdown" | "racing" | "finished" | "interrupted";
  revision: number;
  createdAt: number;
  startsAt: number | null;
  finishedAt: number | null;
  winnerId: string | null;
  interruption: "server_restart" | "time_limit" | null;
};

export class GameError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && Object.hasOwn(DIRECTIONS, value);
}

export function entrance(slot: number): { x: number; y: number } {
  return slot === 0 ? { x: 1, y: 1 } : { x: 11, y: 11 };
}

function player(identity: Identity, slot: 0 | 1): Player {
  return { ...identity, slot, ...entrance(slot), ready: false, sequence: 0, lastMoveAt: 0 };
}

export function newGame(id: string, identity: Identity, now: number): Game {
  return {
    id, maze: MAZE, players: [player(identity, 0)], status: "waiting", revision: 1,
    createdAt: now, startsAt: null, finishedAt: null, winnerId: null, interruption: null,
  };
}

export function joinGame(game: Game, identity: Identity): Game {
  if (game.players.some((p) => p.id === identity.id)) return game;
  if (game.players.length === 2 || game.status !== "waiting") {
    throw new GameError("ROOM_FULL", "This race already has two players. Create a new race.");
  }
  return { ...game, players: [...game.players, player(identity, 1)], revision: game.revision + 1 };
}

export function readyPlayer(game: Game, actorId: string, now: number): Game {
  const current = game.players.find((p) => p.id === actorId);
  if (!current) throw new GameError("NOT_A_PLAYER", "Join this race first.", 403);
  if (game.status !== "waiting" || current.ready) return game;
  const players = game.players.map((p) => p.id === actorId ? { ...p, ready: true } : p);
  const start = players.length === 2 && players.every((p) => p.ready);
  return {
    ...game, players, revision: game.revision + 1,
    status: start ? "countdown" : "waiting", startsAt: start ? now + COUNTDOWN_MS : null,
  };
}

export function advanceGame(game: Game, now: number): Game {
  if (game.startsAt === null || !["countdown", "racing"].includes(game.status)) return game;
  if (now >= game.startsAt + RACE_LIMIT_MS) {
    return { ...game, status: "interrupted", interruption: "time_limit", revision: game.revision + 1 };
  }
  if (game.status === "countdown" && now >= game.startsAt) {
    return { ...game, status: "racing", revision: game.revision + 1 };
  }
  return game;
}

export function movePlayer(game: Game, actorId: string, direction: Direction, sequence: number, now: number): Game {
  const current = game.players.find((p) => p.id === actorId);
  if (!current) throw new GameError("NOT_A_PLAYER", "Only the two players can move.", 403);
  // Retrying an acknowledged command must never move the player twice.
  if (sequence === current.sequence && sequence > 0) return game;
  if (sequence !== current.sequence + 1) throw new GameError("STALE_MOVE", "Your position changed. Try moving again.");
  if (game.status !== "racing" || game.startsAt === null || now < game.startsAt) {
    throw new GameError("NOT_RACING", "Movement is available only during the race.");
  }
  if (now - current.lastMoveAt < MOVE_INTERVAL_MS) throw new GameError("TOO_FAST", "Move a little more slowly.", 429);
  const [dx, dy] = DIRECTIONS[direction];
  const x = current.x + dx, y = current.y + dy;
  if (game.maze[y]?.[x] !== ".") throw new GameError("WALL", "There is a wall in that direction.");
  const goal = entrance(1 - current.slot);
  const won = x === goal.x && y === goal.y;
  return {
    ...game, revision: game.revision + 1,
    players: game.players.map((p) => p.id === actorId ? { ...p, x, y, sequence, lastMoveAt: now } : p),
    status: won ? "finished" : "racing", winnerId: won ? actorId : null, finishedAt: won ? now : null,
  };
}

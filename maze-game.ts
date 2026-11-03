import { generate, sydneyDate } from "./maze-gen.ts";
import { levelById, mazeIdOf } from "./public/maze-levels.js";
import type { Gate, Layout, Point, Pulse, Spec } from "./maze-gen.ts";
import { DIRECTIONS, gateOpen, goalOf, landing, passable, switchAt } from "./public/maze-rules.js";
import { defaultLook } from "./public/maze-look.js";
import { cleanText, MAX_CHAT, REACTIONS } from "./public/maze-chat-rules.js";
import type { Look } from "./public/maze-look.js";

export { DIRECTIONS };
export const COUNTDOWN_MS = 3_000;
export const MOVE_INTERVAL_MS = 140;
export const BURST = 4;
export const SWITCH_COOLDOWN_MS = 1_500;
export const MAX_BATCH = 8;
export const RACE_LIMIT_MS = 10 * 60_000;
export type Direction = keyof typeof DIRECTIONS;
export type Action = Direction | "flip";
export type Identity = { id: string; name: string };
export type Player = Identity & {
  slot: 0 | 1; x: number; y: number; ready: boolean; sequence: number;
  tokens: number; tokensAt: number;
  // How the avatar is drawn. Presentation only; absent in games saved before looks existed.
  look: Look;
};
export type Game = {
  id: string;
  mazeId: string;
  maze: readonly string[];
  switches: Point[];
  gates: Gate[];
  // Limited sight for both players (decision 0011). Presentation only.
  fog?: boolean;
  // The campaign level this race is on (decision 0013); absent for the daily maze.
  level?: string;
  // Timed gates (decision 0010). Absent in races saved before they existed.
  pulses?: Pulse[];
  // A linked pair of teleporting cells (decision 0012). Absent in older races.
  rifts?: Point[];
  switchOn: boolean[];
  switchAt: number[];
  players: Player[];
  status: "waiting" | "countdown" | "racing" | "finished" | "interrupted";
  revision: number;
  createdAt: number;
  startsAt: number | null;
  finishedAt: number | null;
  winnerId: string | null;
  interruption: "server_restart" | "time_limit" | "forfeit" | null;
  // Set when a player leaves a started race: it is cancelled and nothing is scored.
  forfeitedBy?: string;
  // The last few chat lines and reactions, oldest first. Saved with the game so a
  // reconnect or reload shows the conversation, but never used by the rules.
  chat?: ChatLine[];
  // Set once either player asks for a rematch; both then join this game.
  rematchId?: string;
  // Who asked first, so the other player can be told.
  rematchBy?: string;
  // Set when the next race is the following level rather than the same one.
  rematchLevel?: string;
};

// What a spectator or an outside visitor may see: the race, not the players'
// private chat or rematch plans.
// `rematched` tells a spectator to follow the link to the next race, without
// revealing the new race's id (which would let anyone take a seat).
export type PublicGame = Omit<Game, "chat" | "rematchId" | "rematchBy" | "rematchLevel"> & { rematched?: true };
export function publicGame(game: Game): PublicGame {
  const { chat: _chat, rematchId: _id, rematchBy: _by, rematchLevel: _level, ...rest } = game;
  return game.rematchId ? { ...rest, rematched: true } : rest;
}
export type ChatLine = { n: number; at: number; slot: 0 | 1; kind: "text" | "reaction"; text: string };
export const CHAT_KEEP = 30;
export const CHAT_GAP_MS = 400;
export const CHAT_BURST = 5;
export const CHAT_WINDOW_MS = 10_000;
export type LogEntry = { at: number; slot: 0 | 1; kind: "step" | "flip" | "rift"; x: number; y: number; switch: number | null; on: boolean | null };

export class GameError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const layouts = new Map<string, Layout>();
export function layoutFor(mazeId: string): Layout {
  let layout = layouts.get(mazeId);
  if (!layout) {
    // Level mazes (decision 0013) are `level-<id>` with the level's own spec.
    const level = mazeId.startsWith("level-") ? levelById(mazeId.slice(6)) : null;
    layouts.set(mazeId, layout = level ? generate(mazeId, level.spec as Spec, level.seed ?? mazeId) : generate(mazeId));
  }
  return layout;
}
export function levelLayout(levelId: string): Layout {
  const level = levelById(levelId);
  if (!level) throw new GameError("NO_LEVEL", "That level does not exist.", 400);
  return layoutFor(mazeIdOf(level));
}
export const todaysLayout = (now = Date.now()) => layoutFor(sydneyDate(now));

export function isAction(value: unknown): value is Action {
  return value === "flip" || (typeof value === "string" && Object.hasOwn(DIRECTIONS, value));
}

export function entrance(game: Pick<Game, "maze">, slot: number): Point {
  return goalOf(game, 1 - slot);
}

function player(game: Pick<Game, "maze">, identity: Identity, slot: 0 | 1, look?: Look): Player {
  return { ...identity, slot, ...entrance(game, slot), ready: false, sequence: 0, tokens: 0, tokensAt: 0, look: look ?? defaultLook(slot) };
}

export function newGame(id: string, identity: Identity, now: number, layout = todaysLayout(now), look?: Look, fog = false, level?: string): Game {
  const base = {
    id, mazeId: layout.mazeId, maze: layout.maze, switches: layout.switches, gates: layout.gates, pulses: layout.pulses, rifts: layout.rifts,
    switchOn: layout.switches.map(() => false), switchAt: layout.switches.map(() => 0),
  };
  return {
    ...base, ...(fog ? { fog: true } : {}), ...(level ? { level } : {}), players: [player(base, identity, 0, look)], status: "waiting", revision: 1,
    createdAt: now, startsAt: null, finishedAt: null, winnerId: null, interruption: null,
  };
}

export function joinGame(game: Game, identity: Identity, look?: Look): Game {
  if (game.players.some((p) => p.id === identity.id)) return game;
  if (game.players.length === 2 || game.status !== "waiting") {
    throw new GameError("ROOM_FULL", "This race already has two players. Create a new race.");
  }
  return { ...game, players: [...game.players, player(game, identity, 1, look)], revision: game.revision + 1 };
}

// A look can change only while the room is waiting, so a race and its replay
// always show the avatars that actually started it.
export function setLook(game: Game, actorId: string, look: Look): Game {
  const current = game.players.find((p) => p.id === actorId);
  if (!current) throw new GameError("NOT_A_PLAYER", "Join this race first.", 403);
  if (game.status !== "waiting") throw new GameError("LOOK_LOCKED", "Avatars are locked once the countdown starts.");
  if (JSON.stringify(current.look) === JSON.stringify(look)) return game;
  return { ...game, players: game.players.map((p) => p.id === actorId ? { ...p, look } : p), revision: game.revision + 1 };
}

// Adds a text line or a named reaction. Only the two players may talk, a rival
// can always mute locally, and a flood is refused rather than queued.
export function addChat(game: Game, actorId: string, input: { text?: unknown; reaction?: unknown }, now: number): Game {
  const speaker = game.players.find((p) => p.id === actorId);
  if (!speaker) throw new GameError("NOT_A_PLAYER", "Join this race first.", 403);
  let kind: ChatLine["kind"], text: string;
  if (input.reaction !== undefined) {
    if (typeof input.reaction !== "string" || !Object.hasOwn(REACTIONS, input.reaction)) throw new GameError("INVALID_CHAT", "That is not an available reaction.", 400);
    kind = "reaction"; text = input.reaction;
  } else {
    const clean = cleanText(input.text);
    if (!clean) throw new GameError("INVALID_CHAT", `Write a message of up to ${MAX_CHAT} characters.`, 400);
    kind = "text"; text = clean;
  }
  const lines = game.chat ?? [], mine = lines.filter((l) => l.slot === speaker.slot);
  const last = mine.at(-1);
  if (last && now - last.at < CHAT_GAP_MS) throw new GameError("CHAT_TOO_FAST", "Slow down a little.", 429);
  if (mine.filter((l) => now - l.at < CHAT_WINDOW_MS).length >= CHAT_BURST) throw new GameError("CHAT_TOO_FAST", "Slow down a little.", 429);
  const n = (lines.at(-1)?.n ?? 0) + 1;
  return { ...game, chat: [...lines, { n, at: now, slot: speaker.slot, kind, text }].slice(-CHAT_KEEP), revision: game.revision + 1 };
}

export function readyPlayer(game: Game, actorId: string, now: number): Game {
  const current = game.players.find((p) => p.id === actorId);
  if (!current) throw new GameError("NOT_A_PLAYER", "Join this race first.", 403);
  if (game.status !== "waiting" || current.ready) return game;
  const start = game.players.length === 2 && game.players.every((p) => p.ready || p.id === actorId);
  const startsAt = start ? now + COUNTDOWN_MS : null;
  const players = game.players.map((p) => ({
    ...p, ready: p.ready || p.id === actorId, ...(startsAt === null ? {} : { tokens: 1, tokensAt: startsAt }),
  }));
  return { ...game, players, revision: game.revision + 1, status: start ? "countdown" : "waiting", startsAt };
}

// Leaving a started race cancels it for both players: no winner, no best time.
// Cancelling is not a win, so a player who quits a second in cannot hand the
// rival an unearned result.
export function forfeitGame(game: Game, actorId: string): Game {
  if (!game.players.some((p) => p.id === actorId)) throw new GameError("NOT_A_PLAYER", "Join this race first.", 403);
  if (game.status === "interrupted" && game.interruption === "forfeit") return game;
  if (game.status !== "countdown" && game.status !== "racing") throw new GameError("NOT_RACING", "Only a race in progress can be left.");
  return { ...game, status: "interrupted", interruption: "forfeit", forfeitedBy: actorId, winnerId: null, finishedAt: null, revision: game.revision + 1 };
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

function act(game: Game, actorId: string, action: Action, sequence: number, now: number): { game: Game; entry: LogEntry } {
  if (game.status !== "racing" || game.startsAt === null || now < game.startsAt) {
    throw new GameError("NOT_RACING", "Movement is available only during the race.");
  }
  const current = game.players.find((p) => p.id === actorId)!;
  if (action === "flip") {
    const index = switchAt(game, current.x, current.y);
    if (index < 0) throw new GameError("NO_SWITCH", "Stand on a switch to flip it.");
    if (now - game.switchAt[index] < SWITCH_COOLDOWN_MS) throw new GameError("SWITCH_COOLDOWN", "That switch was just flipped. Try again in a moment.", 429);
    const on = !game.switchOn[index];
    const switchOn = game.switchOn.map((value, i) => i === index ? on : value);
    const closing = game.gates.filter((gate: Gate) => gate.switch === index && gateOpen(game, gate) && !gateOpen({ ...game, switchOn }, gate));
    if (closing.some((gate: Gate) => game.players.some((p) => p.x === gate.x && p.y === gate.y))) {
      throw new GameError("GATE_OCCUPIED", "Someone is standing in a gate this switch would close.");
    }
    return {
      game: {
        ...game, switchOn, switchAt: game.switchAt.map((value, i) => i === index ? now : value), revision: game.revision + 1,
        players: game.players.map((p) => p.id === actorId ? { ...p, sequence } : p),
      },
      entry: { at: now, slot: current.slot, kind: "flip", x: current.x, y: current.y, switch: index, on },
    };
  }
  const tokens = Math.min(BURST, current.tokens + (now - current.tokensAt) / MOVE_INTERVAL_MS);
  if (tokens < 1) throw new GameError("TOO_FAST", "Move a little more slowly.", 429);
  const [dx, dy] = DIRECTIONS[action];
  const x = current.x + dx, y = current.y + dy;
  if (!passable(game, x, y, now)) {
    const gate = [...game.gates, ...(game.pulses ?? [])].some((g: Point) => g.x === x && g.y === y);
    throw new GameError("WALL", gate ? "That gate is closed." : "There is a wall in that direction.");
  }
  // A step onto a rift lands on its partner; still one step for speed.
  const to = landing(game, x, y);
  const goal = entrance(game, 1 - current.slot);
  const won = to.x === goal.x && to.y === goal.y;
  return {
    game: {
      ...game, revision: game.revision + 1,
      players: game.players.map((p) => p.id === actorId ? { ...p, x: to.x, y: to.y, sequence, tokens: tokens - 1, tokensAt: now } : p),
      status: won ? "finished" : "racing", winnerId: won ? actorId : null, finishedAt: won ? now : null,
    },
    entry: { at: now, slot: current.slot, kind: to.rift ? "rift" : "step", x: to.x, y: to.y, switch: null, on: null },
  };
}

// Applies actions numbered sequence, sequence+1, ... in order. Already-applied
// numbers are skipped so a retried batch never applies twice; the batch stops
// at the first refused action and reports it alongside what was applied.
export function applyActions(game: Game, actorId: string, sequence: number, actions: Action[], now: number) {
  const current = game.players.find((p) => p.id === actorId);
  if (!current) throw new GameError("NOT_A_PLAYER", "Only the two players can move.", 403);
  const log: LogEntry[] = [];
  let error: GameError | null = null;
  for (let i = 0; i < actions.length; i++) {
    const number = sequence + i, done = game.players.find((p) => p.id === actorId)!.sequence;
    if (number <= done) continue;
    if (number !== done + 1) { error = new GameError("STALE_MOVE", "Your position changed. Try moving again."); break; }
    try {
      const result = act(game, actorId, actions[i], number, now);
      game = result.game;
      log.push(result.entry);
    } catch (caught) {
      if (!(caught instanceof GameError)) throw caught;
      error = caught;
      break;
    }
  }
  return { game, log, error };
}

export function movePlayer(game: Game, actorId: string, direction: Direction, sequence: number, now: number): Game {
  const result = applyActions(game, actorId, sequence, [direction], now);
  if (result.error) throw result.error;
  return result.game;
}

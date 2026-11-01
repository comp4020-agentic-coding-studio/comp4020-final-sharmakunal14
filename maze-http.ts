import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { GameError, isDirection, joinGame, MAZE, MOVE_INTERVAL_MS, movePlayer, readyPlayer } from "./maze-game.ts";
import type { Game, Identity } from "./maze-game.ts";
import { MazeStore } from "./maze-store.ts";
import { MazeLive } from "./maze-live.ts";

export function validateMazeMutation(req: IncomingMessage): void {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) {
    throw new GameError("JSON_REQUIRED", "Send this request as JSON.", 415);
  }
  const origin = req.headers.origin;
  if (req.headers["sec-fetch-site"] === "cross-site" || (origin && !["http:", "https:"].some((scheme) => origin === `${scheme}//${req.headers.host}`))) {
    throw new GameError("ORIGIN_DENIED", "Open the game on this site before taking an action.", 403);
  }
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  validateMazeMutation(req);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 2_048) {
      req.resume();
      throw new GameError("BODY_TOO_LARGE", "The request is too large.", 413);
    }
    chunks.push(chunk);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    throw new GameError("INVALID_JSON", "Send a valid JSON object.", 400);
  }
}

function send(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

export function createMazeHandler(db: DatabaseSync) {
  const store = new MazeStore(db);
  store.interruptActiveGames();
  const live = new MazeLive(store);

  const snapshot = (game: Game, actor: Identity) => ({ game, me: actor.id, serverNow: Date.now(), moveInterval: MOVE_INTERVAL_MS });
  const requireMember = (game: Game, actor: Identity) => {
    if (!game.players.some((p) => p.id === actor.id)) throw new GameError("NOT_A_PLAYER", "Join this race to see it.", 403);
  };

  return async (req: IncomingMessage, res: ServerResponse, actor: Identity | null): Promise<void> => {
    try {
      const path = new URL(req.url ?? "/", "http://local").pathname;
      if (path === "/api/maze/layout" && req.method === "GET") return send(res, 200, { maze: MAZE });
      if (!actor) throw new GameError("NO_SESSION", "Choose a nickname first.", 401);
      if (path === "/api/maze/matches" && req.method === "POST") {
        await body(req);
        return send(res, 201, snapshot(store.create(actor), actor));
      }
      if (path === "/api/maze/matches" && req.method === "GET") {
        return send(res, 200, { matches: store.recent(actor.id).map((game) => ({ id: game.id, status: game.status, createdAt: game.createdAt })) });
      }
      const match = /^\/api\/maze\/matches\/([a-f0-9-]{36})(?:\/(join|ready|move|stream))?$/.exec(path);
      if (!match) throw new GameError("NOT_FOUND", "Unknown game address.", 404);
      const [, id, action] = match;
      if (req.method === "POST" && action === "join") {
        await body(req);
        const game = store.update(id, (current) => joinGame(current, actor));
        live.publish(game);
        return send(res, 200, snapshot(game, actor));
      }
      requireMember(store.get(id), actor);
      if (req.method === "GET" && action === "stream") return live.open(res, actor, store.current(id));
      if (req.method === "GET" && !action) return send(res, 200, snapshot(store.current(id), actor));
      if (req.method !== "POST" || !action) throw new GameError("NOT_FOUND", "Unknown game action.", 404);
      const input = await body(req);
      let game: Game;
      if (action === "ready") {
        game = store.update(id, (current) => readyPlayer(current, actor.id, Date.now()));
      } else if (action === "move") {
        const { direction, sequence } = input;
        if (!isDirection(direction) || typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 1) {
          throw new GameError("INVALID_MOVE", "A move needs a direction and a positive sequence number.", 400);
        }
        store.current(id);
        game = store.update(id, (current) => movePlayer(current, actor.id, direction, sequence, Date.now()));
      } else throw new GameError("NOT_FOUND", "Unknown game action.", 404);
      live.publish(game);
      send(res, 200, snapshot(game, actor));
    } catch (error) {
      if (!(error instanceof GameError)) throw error;
      send(res, error.status, { code: error.code, message: error.message });
    }
  };
}

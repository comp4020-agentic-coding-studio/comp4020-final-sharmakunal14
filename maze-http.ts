import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { addChat, applyActions, BURST, forfeitGame, GameError, isAction, joinGame, MAX_BATCH, MOVE_INTERVAL_MS, publicGame, readyPlayer, setLook, SWITCH_COOLDOWN_MS, todaysLayout } from "./maze-game.ts";
import type { Action } from "./maze-game.ts";
import type { Game, Identity } from "./maze-game.ts";
import type { Look } from "./public/maze-look.js";
import { parseLook } from "./public/maze-look.js";
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

// A missing look means "use the default"; a present but invalid one is refused.
function parseOptionalLook(value: unknown, slot: 0 | 1): Look | undefined {
  if (value === undefined) return undefined;
  const look = parseLook(value, slot);
  if (!look) throw new GameError("INVALID_LOOK", "That avatar is not one of the available looks.", 400);
  return look;
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

  const rules = { moveInterval: MOVE_INTERVAL_MS, burst: BURST, switchCooldown: SWITCH_COOLDOWN_MS };
  const snapshot = (game: Game, actor: Identity) => ({ game, me: actor.id, serverNow: Date.now(), ...rules });
  const requireMember = (game: Game, actor: Identity) => {
    if (!game.players.some((p) => p.id === actor.id)) throw new GameError("NOT_A_PLAYER", "Join this race to see it.", 403);
  };

  return async (req: IncomingMessage, res: ServerResponse, actor: Identity | null): Promise<void> => {
    try {
      const path = new URL(req.url ?? "/", "http://local").pathname;
      if ((path === "/api/maze/layout" || path === "/api/maze/today") && req.method === "GET") {
        const layout = todaysLayout();
        return send(res, 200, { ...layout, best: store.best(layout.mazeId) });
      }
      // Spectators hold only a secret link, no identity: read-only, and no chat.
      const watch = /^\/api\/maze\/watch\/([a-f0-9-]{36})(?:\/(stream))?$/.exec(path);
      if (watch && req.method === "GET") {
        const raceId = store.matchForToken(watch[1]);
        if (watch[2] === "stream") return live.watch(res, store.current(raceId));
        return send(res, 200, { game: publicGame(store.current(raceId)), serverNow: Date.now(), ...rules });
      }
      if (!actor) throw new GameError("NO_SESSION", "Choose a nickname first.", 401);
      if (path === "/api/maze/stats" && req.method === "GET") {
        const asked = new URL(req.url ?? "/", "http://local").searchParams.get("match");
        const stats = store.stats(actor.id);
        if (!asked) return send(res, 200, stats);
        // How a finished race went for this player: personal best and streak.
        const finished = /^[a-f0-9-]{36}$/.test(asked) ? store.get(asked) : null;
        let result = null;
        if (finished?.players.some((p) => p.id === actor.id) && finished.status === "finished" && finished.winnerId === actor.id) {
          const timeMs = finished.finishedAt! - finished.startsAt!, previousBest = store.personalBest(actor.id, finished.mazeId, finished.id);
          result = { timeMs, previousBest, newBest: previousBest === null || timeMs < previousBest };
        }
        return send(res, 200, { ...stats, result });
      }
      if (path === "/api/maze/matches" && req.method === "POST") {
        const input = await body(req);
        if (input.fog !== undefined && typeof input.fog !== "boolean") throw new GameError("INVALID_FOG", "Fog must be on or off.", 400);
        return send(res, 201, snapshot(store.create(actor, Date.now(), parseOptionalLook(input.look, 0), input.fog === true), actor));
      }
      if (path === "/api/maze/matches" && req.method === "GET") {
        return send(res, 200, { matches: store.recent(actor.id) });
      }
      const match = /^\/api\/maze\/matches\/([a-f0-9-]{36})(?:\/(join|ready|move|stream|replay|forfeit|rematch|look|chat|spectate))?$/.exec(path);
      if (!match) throw new GameError("NOT_FOUND", "Unknown game address.", 404);
      const [, id, action] = match;
      if (req.method === "POST" && action === "join") {
        const input = await body(req);
        const look = parseOptionalLook(input.look, 1);
        const game = store.update(id, (current) => joinGame(current, actor, look));
        live.publish(game);
        return send(res, 200, snapshot(game, actor));
      }
      if (req.method === "GET" && action === "replay") {
        // Finished races are public to signed-in visitors so leaderboard entries can link to them.
        const game = store.get(id);
        if (game.status !== "finished" && game.status !== "interrupted") requireMember(game, actor);
        if (game.status !== "finished" && game.status !== "interrupted") throw new GameError("NOT_FINISHED", "A replay is available once the race ends.");
        // Outsiders see the race and its replay, never the players' private chat.
        return send(res, 200, { game: game.players.some((p) => p.id === actor.id) ? game : publicGame(game), steps: store.steps(id) });
      }
      requireMember(store.get(id), actor);
      if (req.method === "GET" && action === "stream") return live.open(res, actor, store.current(id));
      if (req.method === "GET" && !action) return send(res, 200, snapshot(store.current(id), actor));
      if (req.method === "GET" && action === "spectate") return send(res, 200, { token: store.spectatorToken(id) });
      if (req.method !== "POST" || !action) throw new GameError("NOT_FOUND", "Unknown game action.", 404);
      const input = await body(req);
      let game: Game;
      if (action === "ready") {
        game = store.update(id, (current) => readyPlayer(current, actor.id, Date.now()));
      } else if (action === "chat") {
        store.current(id);
        game = store.update(id, (current) => addChat(current, actor.id, input, Date.now()));
      } else if (action === "look") {
        game = store.update(id, (current) => {
          const slot = current.players.find((p) => p.id === actor.id)?.slot ?? 0;
          return setLook(current, actor.id, parseOptionalLook(input.look ?? {}, slot)!);
        });
      } else if (action === "forfeit") {
        store.current(id);
        game = store.update(id, (current) => forfeitGame(current, actor.id));
      } else if (action === "rematch") {
        const next = store.rematch(id, actor);
        live.publish(store.get(id));
        return send(res, 201, snapshot(next, actor));
      } else if (action === "move") {
        const { direction, sequence } = input;
        const actions = (input.actions ?? (direction === undefined ? undefined : [direction])) as unknown;
        if (!Array.isArray(actions) || actions.length < 1 || actions.length > MAX_BATCH || !actions.every(isAction)
          || typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 1) {
          throw new GameError("INVALID_MOVE", `A move needs 1–${MAX_BATCH} actions and a positive sequence number.`, 400);
        }
        store.current(id);
        const result = store.record(id, (current) => applyActions(current, actor.id, sequence, actions as Action[], Date.now()));
        game = result.game;
        if (result.error) {
          live.publish(game);
          return send(res, result.error.status, { code: result.error.code, message: result.error.message, ...snapshot(game, actor) });
        }
      } else throw new GameError("NOT_FOUND", "Unknown game action.", 404);
      live.publish(game);
      send(res, 200, snapshot(game, actor));
    } catch (error) {
      if (!(error instanceof GameError)) throw error;
      send(res, error.status, { code: error.code, message: error.message });
    }
  };
}

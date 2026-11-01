import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { advanceGame, GameError, joinGame, newGame } from "./maze-game.ts";
import type { Game, Identity, LogEntry } from "./maze-game.ts";

export type Summary = {
  id: string; status: Game["status"]; createdAt: number; mazeId: string;
  winner: string | null; timeMs: number | null; players: string[];
};
export type BestTime = { matchId: string; name: string; timeMs: number; finishedAt: number };

function summary(game: Game): Summary {
  return {
    id: game.id, status: game.status, createdAt: game.createdAt, mazeId: game.mazeId,
    winner: game.players.find((p) => p.id === game.winnerId)?.name ?? null,
    timeMs: game.finishedAt !== null && game.startsAt !== null ? game.finishedAt - game.startsAt : null,
    players: game.players.map((p) => p.name),
  };
}

export class MazeStore {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS maze_matches (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, created_at INTEGER NOT NULL,
      state TEXT NOT NULL CHECK (json_valid(state))
    ); CREATE INDEX IF NOT EXISTS maze_matches_owner ON maze_matches(owner_id, created_at);
    CREATE TABLE IF NOT EXISTS maze_steps (
      match_id TEXT NOT NULL REFERENCES maze_matches(id), n INTEGER NOT NULL, at INTEGER NOT NULL,
      slot INTEGER NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('step', 'flip')),
      x INTEGER NOT NULL, y INTEGER NOT NULL, switch INTEGER, switch_on INTEGER,
      PRIMARY KEY (match_id, n)
    );
    CREATE TABLE IF NOT EXISTS maze_results (
      match_id TEXT PRIMARY KEY REFERENCES maze_matches(id), maze_id TEXT NOT NULL,
      winner_id TEXT NOT NULL, winner_name TEXT NOT NULL, time_ms INTEGER NOT NULL, finished_at INTEGER NOT NULL
    ); CREATE INDEX IF NOT EXISTS maze_results_board ON maze_results(maze_id, time_ms);`);
  }

  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  get(id: string): Game {
    const row = this.db.prepare("SELECT state FROM maze_matches WHERE id = ?").get(id) as { state: string } | undefined;
    if (!row) throw new GameError("NOT_FOUND", "This race does not exist. Check the invitation link.", 404);
    // This JSON is written only by the typed game rules, never from request bodies.
    return JSON.parse(row.state) as Game;
  }

  create(identity: Identity, now = Date.now()): Game {
    return this.transaction(() => {
      const { total } = this.db.prepare("SELECT COUNT(*) AS total FROM maze_matches WHERE owner_id = ? AND created_at > ?")
        .get(identity.id, now - 3_600_000) as { total: number };
      if (total >= 20) throw new GameError("ROOM_LIMIT", "You have created 20 races this hour. Rejoin a recent race or try later.", 429);
      const game = newGame(randomUUID(), identity, now);
      this.db.prepare("INSERT INTO maze_matches (id, owner_id, created_at, state) VALUES (?, ?, ?, ?)")
        .run(game.id, identity.id, now, JSON.stringify(game));
      return game;
    });
  }

  // A rematch is a new race with both players already seated. Asking twice
  // returns the same race, so the two players never end up in different ones.
  rematch(id: string, actor: Identity, now = Date.now()): Game {
    return this.transaction(() => {
      const old = this.get(id);
      if (!old.players.some((p) => p.id === actor.id)) throw new GameError("NOT_A_PLAYER", "Join this race first.", 403);
      if (old.status !== "finished" && old.status !== "interrupted") throw new GameError("NOT_FINISHED", "A rematch is available once the race ends.");
      if (old.rematchId) return this.get(old.rematchId);
      const [first, second] = old.players;
      if (!second) throw new GameError("NO_RIVAL", "There is nobody to rematch.");
      const seated = joinGame(newGame(randomUUID(), first, now), second);
      this.db.prepare("INSERT INTO maze_matches (id, owner_id, created_at, state) VALUES (?, ?, ?, ?)")
        .run(seated.id, first.id, now, JSON.stringify(seated));
      const linked: Game = { ...old, rematchId: seated.id, revision: old.revision + 1 };
      this.db.prepare("UPDATE maze_matches SET state = ? WHERE id = ?").run(JSON.stringify(linked), id);
      return seated;
    });
  }

  // Saves the new state, its step-log entries and any result in one transaction.
  record<T extends { game: Game; log?: LogEntry[] }>(id: string, change: (game: Game) => T): T {
    return this.transaction(() => {
      const previous = this.get(id);
      const result = change(previous), next = result.game;
      if (next.revision === previous.revision) return result;
      this.db.prepare("UPDATE maze_matches SET state = ? WHERE id = ?").run(JSON.stringify(next), id);
      if (result.log?.length) {
        const { n } = this.db.prepare("SELECT COALESCE(MAX(n), 0) AS n FROM maze_steps WHERE match_id = ?").get(id) as { n: number };
        const insert = this.db.prepare("INSERT INTO maze_steps (match_id, n, at, slot, kind, x, y, switch, switch_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        result.log.forEach((e, i) => insert.run(id, n + i + 1, e.at, e.slot, e.kind, e.x, e.y, e.switch, e.on === null ? null : Number(e.on)));
      }
      if (previous.status !== "finished" && next.status === "finished" && next.winnerId) {
        const winner = next.players.find((p) => p.id === next.winnerId)!;
        this.db.prepare("INSERT INTO maze_results (match_id, maze_id, winner_id, winner_name, time_ms, finished_at) VALUES (?, ?, ?, ?, ?, ?)")
          .run(id, next.mazeId, winner.id, winner.name, next.finishedAt! - next.startsAt!, next.finishedAt!);
      }
      return result;
    });
  }

  update(id: string, change: (game: Game) => Game): Game {
    return this.record(id, (game) => ({ game: change(game) })).game;
  }

  current(id: string, now = Date.now()): Game {
    return this.update(id, (game) => advanceGame(game, now));
  }

  recent(actorId: string): Summary[] {
    const rows = this.db.prepare(`SELECT state FROM maze_matches WHERE EXISTS (
      SELECT 1 FROM json_each(state, '$.players') WHERE json_extract(value, '$.id') = ?
    ) ORDER BY created_at DESC LIMIT 12`).all(actorId) as { state: string }[];
    return rows.map((row) => summary(JSON.parse(row.state) as Game));
  }

  best(mazeId: string, limit = 10): BestTime[] {
    return (this.db.prepare(`SELECT match_id, winner_name, time_ms, finished_at FROM maze_results
      WHERE maze_id = ? ORDER BY time_ms, finished_at LIMIT ?`).all(mazeId, limit) as
      { match_id: string; winner_name: string; time_ms: number; finished_at: number }[])
      .map((r) => ({ matchId: r.match_id, name: r.winner_name, timeMs: r.time_ms, finishedAt: r.finished_at }));
  }

  steps(id: string): LogEntry[] {
    return (this.db.prepare("SELECT at, slot, kind, x, y, switch, switch_on FROM maze_steps WHERE match_id = ? ORDER BY n").all(id) as
      { at: number; slot: 0 | 1; kind: "step" | "flip"; x: number; y: number; switch: number | null; switch_on: number | null }[])
      .map((r) => ({ at: r.at, slot: r.slot, kind: r.kind, x: r.x, y: r.y, switch: r.switch, on: r.switch_on === null ? null : Boolean(r.switch_on) }));
  }

  interruptActiveGames(): void {
    this.transaction(() => {
      const rows = this.db.prepare("SELECT state FROM maze_matches WHERE json_extract(state, '$.status') IN ('countdown', 'racing')")
        .all() as { state: string }[];
      const save = this.db.prepare("UPDATE maze_matches SET state = ? WHERE id = ?");
      for (const row of rows) {
        const game = JSON.parse(row.state) as Game;
        const next: Game = { ...game, status: "interrupted", interruption: "server_restart", revision: game.revision + 1 };
        save.run(JSON.stringify(next), game.id);
      }
    });
  }
}

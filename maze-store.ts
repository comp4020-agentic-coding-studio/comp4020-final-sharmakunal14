import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { advanceGame, GameError, newGame } from "./maze-game.ts";
import type { Game, Identity } from "./maze-game.ts";

export class MazeStore {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS maze_matches (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, created_at INTEGER NOT NULL,
      state TEXT NOT NULL CHECK (json_valid(state))
    ); CREATE INDEX IF NOT EXISTS maze_matches_owner ON maze_matches(owner_id, created_at);`);
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

  update(id: string, change: (game: Game) => Game): Game {
    return this.transaction(() => {
      const previous = this.get(id);
      const next = change(previous);
      if (next.revision !== previous.revision) {
        this.db.prepare("UPDATE maze_matches SET state = ? WHERE id = ?").run(JSON.stringify(next), id);
      }
      return next;
    });
  }

  current(id: string, now = Date.now()): Game {
    return this.update(id, (game) => advanceGame(game, now));
  }

  recent(actorId: string): Game[] {
    const rows = this.db.prepare(`SELECT state FROM maze_matches WHERE EXISTS (
      SELECT 1 FROM json_each(state, '$.players') WHERE json_extract(value, '$.id') = ?
    ) ORDER BY created_at DESC LIMIT 12`).all(actorId) as { state: string }[];
    return rows.map((row) => JSON.parse(row.state) as Game);
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

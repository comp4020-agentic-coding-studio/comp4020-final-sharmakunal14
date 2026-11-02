import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { advanceGame, applyActions, COUNTDOWN_MS, entrance, joinGame, MOVE_INTERVAL_MS, readyPlayer } from "../maze-game.ts";
import { MazeStore } from "../maze-store.ts";
import { route } from "./maze-path.ts";

it("keeps completed results across database reopening and records interrupted active races", () => {
  const dir = mkdtempSync(join(tmpdir(), "maze-store-"));
  let db = new DatabaseSync(join(dir, "test.db"));
  try {
    const alice = { id: "alice", name: "Alice" }, bob = { id: "bob", name: "Bob" };
    const store = new MazeStore(db);
    const waiting = store.create(alice, 0);
    const race = store.create(alice, 1);
    store.update(race.id, (game) => readyPlayer(readyPlayer(joinGame(game, bob), alice.id, 1), bob.id, 1));
    const complete = store.create(alice, 2);
    store.update(complete.id, (game) => advanceGame(readyPlayer(readyPlayer(joinGame(game, bob), alice.id, 0), bob.id, 0), COUNTDOWN_MS));
    route(complete).forEach((direction, index) => {
      store.record(complete.id, (game) => applyActions(game, alice.id, index + 1, [direction], COUNTDOWN_MS + index * MOVE_INTERVAL_MS));
    });
    const result = store.get(complete.id);
    expect(result.status).toBe("finished");
    expect(() => store.update(waiting.id, () => { throw new Error("failure"); })).toThrow("failure");
    expect(store.get(waiting.id)).toEqual(waiting);
    db.close();
    db = new DatabaseSync(join(dir, "test.db"));
    const restored = new MazeStore(db);
    restored.interruptActiveGames();
    expect(restored.get(waiting.id)).toEqual(waiting);
    expect(restored.get(complete.id)).toEqual(result);
    expect(restored.get(race.id)).toMatchObject({ status: "interrupted", interruption: "server_restart", players: [{ id: "alice", ...entrance(race, 0) }, { id: "bob", ...entrance(race, 1) }] });
    expect(restored.recent(bob.id).map((game) => game.id)).toEqual([complete.id, race.id]);
    const steps = route(complete).length;
    expect(restored.steps(complete.id)).toHaveLength(steps);
    expect(restored.steps(complete.id).at(-1)).toMatchObject({ slot: 0, kind: "step", ...entrance(complete, 1) });
    expect(restored.best(complete.mazeId)).toEqual([{ matchId: complete.id, name: "Alice", timeMs: (steps - 1) * MOVE_INTERVAL_MS, finishedAt: COUNTDOWN_MS + (steps - 1) * MOVE_INTERVAL_MS, fog: false }]);
    expect(restored.recent(alice.id)[0]).toMatchObject({ winner: "Alice", timeMs: (steps - 1) * MOVE_INTERVAL_MS, players: ["Alice", "Bob"] });
    expect(restored.recent("stranger")).toEqual([]);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

it("limits room creation per identity without preventing existing room access", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const store = new MazeStore(db), actor = { id: "alice", name: "Alice" };
    for (let i = 0; i < 20; i++) store.create(actor, 10);
    expect(() => store.create(actor, 10)).toThrow(/20 races/);
    expect(store.recent(actor.id)).toHaveLength(12);
    expect(() => store.create(actor, 3_600_011)).not.toThrow();
  } finally { db.close(); }
});

it("upgrades a step log made before rifts so it accepts rift steps and keeps old rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "maze-store-"));
  const db = new DatabaseSync(join(dir, "old.db"));
  try {
    db.exec(`CREATE TABLE maze_matches (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, created_at INTEGER NOT NULL, state TEXT NOT NULL CHECK (json_valid(state)));
      CREATE TABLE maze_steps (match_id TEXT NOT NULL REFERENCES maze_matches(id), n INTEGER NOT NULL, at INTEGER NOT NULL,
        slot INTEGER NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('step', 'flip')),
        x INTEGER NOT NULL, y INTEGER NOT NULL, switch INTEGER, switch_on INTEGER, PRIMARY KEY (match_id, n));
      INSERT INTO maze_matches VALUES ('old', 'alice', 0, '{}');
      INSERT INTO maze_steps VALUES ('old', 1, 5, 0, 'step', 1, 2, NULL, NULL);`);
    const store = new MazeStore(db);
    expect(store.steps("old")).toEqual([{ at: 5, slot: 0, kind: "step", x: 1, y: 2, switch: null, on: null }]);
    db.exec("INSERT INTO maze_steps VALUES ('old', 2, 6, 0, 'rift', 3, 4, NULL, NULL)");
    expect(store.steps("old")).toHaveLength(2);
    new MazeStore(db); // a second start leaves the upgraded table alone
    expect(store.steps("old")).toHaveLength(2);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

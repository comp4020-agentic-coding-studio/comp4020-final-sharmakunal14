import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { advanceGame, COUNTDOWN_MS, joinGame, MOVE_INTERVAL_MS, movePlayer, readyPlayer } from "../maze-game.ts";
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
    route(complete.maze).forEach((direction, index) => {
      store.update(complete.id, (game) => movePlayer(game, alice.id, direction, index + 1, COUNTDOWN_MS + index * MOVE_INTERVAL_MS));
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
    expect(restored.get(race.id)).toMatchObject({ status: "interrupted", interruption: "server_restart", players: [{ id: "alice", x: 1, y: 1 }, { id: "bob", x: 11, y: 11 }] });
    expect(restored.recent(bob.id).map((game) => game.id)).toEqual([complete.id, race.id]);
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

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { joinGame, readyPlayer } from "../maze-game.ts";
import { MazeStore } from "../maze-store.ts";

it("keeps identities, seats and positions across database reopening and records an interrupted race", () => {
  const dir = mkdtempSync(join(tmpdir(), "maze-store-"));
  let db = new DatabaseSync(join(dir, "test.db"));
  try {
    const alice = { id: "alice", name: "Alice" }, bob = { id: "bob", name: "Bob" };
    const store = new MazeStore(db);
    const waiting = store.create(alice, 0);
    const race = store.create(alice, 1);
    store.update(race.id, (game) => readyPlayer(readyPlayer(joinGame(game, bob), alice.id, 1), bob.id, 1));
    expect(() => store.update(waiting.id, () => { throw new Error("failure"); })).toThrow("failure");
    expect(store.get(waiting.id)).toEqual(waiting);
    db.close();
    db = new DatabaseSync(join(dir, "test.db"));
    const restored = new MazeStore(db);
    restored.interruptActiveGames();
    expect(restored.get(waiting.id)).toEqual(waiting);
    expect(restored.get(race.id)).toMatchObject({ status: "interrupted", interruption: "server_restart", players: [{ id: "alice", x: 1, y: 1 }, { id: "bob", x: 11, y: 11 }] });
    expect(restored.recent(bob.id).map((game) => game.id)).toEqual([race.id]);
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

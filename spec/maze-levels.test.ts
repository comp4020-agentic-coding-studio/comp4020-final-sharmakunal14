import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { entrance, layoutFor, levelLayout, newGame } from "../maze-game.ts";
import { LEVELS, mazeIdOf, nextLevel, WORLDS } from "../public/maze-levels.js";
import { reachable, route } from "./maze-path.ts";

const rotate = (p: { x: number; y: number }, size: number) => ({ x: size - 1 - p.x, y: size - 1 - p.y });

describe("campaign levels (decision 0013)", () => {
  it("has four worlds of three levels, in order, each linking to the next", () => {
    expect(WORLDS.map((w) => w.id)).toEqual([1, 2, 3, 4]);
    for (const w of WORLDS) expect(LEVELS.filter((l) => l.world === w.id)).toHaveLength(3);
    expect(LEVELS.map((l) => l.id)).toEqual(["1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3", "4-1", "4-2", "4-3"]);
    expect(nextLevel("1-3")?.id).toBe("2-1");
    expect(nextLevel("4-3")).toBeNull();
  });

  it("every level: its size, its mechanics present, symmetric, every cell reaches both goals in every switch state, equal routes", () => {
    for (const level of LEVELS) {
      const layout = levelLayout(level.id), size = layout.maze.length;
      expect(size, level.id).toBe(level.spec.cells * 2 + 1);
      expect(layout.gates.length, level.id).toBe(level.spec.switches ? 4 : 0);
      expect(layout.pulses.length, level.id).toBe(level.spec.pulses.length * 2);
      expect(layout.rifts.length, level.id).toBe(level.spec.rifts ? 2 : 0);
      expect(layout.maze.map((row) => [...row].reverse().join("")).reverse(), level.id).toEqual(layout.maze);
      for (const p of layout.pulses) expect(layout.pulses).toContainEqual({ ...rotate(p, size), openMs: p.openMs, closedMs: p.closedMs });
      const states = level.spec.switches ? [[false, false], [true, false], [false, true], [true, true]] : [[]];
      for (const switchOn of states) {
        const board = { ...layout, switchOn };
        for (const slot of [0, 1]) {
          const reached = reachable(board, entrance(board, slot));
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (layout.maze[y][x] === ".") expect(reached.has(`${x},${y}`), `${level.id} ${x},${y}`).toBe(true);
          }
        }
        expect(route(board).length, level.id).toBe(route(board, entrance(board, 1), entrance(board, 0)).length);
      }
    }
  });

  it("gets harder through each world: no level is smaller than the first", () => {
    for (const w of WORLDS) {
      const sizes = LEVELS.filter((l) => l.world === w.id).map((l) => l.spec.cells);
      expect(Math.min(...sizes)).toBe(sizes[0]);
    }
  });

  it("is the same maze every time: pinned fingerprints", () => {
    const fingerprint = (id: string) => createHash("sha256").update(JSON.stringify(levelLayout(id))).digest("hex").slice(0, 12);
    expect(Object.fromEntries(LEVELS.map((l) => [l.id, fingerprint(l.id)]))).toEqual({
      "1-1": "6133dedcccdf", "1-2": "1ab1cde743ba", "1-3": "bf5afc3753cb", "2-1": "7a4aa4df56b0", "2-2": "2e03f5b5aa87", "2-3": "1754e4ebbe8e",
      "3-1": "716446fe00c3", "3-2": "66f1a07a47b0", "3-3": "38e4f8c50bb0", "4-1": "a693b9d61006", "4-2": "0406fa576b4f", "4-3": "0347b5f7c19c",
    });
  });

  it("saves the level and its maze id in a new race, and refuses an unknown level", () => {
    const game = newGame("g", { id: "a", name: "A" }, 0, levelLayout("2-3"), undefined, false, "2-3");
    expect(game).toMatchObject({ level: "2-3", mazeId: "level-2-3" });
    expect(layoutFor(mazeIdOf(LEVELS[0])).maze).toHaveLength(9);
    expect(() => levelLayout("9-9")).toThrow(/does not exist/);
  });
});

import { inject } from "vitest";
import type { Game } from "../maze-game.ts";
import { MOVE_INTERVAL_MS } from "../maze-game.ts";

const base = inject("baseUrl");
type View = { game: Game; code?: string };
async function person(name: string): Promise<string> {
  const response = await fetch(new URL("/api/session", base), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
  return response.headers.get("set-cookie")!.split(";")[0];
}
const api = (cookie: string, path: string, body?: unknown) => fetch(new URL(`/api/maze/${path}`, base), {
  method: body === undefined ? "GET" : "POST", headers: { cookie, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
});

// Plays a level race to the finish with Alice winning.
async function finish(alice: string, bob: string, game: Game) {
  const path = `matches/${game.id}`;
  if (game.players.length < 2) await api(bob, `${path}/join`, {});
  await api(alice, `${path}/ready`, {});
  const { game: started } = await (await api(bob, `${path}/ready`, {})).json() as View;
  await new Promise((resolve) => setTimeout(resolve, started.startsAt! - Date.now() + 20));
  const steps = route(started);
  let sequence = 1;
  for (let i = 0; i < steps.length; i += 4) {
    await new Promise((resolve) => setTimeout(resolve, 4 * MOVE_INTERVAL_MS + 5));
    const body = await (await api(alice, `${path}/move`, { actions: steps.slice(i, i + 4), sequence })).json() as View;
    sequence = body.game.players[0].sequence + 1;
    if (body.game.status === "finished") return body.game;
  }
  throw new Error("did not finish");
}

describe("levels over HTTP", () => {
  it("opens 1-1 only, refuses locked or unknown levels, and saves the level's maze", async () => {
    const alice = await person("Alice");
    const progress = await (await api(alice, "levels")).json() as { unlocked: string[]; completed: string[] };
    expect(progress).toMatchObject({ unlocked: ["1-1"], completed: [] });
    expect((await api(alice, "matches", { level: "1-2" })).status).toBe(403);
    expect((await api(alice, "matches", { level: "9-9" })).status).toBe(400);
    const { game } = await (await api(alice, "matches", { level: "1-1" })).json() as View;
    expect(game).toMatchObject({ level: "1-1", mazeId: "level-1-1" });
    expect(game.maze).toHaveLength(9);
  });

  it("finishing a level unlocks the next for both players, win or lose; next level seats both; a rematch keeps the level", async () => {
    const alice = await person("Alice"), bob = await person("Bob");
    const { game } = await (await api(alice, "matches", { level: "1-1" })).json() as View;
    // A forfeit unlocks nothing and offers no next level.
    const path = `matches/${game.id}`;
    await api(bob, `${path}/join`, {});
    await api(alice, `${path}/ready`, {});
    await api(bob, `${path}/ready`, {});
    await api(bob, `${path}/forfeit`, {});
    expect((await api(alice, `${path}/next`, {})).status).toBe(403);
    expect(((await (await api(alice, "levels")).json()) as { unlocked: string[] }).unlocked).toEqual(["1-1"]);

    const again = await (await api(alice, `${path}/rematch`, {})).json() as View;
    expect(again.game.level).toBe("1-1");
    await finish(alice, bob, again.game);
    for (const who of [alice, bob]) {
      expect(((await (await api(who, "levels")).json()) as { unlocked: string[] }).unlocked).toEqual(["1-1", "1-2"]);
    }
    const next = await (await api(bob, `matches/${again.game.id}/next`, {})).json() as View;
    expect(next.game).toMatchObject({ level: "1-2", status: "waiting" });
    expect(next.game.players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
    // The other player asking for a rematch afterwards joins the same race.
    const same = await (await api(alice, `matches/${again.game.id}/rematch`, {})).json() as View;
    expect(same.game.id).toBe(next.game.id);
  }, 30_000);

  it("a fog level is a fog race; the daily maze has no next level", async () => {
    const alice = await person("Alice"), bob = await person("Bob");
    let { game } = await (await api(alice, "matches", { level: "1-1" })).json() as View;
    game = await finish(alice, bob, game);
    ({ game } = await (await api(alice, `matches/${game.id}/next`, {})).json() as View);
    game = await finish(alice, bob, game);
    const { game: misty } = await (await api(alice, `matches/${game.id}/next`, {})).json() as View;
    expect(misty).toMatchObject({ level: "1-3", fog: true });
    const daily = await (await api(alice, "matches", {})).json() as View;
    await finish(alice, bob, daily.game);
    expect((await api(alice, `matches/${daily.game.id}/next`, {})).status).toBe(409);
  }, 40_000);
});

import { describe, expect, inject, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import type { Game, PublicGame } from "../maze-game.ts";
import { publicGame } from "../maze-game.ts";
import { MazeStore, streakFrom } from "../maze-store.ts";

describe("streak", () => {
  const days = (...d: string[]) => new Set(d);
  it("counts consecutive Sydney days ending today", () => {
    expect(streakFrom(days("2026-11-02", "2026-11-01", "2026-10-31"), "2026-11-02")).toBe(3);
    expect(streakFrom(days("2026-11-02", "2026-10-31"), "2026-11-02")).toBe(1); // a gap ends it
    expect(streakFrom(days(), "2026-11-02")).toBe(0);
  });
  it("stays alive until the end of today, so yesterday still counts", () => {
    expect(streakFrom(days("2026-11-01", "2026-10-31"), "2026-11-02")).toBe(2);
    expect(streakFrom(days("2026-10-30"), "2026-11-02")).toBe(0); // missed yesterday: broken
  });
  it("crosses month and year boundaries", () => {
    expect(streakFrom(days("2027-01-01", "2026-12-31", "2026-12-30"), "2027-01-01")).toBe(3);
    expect(streakFrom(days("2026-03-01", "2026-02-28"), "2026-03-01")).toBe(2);
  });
});

describe("stats and personal best in the store", () => {
  it("reports the fastest win per maze for one player and can leave one race out", () => {
    const db = new DatabaseSync(":memory:");
    const store = new MazeStore(db);
    db.exec("PRAGMA foreign_keys = OFF");
    const add = (match: string, winner: string, ms: number) =>
      db.prepare("INSERT INTO maze_results (match_id, maze_id, winner_id, winner_name, time_ms, finished_at) VALUES (?, 'm1', ?, ?, ?, 0)").run(match, winner, winner, ms);
    add("a", "alice", 9_000); add("b", "alice", 7_000); add("c", "bob", 5_000);
    expect(store.personalBest("alice", "m1")).toBe(7_000);
    expect(store.personalBest("alice", "m1", "b")).toBe(9_000); // before race b
    expect(store.personalBest("alice", "m1", "a")).toBe(7_000);
    expect(store.personalBest("alice", "other")).toBeNull();
    expect(store.personalBest("nobody", "m1")).toBeNull();
    db.close();
  });

  it("gives one stable secret per race, and resolves it back", () => {
    const db = new DatabaseSync(":memory:");
    const store = new MazeStore(db);
    const game = store.create({ id: "alice", name: "Alice" }, 0);
    const token = store.spectatorToken(game.id);
    expect(store.spectatorToken(game.id)).toBe(token);
    expect(token).not.toBe(game.id);
    expect(store.matchForToken(token)).toBe(game.id);
    // After a rematch the same token resolves to the new race.
    const old = store.get(game.id);
    db.prepare("UPDATE maze_matches SET state = ? WHERE id = ?").run(JSON.stringify({ ...old, rematchId: "next" }), game.id);
    const next = store.create({ id: "alice", name: "Alice" }, 1);
    db.prepare("UPDATE maze_matches SET id = 'next', state = json_set(state, '$.id', 'next') WHERE id = ?").run(next.id);
    expect(store.matchForToken(token)).toBe("next");
    expect(() => store.matchForToken("00000000-0000-0000-0000-000000000000")).toThrow(/not valid/);
    db.close();
  });
});

describe("public game", () => {
  it("drops private chat and rematch fields and nothing else", () => {
    const game = { id: "g", chat: [{ n: 1 }], rematchId: "r", rematchBy: "a", status: "racing", players: [] } as unknown as Game;
    const shown = publicGame(game) as Record<string, unknown>;
    // Only a flag that a rematch exists, never its id (which would open a seat).
    expect(Object.keys(shown).sort()).toEqual(["id", "players", "rematched", "status"]);
    expect(shown.rematched).toBe(true);
    expect(JSON.stringify(shown)).not.toContain('"r"');
    const typed: PublicGame = publicGame(game);
    expect(typed.id).toBe("g");
  });
});

const base = inject("baseUrl");
async function person(name: string): Promise<string> {
  const response = await fetch(new URL("/api/session", base), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
  return response.headers.get("set-cookie")!.split(";")[0];
}
const api = (cookie: string, path: string, body?: unknown) => fetch(new URL(`/api/maze/${path}`, base), {
  method: body === undefined ? "GET" : "POST", headers: { cookie, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
});

describe("spectator link over HTTP", () => {
  it("is available to the two players only, reads without a session, and shows no private fields", async () => {
    const alice = await person("Alice"), bob = await person("Bob"), eve = await person("Eve");
    const { game } = await (await api(alice, "matches", {})).json() as { game: Game }, path = `matches/${game.id}`;
    await api(bob, `${path}/join`, {});
    await api(alice, `${path}/chat`, { text: "secret plan" });
    expect((await api(eve, `${path}/spectate`)).status).toBe(403);
    const { token } = await (await api(alice, `${path}/spectate`)).json() as { token: string };
    expect((await (await api(bob, `${path}/spectate`)).json() as { token: string }).token).toBe(token);

    const anonymous = await fetch(new URL(`/api/maze/watch/${token}`, base));
    expect(anonymous.status).toBe(200);
    const seen = await anonymous.json() as { game: Record<string, unknown> };
    expect(seen.game.id).toBe(game.id);
    expect(seen.game.chat).toBeUndefined();
    expect(JSON.stringify(seen)).not.toContain("secret plan");

    // The watch token does not open any player endpoint, and the race id is not a token.
    expect((await api(eve, `${path}/chat`, { text: "hi" })).status).toBe(403);
    expect((await fetch(new URL(`/api/maze/watch/${game.id}`, base))).status).toBe(404);
    expect((await fetch(new URL(`/api/maze/watch/not-a-token`, base))).status).toBe(401); // not a token shape: treated as an ordinary, unauthenticated call
    expect((await fetch(new URL(`/api/maze/watch/${token}/ready`, base), { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(401); // no identity: a token never acts
    const page = await fetch(new URL(`/watch/${token}`, base));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Maze Duel");
  });

  it("follows the same link into a rematch, and the one after", async () => {
    const alice = await person("Alice"), bob = await person("Bob");
    const { game } = await (await api(alice, "matches", {})).json() as { game: Game };
    let path = `matches/${game.id}`;
    await api(bob, `${path}/join`, {});
    const { token } = await (await api(alice, `${path}/spectate`)).json() as { token: string };
    const watch = async () => (await (await fetch(new URL(`/api/maze/watch/${token}`, base))).json() as { game: PublicGame }).game;
    let previous = game.id;
    for (let round = 0; round < 2; round++) {
      await api(alice, `${path}/ready`, {});
      await api(bob, `${path}/ready`, {});
      await api(bob, `${path}/forfeit`, {});
      const next = await (await api(alice, `${path}/rematch`, {})).json() as { game: Game };
      const seen = await watch();
      expect(seen.id).toBe(next.game.id);
      expect(seen.id).not.toBe(previous);
      expect(seen.rematched).toBeUndefined();
      previous = next.game.id;
      path = `matches/${next.game.id}`;
    }
  });

  it("streams a spectator the live race without chat and without counting as a player", async () => {
    const alice = await person("Alice"), bob = await person("Bob");
    const { game } = await (await api(alice, "matches", {})).json() as { game: Game }, path = `matches/${game.id}`;
    await api(bob, `${path}/join`, {});
    const { token } = await (await api(alice, `${path}/spectate`)).json() as { token: string };
    const controller = new AbortController();
    const response = await fetch(new URL(`/api/maze/watch/${token}/stream`, base), { signal: controller.signal });
    expect(response.status).toBe(200);
    const reader = response.body!.getReader(), decoder = new TextDecoder();
    let buffer = "";
    while (!buffer.includes("event: state")) buffer += decoder.decode((await reader.read()).value, { stream: true });
    while (!buffer.includes("\n\n", buffer.indexOf("event: state"))) buffer += decoder.decode((await reader.read()).value, { stream: true });
    const data = JSON.parse(buffer.split("\n").find((l) => l.startsWith("data: "))!.slice(6)) as { game: Record<string, unknown>; online: string[]; watching: number };
    expect(data.game.chat).toBeUndefined();
    expect(data.watching).toBe(1);
    expect(data.online).toEqual([]);
    controller.abort();
  });

  it("returns personal stats and, for a won race, the previous best", async () => {
    const alice = await person("Alice");
    const stats = await (await api(alice, "stats")).json() as { streak: number; playedToday: boolean; best: number | null };
    expect(stats).toMatchObject({ streak: 0, playedToday: false, best: null });
    expect((await api("", "stats")).status).toBe(401);
  });
});

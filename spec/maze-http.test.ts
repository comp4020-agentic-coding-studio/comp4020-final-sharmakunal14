import { describe, expect, inject, it } from "vitest";
import type { Game } from "../maze-game.ts";

const base = inject("baseUrl");
type View = { game: Game; me: string; serverNow: number };

async function person(name: string): Promise<string> {
  const response = await fetch(new URL("/api/session", base), {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(201);
  return response.headers.get("set-cookie")!.split(";")[0];
}

function api(cookie: string, path: string, body?: unknown) {
  return fetch(new URL(`/api/maze/${path}`, base), {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function create(cookie: string): Promise<View> {
  const response = await api(cookie, "matches", {});
  expect(response.status).toBe(201);
  return response.json() as Promise<View>;
}

describe("maze HTTP boundary", () => {
  it("requires a session and rejects cross-site, malformed and oversized mutations", async () => {
    expect((await api("", "matches", {})).status).toBe(401);
    const cookie = await person("Alice");
    for (const [headers, body, status] of [
      [{ "content-type": "application/json", origin: "https://untrusted.example" }, "{}", 403],
      [{ "content-type": "text/plain" }, "{}", 415],
      [{ "content-type": "application/json" }, "{", 400],
      [{ "content-type": "application/json" }, "[]", 400],
      [{ "content-type": "application/json" }, JSON.stringify({ value: "x".repeat(3_000) }), 413],
    ] as const) {
      const response = await fetch(new URL("/api/maze/matches", base), { method: "POST", headers: { cookie, ...headers }, body });
      expect(response.status).toBe(status);
    }
  });

  it("assigns exactly two seats even when two people try joining at once", async () => {
    const alice = await person("Alice"), bob = await person("Bob"), eve = await person("Eve");
    const { game } = await create(alice);
    const path = `matches/${game.id}`;
    const results = await Promise.all([api(bob, `${path}/join`, {}), api(eve, `${path}/join`, {})]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const repeated = await (await api(alice, `${path}/join`, {})).json() as View;
    expect(repeated.game.players).toHaveLength(2);
    expect(new Set(repeated.game.players.map((p) => p.id)).size).toBe(2);
  });

  it("denies non-members read and movement access; accepts only valid move commands", async () => {
    const alice = await person("Alice"), outsider = await person("Outsider");
    const { game } = await create(alice), path = `matches/${game.id}`;
    expect((await api(outsider, path)).status).toBe(403);
    expect((await api(outsider, `${path}/ready`, {})).status).toBe(403);
    expect((await api(outsider, `${path}/move`, { direction: "right", sequence: 1 })).status).toBe(403);
    expect((await api(alice, `${path}/move`, { direction: "teleport", sequence: 1 })).status).toBe(400);
    expect((await api(alice, `${path}/move`, { direction: "right", sequence: 1 })).status).toBe(409);
    expect(await (await api(outsider, "matches")).json()).toEqual({ matches: [] });
  });

  it("shares one server countdown and cannot reset it by repeating ready", async () => {
    const alice = await person("Alice"), bob = await person("Bob");
    const { game } = await create(alice), path = `matches/${game.id}`;
    await api(bob, `${path}/join`, {});
    await api(alice, `${path}/ready`, {});
    const started = await (await api(bob, `${path}/ready`, {})).json() as View;
    expect(started.game.status).toBe("countdown");
    expect(started.game.startsAt! - started.serverNow).toBeGreaterThan(2_900);
    const repeated = await (await api(alice, `${path}/ready`, {})).json() as View;
    expect(repeated.game.startsAt).toBe(started.game.startsAt);
    expect((await api(alice, `${path}/move`, { direction: "right", sequence: 1 })).status).toBe(409);
  });
});

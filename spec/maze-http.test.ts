import { describe, expect, inject, it } from "vitest";
import type { Game } from "../maze-game.ts";
import { entrance, MOVE_INTERVAL_MS } from "../maze-game.ts";
import { route } from "./maze-path.ts";

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

async function stream(cookie: string, id: string) {
  const controller = new AbortController();
  const response = await fetch(new URL(`/api/maze/matches/${id}/stream`, base), { headers: { cookie }, signal: controller.signal });
  expect(response.status).toBe(200);
  const reader = response.body!.getReader(), decoder = new TextDecoder();
  let buffer = "";
  return {
    close: () => controller.abort(),
    async next(want: (view: View & { online: string[] }) => boolean, timeout = 1_000) {
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        for (;;) {
          const end = buffer.indexOf("\n\n");
          if (end >= 0) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = block.split("\n").find((line) => line.startsWith("data: "));
            if (data) {
              const view = JSON.parse(data.slice(6)) as View & { online: string[] };
              if (want(view)) return view;
            }
          } else {
            const part = await reader.read();
            if (part.done) throw new Error("Stream ended before the expected state");
            buffer += decoder.decode(part.value, { stream: true });
          }
        }
      } finally { clearTimeout(timer); }
    },
  };
}

describe("maze HTTP boundary", () => {
  it("serves the new game, retained prototype and documentation without exposing server files", async () => {
    const home = await fetch(base);
    expect(await home.text()).toContain("Maze Duel");
    expect((await fetch(new URL("/shared-space/", base))).status).toBe(200);
    expect((await fetch(new URL("/docs/decisions/0001-refuse-outdated-moves.md", base))).status).toBe(200);
    for (const path of ["/server.ts", "/docs/../server.ts", "/docs/%2e%2e%2fserver.ts", "/maze-unknown.js"]) {
      expect((await fetch(new URL(path, base))).status).toBe(404);
    }
    for (const file of ["maze.js", "maze-race.js", "maze-render.js", "maze-controls.js", "maze-api.js"]) {
      const response = await fetch(new URL(`/${file}`, base));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("javascript");
    }
  });

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

  it("streams presence, countdown, movement and one winning result; reconnect restores the final state", async () => {
    const alice = await person("Alice"), bob = await person("Bob");
    const { game } = await create(alice), path = `matches/${game.id}`;
    await api(bob, `${path}/join`, {});
    const a = await stream(alice, game.id), b = await stream(bob, game.id);
    try {
      await a.next((view) => view.online.length === 2);
      await api(alice, `${path}/ready`, {});
      await b.next((view) => view.game.players[0].ready);
      await api(bob, `${path}/ready`, {});
      await b.next((view) => view.game.status === "countdown");
      await b.next((view) => view.game.status === "racing", 4_000);
      const forward = route(game.maze), backward = route(game.maze, entrance(1), entrance(0));
      for (let i = 0; i < forward.length; i++) {
        const started = Date.now();
        const responses = await Promise.all([
          api(alice, `${path}/move`, { direction: forward[i], sequence: i + 1 }),
          api(bob, `${path}/move`, { direction: backward[i], sequence: i + 1 }),
        ]);
        if (i === forward.length - 1) expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
        else {
          expect(responses.map((res) => res.status)).toEqual([200, 200]);
          await b.next((view) => view.game.players.every((player) => player.sequence === i + 1));
          expect(Date.now() - started).toBeLessThan(1_000);
          await new Promise((resolve) => setTimeout(resolve, MOVE_INTERVAL_MS + 10));
        }
      }
      const result = await b.next((view) => view.game.status === "finished");
      expect(result.game.winnerId).not.toBeNull();
      a.close();
      await b.next((view) => view.online.length === 1);
      const reconnected = await stream(alice, game.id);
      try {
        const restored = await reconnected.next((view) => view.game.status === "finished");
        expect(restored.game).toEqual(result.game);
      } finally { reconnected.close(); }
    } finally { a.close(); b.close(); }
  }, 20_000);
});

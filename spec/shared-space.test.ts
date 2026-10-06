import { describe, expect, inject, it } from "vitest";

// Shared Space's promises, driven over HTTP against the running app.
const baseUrl = inject("baseUrl");

type Obj = { id: string; kind: string; label: string; cx: number; cy: number; version: number };

async function person(name: string): Promise<string> {
  const res = await fetch(new URL("/api/session", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(res.status).toBe(201);
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

const api = (cookie: string, path: string, body?: unknown) =>
  fetch(new URL(path, baseUrl), {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function exampleEvent(cookie: string) {
  const { id } = await (await api(cookie, "/api/events", {})).json();
  const { objects } = await (await api(cookie, `/api/events/${id}`)).json();
  const robotics = (objects as Obj[]).find((o) => o.label === "Robotics")!;
  return { id, robotics };
}

const moveTo = (cookie: string, eventId: string, o: Obj, cx: number) =>
  api(cookie, `/api/events/${eventId}/objects/${o.id}/move`, { expectedVersion: o.version, cx, cy: o.cy });

describe("shared space", () => {
  it("a saved move is still there for someone else who opens the plan later", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id, robotics } = await exampleEvent(alice);
    expect((await moveTo(alice, id, robotics, 7000)).status).toBe(200);

    const { objects } = await (await api(ben, `/api/events/${id}`)).json();
    expect((objects as Obj[]).find((o) => o.id === robotics.id)!.cx).toBe(7000);
  });

  it("a move made from an outdated position is refused, not silently applied", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id, robotics } = await exampleEvent(alice);
    expect((await moveTo(alice, id, robotics, 7000)).status).toBe(200);
    expect((await moveTo(ben, id, robotics, 3000)).status).toBe(409);

    const { objects } = await (await api(ben, `/api/events/${id}`)).json();
    expect((objects as Obj[]).find((o) => o.id === robotics.id)!.cx).toBe(7000);
  });

  it("a move reaches another open plan within a second, without reloading", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id, robotics } = await exampleEvent(alice);

    const controller = new AbortController();
    const stream = await fetch(new URL(`/api/events/${id}/stream`, baseUrl), {
      headers: { cookie: ben, accept: "text/event-stream" },
      signal: controller.signal,
    });
    const reader = stream.body!.getReader();
    const decoder = new TextDecoder();
    const started = Date.now();
    await moveTo(alice, id, robotics, 7000);

    let seen = "";
    const timer = setTimeout(() => controller.abort(), 1000);
    try {
      while (!seen.includes(robotics.id)) {
        const { value, done } = await reader.read();
        if (done) break;
        seen += decoder.decode(value);
      }
    } catch {
      // aborted at the one-second limit
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
    expect(seen).toContain(robotics.id);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

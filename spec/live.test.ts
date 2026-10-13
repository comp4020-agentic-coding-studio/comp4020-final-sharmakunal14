import { describe, expect, inject, it } from "vitest";

// Two people on one plan, over the live stream: who is here, what someone is
// dragging right now, and what a returning view missed.
const baseUrl = inject("baseUrl");

type Obj = { id: string; label: string; cx: number; cy: number; version: number };
type Frame = { event: string; id: string; data: any };

async function person(name: string): Promise<string> {
  const res = await fetch(new URL("/api/session", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
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
  const { objects, event } = await (await api(cookie, `/api/events/${id}`)).json();
  return { id, seq: event.seq as number, robotics: (objects as Obj[]).find((o) => o.label === "Robotics")! };
}

// An open plan's stream. `next` resolves with the first frame matching `want`,
// or rejects after `ms` — the brief's "about a second".
async function open(cookie: string, eventId: string, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const res = await fetch(new URL(`/api/events/${eventId}/stream`, baseUrl), {
    headers: { cookie, accept: "text/event-stream", ...headers },
    signal: controller.signal,
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const frames: Frame[] = [];
  let buffer = "";
  let wake = () => {};
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const f: Frame = { event: "message", id: "", data: null };
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) f.event = line.slice(7);
            else if (line.startsWith("id: ")) f.id = line.slice(4);
            else if (line.startsWith("data: ")) f.data = JSON.parse(line.slice(6));
          }
          if (f.data !== null) frames.push(f);
          wake();
        }
      }
    } catch {
      // closed by the test
    }
  })();
  let read = 0;
  return {
    async next(want: (f: Frame) => boolean, ms = 1000): Promise<Frame> {
      const deadline = Date.now() + ms;
      for (;;) {
        while (read < frames.length) {
          const f = frames[read++];
          if (want(f)) return f;
        }
        const left = deadline - Date.now();
        if (left <= 0) throw new Error("no matching frame within the time limit");
        await new Promise<void>((resolve) => {
          wake = resolve;
          setTimeout(resolve, left);
        });
      }
    },
    close: () => controller.abort(),
  };
}

const names = (f: Frame) => (f.data.people as { name: string }[]).map((p) => p.name).sort();

describe("two people on one plan", () => {
  it("each open plan sees who else has it open, and sees them leave", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id } = await exampleEvent(alice);

    const a = await open(alice, id);
    await a.next((f) => f.event === "presence" && names(f).join() === "Alice");
    const b = await open(ben, id);
    await a.next((f) => f.event === "presence" && names(f).join() === "Alice,Ben");
    await b.next((f) => f.event === "presence" && names(f).join() === "Alice,Ben");

    b.close();
    await a.next((f) => f.event === "presence" && names(f).join() === "Alice");
    a.close();
  });

  it("two tabs from one person count as one person", async () => {
    const alice = await person("Alice");
    const { id } = await exampleEvent(alice);
    const first = await open(alice, id);
    const second = await open(alice, id);
    const frame = await second.next((f) => f.event === "presence");
    expect(names(frame)).toEqual(["Alice"]);
    first.close();
    second.close();
  });

  it("a drag in progress reaches the other plan within a second, and is not saved", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id, robotics } = await exampleEvent(alice);
    const b = await open(ben, id);

    const res = await api(alice, `/api/events/${id}/objects/${robotics.id}/preview`, { cx: 6500, cy: robotics.cy });
    expect(res.status).toBe(202);
    const frame = await b.next((f) => f.event === "preview" && f.data.objectId === robotics.id);
    expect(frame.data).toMatchObject({ cx: 6500, by: { name: "Alice" } });
    b.close();

    const { objects } = await (await api(ben, `/api/events/${id}`)).json();
    const saved = (objects as Obj[]).find((o) => o.id === robotics.id)!;
    expect(saved.cx).toBe(robotics.cx);
    expect(saved.version).toBe(robotics.version);
  });

  it("an abandoned drag is withdrawn from the other plan", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id, robotics } = await exampleEvent(alice);
    const b = await open(ben, id);

    await api(alice, `/api/events/${id}/objects/${robotics.id}/preview`, { cx: 6500, cy: robotics.cy });
    await api(alice, `/api/events/${id}/objects/${robotics.id}/preview`, { cancel: true });
    const frame = await b.next((f) => f.event === "preview" && f.data.cancel === true);
    expect(frame.data.objectId).toBe(robotics.id);
    b.close();
  });

  it("a preview of something that can't be moved is refused", async () => {
    const alice = await person("Alice");
    const { id } = await exampleEvent(alice);
    const res = await api(alice, `/api/events/${id}/objects/nope/preview`, { cx: 1000, cy: 1000 });
    expect(res.status).toBe(404);
  });

  it("a plan that reconnects is sent the moves it missed, in order", async () => {
    const alice = await person("Alice");
    const ben = await person("Ben");
    const { id, seq, robotics } = await exampleEvent(alice);

    const first = await api(alice, `/api/events/${id}/objects/${robotics.id}/move`, { expectedVersion: 1, cx: 7000, cy: robotics.cy });
    expect(first.status).toBe(200);
    const second = await api(alice, `/api/events/${id}/objects/${robotics.id}/move`, { expectedVersion: 2, cx: 7500, cy: robotics.cy });
    expect(second.status).toBe(200);

    const b = await open(ben, id, { "last-event-id": String(seq) });
    const one = await b.next((f) => f.data.type === "object.moved");
    const two = await b.next((f) => f.data.type === "object.moved");
    expect([one.data.object.cx, two.data.object.cx]).toEqual([7000, 7500]);
    expect(Number(two.id)).toBeGreaterThan(Number(one.id));
    b.close();
  });
});

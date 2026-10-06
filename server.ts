import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { renderMarkdown } from "./markdown.ts";

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? (existsSync("/data") ? "/data" : "./data");
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, "shared-space.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 2000;
  CREATE TABLE IF NOT EXISTS actors (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES actors(id));
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL REFERENCES actors(id),
    room_w INTEGER NOT NULL, room_d INTEGER NOT NULL, seq INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS members (
    event_id TEXT NOT NULL REFERENCES events(id), actor_id TEXT NOT NULL REFERENCES actors(id),
    role TEXT NOT NULL, PRIMARY KEY (event_id, actor_id));
  CREATE TABLE IF NOT EXISTS objects (
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), kind TEXT NOT NULL,
    label TEXT NOT NULL, cx INTEGER NOT NULL, cy INTEGER NOT NULL, w INTEGER NOT NULL, d INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, updated_by TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS history (
    event_id TEXT NOT NULL REFERENCES events(id), seq INTEGER NOT NULL, actor_id TEXT NOT NULL,
    type TEXT NOT NULL, payload TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (event_id, seq));
`);

type Actor = { id: string; name: string };
type Obj = {
  id: string; event_id: string; kind: string; label: string;
  cx: number; cy: number; w: number; d: number; version: number;
  updated_by: string | null; updated_at: string | null;
};

const now = () => new Date().toISOString();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const log = (fields: Record<string, unknown>) => console.log(JSON.stringify({ at: now(), ...fields }));

function tx<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// --- live updates -----------------------------------------------------------
const streams = new Map<string, Set<ServerResponse>>();

function broadcast(eventId: string, seq: number, data: unknown) {
  for (const res of streams.get(eventId) ?? []) {
    res.write(`id: ${seq}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

function appendHistory(eventId: string, actorId: string, type: string, payload: unknown): number {
  db.prepare("UPDATE events SET seq = seq + 1 WHERE id = ?").run(eventId);
  const { seq } = db.prepare("SELECT seq FROM events WHERE id = ?").get(eventId) as { seq: number };
  db.prepare("INSERT INTO history (event_id, seq, actor_id, type, payload, at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(eventId, seq, actorId, type, JSON.stringify(payload), now());
  return seq;
}

// --- example event ----------------------------------------------------------
// Top-left corners in metres from the plan, converted to centre millimetres.
const EXAMPLE = [
  { kind: "keepclear", label: "Main walkway", x: 5, y: 0, w: 2, d: 8 },
  { kind: "activity", label: "Arts", x: 1, y: 1, w: 3, d: 2 },
  { kind: "activity", label: "Film", x: 1, y: 5, w: 3, d: 2 },
  { kind: "activity", label: "Robotics", x: 8, y: 1, w: 3, d: 2 },
  { kind: "activity", label: "Music", x: 8, y: 5, w: 3, d: 2 },
];

function createExampleEvent(actor: Actor): string {
  const id = randomUUID();
  tx(() => {
    db.prepare("INSERT INTO events (id, name, owner_id, room_w, room_d, created_at) VALUES (?, ?, ?, 12000, 8000, ?)")
      .run(id, "Campus Clubs Fair (example)", actor.id, now());
    db.prepare("INSERT INTO members (event_id, actor_id, role) VALUES (?, ?, 'owner')").run(id, actor.id);
    const insert = db.prepare(
      "INSERT INTO objects (id, event_id, kind, label, cx, cy, w, d) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const o of EXAMPLE) {
      insert.run(randomUUID(), id, o.kind, o.label, (o.x + o.w / 2) * 1000, (o.y + o.d / 2) * 1000, o.w * 1000, o.d * 1000);
    }
    appendHistory(id, actor.id, "event.created", { name: "Campus Clubs Fair (example)" });
  });
  return id;
}

// --- http helpers -----------------------------------------------------------
function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error("too large");
  }
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function currentActor(req: IncomingMessage): Actor | null {
  const match = /(?:^|;\s*)sid=([A-Za-z0-9_-]+)/.exec(req.headers.cookie ?? "");
  if (!match) return null;
  const row = db.prepare(
    "SELECT actors.id, actors.name FROM sessions JOIN actors ON actors.id = sessions.actor_id WHERE token_hash = ?",
  ).get(hash(match[1])) as Actor | undefined;
  return row ?? null;
}

function isSecure(req: IncomingMessage) {
  return req.headers["x-forwarded-proto"] === "https";
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
};

function serveFile(res: ServerResponse, root: string, rel: string): boolean {
  const path = normalize(join(root, rel));
  if (!path.startsWith(normalize(root)) || !existsSync(path) || !extname(path)) return false;
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
  return true;
}

function readmePage(): string {
  const body = renderMarkdown(readFileSync("README.md", "utf8"));
  return readFileSync("public/readme.html", "utf8").replace("<!--README-->", body);
}

const intIn = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

// --- routes -----------------------------------------------------------------
async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://local");
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "GET" && (path === "/readme" || path === "/readme/")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(readmePage());
  }
  if (method === "GET" && path === "/") return serveFile(res, "public", "index.html");
  if (method === "GET" && /^\/events\/[\w-]+\/?$/.test(path)) return serveFile(res, "public", "plan.html");
  if (method === "GET" && path.startsWith("/docs/") && serveFile(res, ".", path)) return;
  if (method === "GET" && !path.startsWith("/api/") && serveFile(res, "public", path)) return;

  if (path === "/api/session" && method === "POST") {
    const { name } = await readJson(req);
    const clean = typeof name === "string" ? name.trim().slice(0, 40) : "";
    if (!clean) return send(res, 400, { code: "NAME_REQUIRED", message: "Choose a display name." });
    const actor = { id: randomUUID(), name: clean };
    const token = randomBytes(24).toString("base64url");
    db.prepare("INSERT INTO actors (id, name, created_at) VALUES (?, ?, ?)").run(actor.id, actor.name, now());
    db.prepare("INSERT INTO sessions (token_hash, actor_id) VALUES (?, ?)").run(hash(token), actor.id);
    log({ action: "session.created", actor: actor.id });
    const cookie = `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000${isSecure(req) ? "; Secure" : ""}`;
    return send(res, 201, actor, { "set-cookie": cookie });
  }

  const actor = currentActor(req);

  if (path === "/api/me" && method === "GET") {
    return actor ? send(res, 200, actor) : send(res, 401, { code: "NO_SESSION", message: "Choose a name first." });
  }
  if (!path.startsWith("/api/")) return send(res, 404, { code: "NOT_FOUND", message: "Not found." });
  if (!actor) return send(res, 401, { code: "NO_SESSION", message: "Choose a name first." });

  if (path === "/api/events" && method === "GET") {
    const rows = db.prepare(
      "SELECT events.id, events.name, members.role FROM members JOIN events ON events.id = members.event_id WHERE members.actor_id = ? ORDER BY events.created_at DESC",
    ).all(actor.id);
    return send(res, 200, rows);
  }
  if (path === "/api/events" && method === "POST") {
    const id = createExampleEvent(actor);
    log({ action: "event.created", actor: actor.id, event: id });
    return send(res, 201, { id });
  }

  const eventMatch = /^\/api\/events\/([\w-]+)(\/.*)?$/.exec(path);
  if (!eventMatch) return send(res, 404, { code: "NOT_FOUND", message: "Not found." });
  const eventId = eventMatch[1];
  const rest = eventMatch[2] ?? "";
  const event = db.prepare("SELECT id, name, room_w, room_d, seq FROM events WHERE id = ?").get(eventId) as
    | { id: string; name: string; room_w: number; room_d: number; seq: number }
    | undefined;
  if (!event) return send(res, 404, { code: "NOT_FOUND", message: "No such event." });

  // Anyone holding the link joins as an editor for now; roles come later.
  db.prepare("INSERT OR IGNORE INTO members (event_id, actor_id, role) VALUES (?, ?, 'editor')").run(eventId, actor.id);

  if (rest === "" && method === "GET") {
    const objects = db.prepare(
      "SELECT objects.*, actors.name AS updated_by_name FROM objects LEFT JOIN actors ON actors.id = objects.updated_by WHERE event_id = ? ORDER BY kind DESC, label",
    ).all(eventId);
    log({ action: "event.opened", actor: actor.id, event: eventId });
    return send(res, 200, { event, objects, me: actor });
  }

  if (rest === "/stream" && method === "GET") {
    res.writeHead(200, {
      "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive",
    });
    // Node holds headers until the first body write; without this the client waits for the first event.
    res.write(": open\n\n");
    const after = Number(req.headers["last-event-id"] ?? url.searchParams.get("after") ?? event.seq);
    const missed = db.prepare("SELECT seq, payload FROM history WHERE event_id = ? AND seq > ? ORDER BY seq LIMIT 500")
      .all(eventId, after) as { seq: number; payload: string }[];
    for (const m of missed) res.write(`id: ${m.seq}\ndata: ${m.payload}\n\n`);
    if (!streams.has(eventId)) streams.set(eventId, new Set());
    streams.get(eventId)!.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
    req.on("close", () => {
      clearInterval(ping);
      streams.get(eventId)?.delete(res);
    });
    return;
  }

  const moveMatch = /^\/objects\/([\w-]+)\/move$/.exec(rest);
  if (moveMatch && method === "POST") {
    const body = await readJson(req);
    if (!intIn(body.expectedVersion, 1, 1e9) || !intIn(body.cx, -100_000, 100_000) || !intIn(body.cy, -100_000, 100_000)) {
      return send(res, 400, { code: "VALIDATION_FAILED", message: "Move needs whole-millimetre cx, cy and expectedVersion." });
    }
    const result = tx(() => {
      const current = db.prepare("SELECT * FROM objects WHERE id = ? AND event_id = ?").get(moveMatch[1], eventId) as Obj | undefined;
      if (!current || current.kind !== "activity") return { status: 404 as const };
      if (current.version !== body.expectedVersion) return { status: 409 as const, current };
      const at = now();
      db.prepare("UPDATE objects SET cx = ?, cy = ?, version = version + 1, updated_by = ?, updated_at = ? WHERE id = ?")
        .run(body.cx as number, body.cy as number, actor.id, at, current.id);
      const object = { ...current, cx: body.cx as number, cy: body.cy as number, version: current.version + 1, updated_by: actor.id, updated_by_name: actor.name, updated_at: at };
      const payload = { type: "object.moved", object, by: actor.name };
      const seq = appendHistory(eventId, actor.id, "object.moved", payload);
      return { status: 200 as const, object, seq, payload };
    });
    if (result.status === 404) return send(res, 404, { code: "NOT_FOUND", message: "No such activity." });
    if (result.status === 409) {
      log({ action: "object.move", outcome: "conflict", actor: actor.id, event: eventId, object: moveMatch[1] });
      return send(res, 409, { code: "STALE_VERSION", message: "Someone else moved this first.", current: result.current });
    }
    log({ action: "object.move", outcome: "ok", actor: actor.id, event: eventId, object: result.object.id, version: result.object.version });
    broadcast(eventId, result.seq, result.payload);
    return send(res, 200, { object: result.object, seq: result.seq });
  }

  return send(res, 404, { code: "NOT_FOUND", message: "Not found." });
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    log({ action: "error", message: String(err) });
    if (!res.headersSent) send(res, 500, { code: "SERVER_ERROR", message: "Something went wrong." });
    else res.end();
  });
}).listen(PORT, "0.0.0.0", () => log({ action: "listening", port: PORT, data: DATA_DIR }));

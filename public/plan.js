const $ = (id) => document.getElementById(id);
const SVG = "http://www.w3.org/2000/svg";
const SNAP = 100;
const eventId = location.pathname.split("/")[2];

let event = null;
let me = null;
let objects = new Map();
let selectedId = null;
let tapMode = false;
let lastSeq = 0;
const pending = new Set();
// objectId -> { cx, cy, by } for someone else's drag in progress; never saved
const ghosts = new Map();
let people = null;

const m = (mm) => (mm / 1000).toFixed(1).replace(/\.0$/, "");
const snap = (v) => Math.round(v / SNAP) * SNAP;
const announce = (text) => { $("announce").textContent = text; };
const edges = (o) => ({ l: o.cx - o.w / 2, r: o.cx + o.w / 2, t: o.cy - o.d / 2, b: o.cy + o.d / 2 });
const overlap = (a, b) => {
  const p = edges(a), q = edges(b);
  return Math.min(p.r, q.r) - Math.max(p.l, q.l) > 0 && Math.min(p.b, q.b) - Math.max(p.t, q.t) > 0 ? [Math.min(p.r, q.r) - Math.max(p.l, q.l), Math.min(p.b, q.b) - Math.max(p.t, q.t)] : null;
};

function issues() {
  const list = [];
  const acts = [...objects.values()].filter((o) => o.kind === "activity");
  const zones = [...objects.values()].filter((o) => o.kind === "keepclear");
  for (const a of acts) {
    const e = edges(a);
    if (e.l < 0 || e.t < 0 || e.r > event.room_w || e.b > event.room_d) list.push({ ids: [a.id], text: `${a.label} is partly outside the room.` });
    for (const z of zones) {
      const o = overlap(a, z);
      if (o) list.push({ ids: [a.id], text: `${a.label} extends ${m(Math.min(...o))} m into ${z.label}.` });
    }
  }
  for (let i = 0; i < acts.length; i++)
    for (let j = i + 1; j < acts.length; j++)
      if (overlap(acts[i], acts[j])) list.push({ ids: [acts[i].id, acts[j].id], text: `${acts[i].label} and ${acts[j].label} overlap.` });
  return list;
}

function render() {
  const svg = $("svg");
  svg.setAttribute("viewBox", `-200 -200 ${event.room_w + 400} ${event.room_d + 400}`);
  [...svg.querySelectorAll(":scope > g, :scope > rect")].forEach((n) => n.remove());

  const room = document.createElementNS(SVG, "rect");
  Object.entries({ x: 0, y: 0, width: event.room_w, height: event.room_d, class: "room" }).forEach(([k, v]) => room.setAttribute(k, v));
  svg.append(room);
  const grid = document.createElementNS(SVG, "g");
  grid.setAttribute("class", "grid");
  for (let x = 1000; x < event.room_w; x += 1000) grid.append(line(x, 0, x, event.room_d));
  for (let y = 1000; y < event.room_d; y += 1000) grid.append(line(0, y, event.room_w, y));
  svg.append(grid);

  const problems = issues();
  const problemIds = new Set(problems.flatMap((p) => p.ids));
  for (const o of objects.values()) {
    const e = edges(o);
    const g = document.createElementNS(SVG, "g");
    const r = document.createElementNS(SVG, "rect");
    Object.entries({ x: e.l, y: e.t, width: o.w, height: o.d }).forEach(([k, v]) => r.setAttribute(k, v));
    const t = document.createElementNS(SVG, "text");
    t.setAttribute("x", o.cx);
    t.setAttribute("y", o.cy);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.textContent = o.label;
    if (o.kind === "keepclear") {
      r.setAttribute("class", "keepclear");
      t.setAttribute("class", "keepclear-label");
      t.setAttribute("transform", `rotate(-90 ${o.cx} ${o.cy})`);
      g.append(r, t);
      svg.insertBefore(g, svg.querySelector(".activity"));
      continue;
    }
    g.setAttribute("class", ["activity", problemIds.has(o.id) && "problem", o.id === selectedId && "selected", pending.has(o.id) && "pending"].filter(Boolean).join(" "));
    g.dataset.id = o.id;
    g.append(r, t);
    svg.append(g);
  }

  for (const [id, p] of ghosts) {
    const o = objects.get(id);
    if (!o) continue;
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("class", "ghost");
    const r = document.createElementNS(SVG, "rect");
    Object.entries({ x: p.cx - o.w / 2, y: p.cy - o.d / 2, width: o.w, height: o.d }).forEach(([k, v]) => r.setAttribute(k, v));
    const t = document.createElementNS(SVG, "text");
    t.setAttribute("x", p.cx);
    t.setAttribute("y", p.cy);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.textContent = p.by.name;
    g.append(r, t);
    svg.append(g);
  }

  // Rebuilding the list would drop keyboard focus on every remote update; put it back.
  const focusedId = $("objects").contains(document.activeElement) ? document.activeElement.dataset.id : null;
  $("objects").replaceChildren(...[...objects.values()].filter((o) => o.kind === "activity").map((o) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = o.id;
    b.setAttribute("aria-pressed", String(o.id === selectedId));
    const notes = [problemIds.has(o.id) && "has a problem", ghosts.has(o.id) && `${ghosts.get(o.id).by.name} is moving it`].filter(Boolean);
    b.textContent = [o.label, ...notes].join(" — ");
    b.addEventListener("click", () => select(o.id));
    li.append(b);
    return li;
  }));
  if (focusedId) $("objects").querySelector(`[data-id="${focusedId}"]`)?.focus({ preventScroll: true });

  renderPeople();

  $("issues").replaceChildren(...problems.map((p) => {
    const li = document.createElement("li");
    li.textContent = p.text;
    return li;
  }));
  $("no-issues").hidden = problems.length > 0;

  const sel = objects.get(selectedId);
  $("inspector").hidden = !sel;
  if (sel) {
    $("sel-name").textContent = sel.label;
    $("sel-meta").textContent = `${m(sel.w)} × ${m(sel.d)} m · ${sel.updated_by_name ? `last moved by ${sel.updated_by_name}` : "not moved yet"}`;
    const x = $("pos-x"), y = $("pos-y");
    if (document.activeElement !== x) x.value = m(edges(sel).l);
    if (document.activeElement !== y) y.value = m(edges(sel).t);
  }
}

function renderPeople() {
  const el = $("people");
  if (!people) {
    el.textContent = "";
    return;
  }
  const others = people.filter((p) => p.id !== me.id).map((p) => p.name);
  el.textContent = others.length ? `Also here now: ${others.join(", ")}.` : "Nobody else has this plan open right now.";
}

function line(x1, y1, x2, y2) {
  const l = document.createElementNS(SVG, "line");
  Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v));
  return l;
}

function select(id) {
  selectedId = id;
  tapMode = false;
  $("tap-mode").textContent = "Tap the plan to place";
  render();
}

async function move(id, cx, cy) {
  const o = objects.get(id);
  if (!o || pending.has(id)) return;
  const before = { ...o };
  objects.set(id, { ...o, cx, cy });
  pending.add(id);
  render();
  try {
    const res = await fetch(`/api/events/${eventId}/objects/${id}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedVersion: o.version, cx, cy }),
    });
    const body = await res.json();
    if (res.status === 409) {
      objects.set(id, { ...before, ...body.current });
      $("conflict").textContent = `${o.label} was just moved by ${body.current.updated_by_name ?? "someone else"}, so your move wasn't saved. It's shown where they put it — move it again if you still want to.`;
      $("conflict").hidden = false;
      announce("Your move wasn't saved because someone else moved it first.");
    } else if (!res.ok) {
      objects.set(id, before);
      announce(body.message ?? "Move failed.");
    } else {
      objects.set(id, { ...objects.get(id), ...body.object });
      $("conflict").hidden = true;
      announce(`${o.label} saved at ${m(edges(body.object).l)}, ${m(edges(body.object).t)} m.`);
    }
  } catch {
    objects.set(id, before);
    announce("Couldn't reach the server; the move wasn't saved.");
  } finally {
    pending.delete(id);
    render();
  }
}

// Pointer: drag an activity, or in tap mode tap a destination.
function toPlan(evt) {
  const pt = $("svg").createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform($("svg").getScreenCTM().inverse());
}

// While dragging, tell others where it is now (at most every 80 ms, plus the last spot).
const PREVIEW_EVERY_MS = 80;
let previewTimer = null;
let previewQueued = null;
let previewSentAt = 0;

function postPreview(id, body) {
  fetch(`/api/events/${eventId}/objects/${id}/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

function sendPreview(id, cx, cy, baseVersion) {
  previewQueued = { id, cx, cy, baseVersion };
  if (previewTimer) return;
  const wait = Math.max(0, PREVIEW_EVERY_MS - (Date.now() - previewSentAt));
  previewTimer = setTimeout(() => {
    previewTimer = null;
    if (!previewQueued) return;
    const { id: qid, ...body } = previewQueued;
    previewQueued = null;
    previewSentAt = Date.now();
    postPreview(qid, body);
  }, wait);
}

function endPreview(id, cancel) {
  clearTimeout(previewTimer);
  previewTimer = null;
  previewQueued = null;
  // A committed move replaces the ghost for everyone when it's broadcast; only an abandoned drag needs withdrawing.
  if (cancel) postPreview(id, { cancel: true });
}

let drag = null;
$("svg").addEventListener("pointerdown", (evt) => {
  const g = evt.target.closest(".activity");
  if (tapMode && selectedId) {
    const p = toPlan(evt);
    tapMode = false;
    $("tap-mode").textContent = "Tap the plan to place";
    move(selectedId, snap(p.x), snap(p.y));
    return;
  }
  if (!g) return;
  const o = objects.get(g.dataset.id);
  selectedId = o.id;
  const p = toPlan(evt);
  drag = { id: o.id, dx: p.x - o.cx, dy: p.y - o.cy, start: { cx: o.cx, cy: o.cy }, moved: false };
  $("svg").setPointerCapture(evt.pointerId);
  render();
});
$("svg").addEventListener("pointermove", (evt) => {
  if (!drag) return;
  const p = toPlan(evt);
  const o = objects.get(drag.id);
  const cx = snap(p.x - drag.dx), cy = snap(p.y - drag.dy);
  if (cx === o.cx && cy === o.cy) return;
  drag.moved = true;
  objects.set(drag.id, { ...o, cx, cy });
  sendPreview(drag.id, cx, cy, o.version);
  render();
});
function endDrag() {
  if (!drag) return;
  const { id, start, moved } = drag;
  drag = null;
  const o = objects.get(id);
  if (!moved || (o.cx === start.cx && o.cy === start.cy)) {
    if (moved) endPreview(id, true);
    return render();
  }
  endPreview(id, false);
  objects.set(id, { ...o, ...start });
  move(id, o.cx, o.cy);
}
$("svg").addEventListener("pointerup", endDrag);
$("svg").addEventListener("pointercancel", () => {
  if (!drag) return;
  objects.set(drag.id, { ...objects.get(drag.id), ...drag.start });
  if (drag.moved) endPreview(drag.id, true);
  drag = null;
  render();
});

document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && drag) {
    objects.set(drag.id, { ...objects.get(drag.id), ...drag.start });
    if (drag.moved) endPreview(drag.id, true);
    drag = null;
    return render();
  }
  if (!selectedId || evt.target.closest("input, textarea")) return;
  const step = evt.shiftKey ? 1000 : SNAP;
  const d = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[evt.key];
  if (!d) return;
  evt.preventDefault();
  const o = objects.get(selectedId);
  move(o.id, o.cx + d[0], o.cy + d[1]);
});

document.querySelectorAll(".pad button").forEach((b) => b.addEventListener("click", () => {
  const o = objects.get(selectedId);
  move(o.id, o.cx + Number(b.dataset.dx), o.cy + Number(b.dataset.dy));
}));

$("pos-form").addEventListener("submit", (evt) => {
  evt.preventDefault();
  const o = objects.get(selectedId);
  const l = Math.round(Number($("pos-x").value) * 1000);
  const t = Math.round(Number($("pos-y").value) * 1000);
  if (!Number.isFinite(l) || !Number.isFinite(t)) return;
  move(o.id, snap(l + o.w / 2), snap(t + o.d / 2));
});

$("tap-mode").addEventListener("click", () => {
  tapMode = !tapMode;
  $("tap-mode").textContent = tapMode ? "Now tap where its centre should go (or press again to cancel)" : "Tap the plan to place";
});

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    announce("Link copied.");
    $("copy").textContent = "Copied";
  } catch {
    announce(location.href);
  }
});

// EventSource retries a dropped connection itself, but gives up for good if a
// retry gets a non-200 (e.g. Fly's proxy while the machine restarts). Then we
// open a fresh one, resuming after the last saved change we applied.
let es = null;
let retryDelay = 1000;

function setStatus(state, text) {
  $("status").dataset.state = state;
  $("status").textContent = text;
}

function connect() {
  es = new EventSource(`/api/events/${eventId}/stream?after=${lastSeq}`);
  es.onopen = () => {
    retryDelay = 1000;
    setStatus("live", "Live");
  };
  es.onerror = () => {
    setStatus("offline", "Reconnecting — plan may be out of date");
    // Whatever others were dragging may have ended while we couldn't hear it.
    if (ghosts.size || people) {
      ghosts.clear();
      people = null;
      render();
    }
    if (es.readyState === EventSource.CLOSED) {
      es = null;
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 15_000);
    }
  };
  es.onmessage = (msg) => {
    lastSeq = Number(msg.lastEventId) || lastSeq;
    const data = JSON.parse(msg.data);
    if (data.type !== "object.moved") return;
    ghosts.delete(data.object.id);
    const current = objects.get(data.object.id);
    if (current && current.version >= data.object.version) return render();
    if (drag && drag.id === data.object.id) drag = null;
    objects.set(data.object.id, { ...current, ...data.object });
    if (data.object.updated_by !== me.id) announce(`${data.by} moved ${data.object.label}.`);
    render();
  };
  es.addEventListener("preview", (msg) => {
    const p = JSON.parse(msg.data);
    if (p.by.id === me.id) return;
    if (p.cancel) ghosts.delete(p.objectId);
    else ghosts.set(p.objectId, p);
    render();
  });
  es.addEventListener("presence", (msg) => {
    const before = new Set((people ?? []).map((p) => p.id));
    people = JSON.parse(msg.data).people;
    const joined = people.filter((p) => p.id !== me.id && !before.has(p.id));
    if (before.size && joined.length) announce(`${joined.map((p) => p.name).join(", ")} opened the plan.`);
    for (const [id, g] of ghosts) if (!people.some((p) => p.id === g.by.id)) ghosts.delete(id);
    render();
  });
}

async function start() {
  const res = await fetch(`/api/events/${eventId}`);
  if (res.status === 401) {
    location.href = `/?next=${encodeURIComponent(location.pathname)}`;
    return;
  }
  if (!res.ok) {
    $("title").textContent = "This plan doesn't exist";
    $("status").hidden = true;
    return;
  }
  const data = await res.json();
  event = data.event;
  me = data.me;
  lastSeq = event.seq;
  objects = new Map(data.objects.map((o) => [o.id, o]));
  $("title").textContent = event.name;
  document.title = `${event.name} — Shared Space`;
  if (event.named) {
    $("join-hint").textContent = `Others can join from the home page by typing the room name “${event.name}”, or with this page's address, in their own browser.`;
  }
  render();
  connect();
}

start();

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

  $("objects").replaceChildren(...[...objects.values()].filter((o) => o.kind === "activity").map((o) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = o.id;
    b.setAttribute("aria-pressed", String(o.id === selectedId));
    b.textContent = `${o.label}${problemIds.has(o.id) ? " — has a problem" : ""}`;
    b.addEventListener("click", () => select(o.id));
    li.append(b);
    return li;
  }));

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
  drag.moved = true;
  objects.set(drag.id, { ...o, cx: snap(p.x - drag.dx), cy: snap(p.y - drag.dy) });
  render();
});
$("svg").addEventListener("pointerup", () => {
  if (!drag) return;
  const { id, start, moved } = drag;
  drag = null;
  const o = objects.get(id);
  if (!moved || (o.cx === start.cx && o.cy === start.cy)) return render();
  objects.set(id, { ...o, ...start });
  move(id, o.cx, o.cy);
});

document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && drag) {
    objects.set(drag.id, { ...objects.get(drag.id), ...drag.start });
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

function connect() {
  const es = new EventSource(`/api/events/${eventId}/stream?after=${lastSeq}`);
  es.onopen = () => {
    $("status").dataset.state = "live";
    $("status").textContent = "Live";
  };
  es.onerror = () => {
    $("status").dataset.state = "offline";
    $("status").textContent = "Reconnecting — plan may be out of date";
  };
  es.onmessage = (msg) => {
    lastSeq = Number(msg.lastEventId) || lastSeq;
    const data = JSON.parse(msg.data);
    if (data.type !== "object.moved") return;
    const current = objects.get(data.object.id);
    if (current && current.version >= data.object.version) return;
    if (drag && drag.id === data.object.id) drag = null;
    objects.set(data.object.id, { ...current, ...data.object });
    if (data.object.updated_by !== me.id) announce(`${data.by} moved ${data.object.label}.`);
    render();
  };
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
  render();
  connect();
}

start();

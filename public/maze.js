import { ApiError, raceId, request } from "./maze-api.js";
import { MazeView } from "./maze-render.js";
import { setupViews } from "./maze-views.js";
import { mountRace } from "./maze-race.js";
import { mountReplay } from "./maze-replay.js";
import { setupAudio } from "./maze-audio-ui.js";
import { setupAvatarPicker } from "./maze-avatar-ui.js";
import { mountSpectator } from "./maze-spectate.js";
import { reveal, setStep } from "./maze-flow.js";

export const formatTime = (ms) => `${Math.floor(ms / 60_000).toString().padStart(2, "0")}:${((ms % 60_000) / 1_000).toFixed(1).padStart(4, "0")}`;

const $ = (id) => document.getElementById(id);
const replayId = /^\/race\/([a-f0-9-]{36})\/replay\/?$/.exec(location.pathname)?.[1] ?? null;
const watchToken = /^\/watch\/([a-f0-9-]{36})\/?$/.exec(location.pathname)?.[1] ?? null;
const invitationId = replayId || watchToken ? null : raceId(location.href);
let actor = null;
let mazeView, picker, preview = null, inLobby = true, today = null;
const audio = setupAudio();

function showError(error) {
  $("error").textContent = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  $("error").hidden = false;
}

async function recentRaces() {
  if (!actor || invitationId) return;
  const { matches } = await request("/api/maze/matches");
  $("recent").hidden = matches.length === 0;
  syncBoard();
  $("recent-list").replaceChildren(...matches.slice(0, 4).map((game) => {
    const item = document.createElement("li"), link = document.createElement("a"), status = document.createElement("span");
    link.href = `/race/${game.id}`;
    link.append(`RACE ${game.id.slice(0, 8).toUpperCase()}`);
    status.textContent = game.status === "finished" ? `${game.winner} · ${formatTime(game.timeMs)}` : game.status;
    link.append(status);
    item.append(link);
    return item;
  }));
}

async function enter(id) {
  const view = await request(`/api/maze/matches/${id}/join`, { look: picker.chosen() });
  inLobby = false;
  leaveLobby();
  mountRace(view, mazeView, showError, audio);
}

// The wizard: name -> choose -> (join) , one pane at a time. Panes are stacked in
// one grid cell and slide; only the current one is focusable or announced.
const PANES = ["name", "choose", "join"];
let pane = "name";
function showPane(name, { focus = true } = {}) {
  const from = PANES.indexOf(pane), to = PANES.indexOf(name);
  for (const el of document.querySelectorAll(".pane")) {
    const index = PANES.indexOf(el.dataset.pane);
    el.dataset.pos = index === to ? "current" : index < to ? "before" : "after";
    el.inert = index !== to;
    el.setAttribute("aria-hidden", String(index !== to));
  }
  pane = name;
  document.body.dataset.step = name;
  setStep(name === "name" ? 0 : 1);
  if (focus && from !== to) {
    const target = document.querySelector(`.pane[data-pane="${name}"] [data-autofocus], .pane[data-pane="${name}"] .btn-primary`);
    setTimeout(() => target?.focus({ preventScroll: true }), 120);
  }
}
function setBusy(button, busy) {
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  button.setAttribute("aria-busy", String(busy));
}
function fieldError(id, input, message) {
  const el = $(id);
  el.hidden = !message;
  el.textContent = message ?? "";
  input.setAttribute("aria-invalid", String(Boolean(message)));
}
function leaveLobby() {
  for (const id of ["entry"]) $(id).hidden = true;
  setStep(-1);
  $("avatar-open").hidden = true;
}
function syncBoard() {
  $("board-empty").hidden = !$("best").hidden || !$("recent").hidden;
}

function showIdentity() {
  $("identity").textContent = actor ? `WELCOME, ${actor.name.toUpperCase()}` : "WELCOME";
  $("choose-title").textContent = "What’s the plan?";
}

// Lobby buttons click too; the race view handles its own panel.
$("entry").addEventListener("click", (event) => {
  const button = event.target.closest?.("button");
  if (button && !button.disabled) audio.play("click");
});

// Step 1: a nickname. Everything else waits until it exists.
$("name-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = $("nickname").value.trim();
  if (!name) { fieldError("name-error", $("nickname"), "Pick a nickname so your rival knows who you are."); $("nickname").focus(); return; }
  fieldError("name-error", $("nickname"), null);
  setBusy($("name-next"), true);
  try {
    actor = await request("/api/session", { name });
    if (replayId) return location.reload();
    if (invitationId) return void (await go(invitationId));
    showIdentity();
    await showStats();
    showPane("choose");
  } catch (error) { fieldError("name-error", $("nickname"), error.message ?? "Could not save your nickname. Try again."); }
  finally { setBusy($("name-next"), false); }
});
$("nickname").addEventListener("input", () => fieldError("name-error", $("nickname"), null));

// Step 2: create or join. Both go through the avatar step, then straight to the waiting room.
$("create-race").addEventListener("click", () => go(null));
$("to-join").addEventListener("click", () => showPane("join"));
$("join-back").addEventListener("click", () => showPane("choose"));
$("invite").addEventListener("input", () => fieldError("join-error", $("invite"), null));
$("join-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = raceId($("invite").value);
  if (!id) { fieldError("join-error", $("invite"), "That does not look like a race link from this site. Paste the whole link your friend sent."); $("invite").focus(); return; }
  go(id);
});

// Step 3 and on: choose an avatar, then create or join and land in the waiting room.
async function go(id) {
  const button = id ? (invitationId ? $("name-next") : $("join-race")) : $("create-race");
  $("error").hidden = true;
  setStep(2);
  if (!(await askAvatar(id ? "Join the race" : "Create the race"))) { setStep(invitationId ? 0 : 1); return; }
  setStep(3);
  setBusy(button, true);
  try {
    if (invitationId) return await enter(id);
    const view = await request(id ? `/api/maze/matches/${id}/join` : "/api/maze/matches", { look: picker.chosen() });
    location.assign(`/race/${view.game.id}`);
  } catch (error) {
    setStep(invitationId ? 0 : 1);
    if (invitationId) showError(error);
    else if (id) fieldError("join-error", $("invite"), error.message);
    else showError(error);
    setBusy(button, false);
    try { await recentRaces(); } catch { /* Preserve the original actionable error. */ }
  }
}

// Opens the designer in front and resolves true when the player continues.
// Back returns to the plan. It is shown for every new race, and again on request.
function askAvatar(label, force = true) {
  const dialog = $("avatar-card");
  if (!force || typeof dialog.showModal !== "function") return Promise.resolve(true);
  $("avatar-go-label").textContent = label;
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "go"), { once: true });
    dialog.returnValue = "";
    dialog.showModal();
    preview?.draw?.(0);
  });
}
$("avatar-open").addEventListener("click", () => { void askAvatar("Done", true); });
document.addEventListener("click", (event) => {
  const opener = event.target.closest?.("[data-open]");
  if (!opener) return;
  const dialog = $(opener.dataset.open);
  if (typeof dialog?.showModal === "function") { audio.play("click"); dialog.showModal(); }
});

// Streak and personal best: shown once a nickname exists.
async function showStats() {
  if (!actor) return;
  try {
    const stats = await request("/api/maze/stats");
    $("stats-card").hidden = false;
    $("stat-streak").textContent = String(stats.streak);
    $("stat-best").textContent = stats.best === null ? "—" : formatTime(stats.best);
    $("stat-note").textContent = stats.streak === 0 ? "Finish a race today to start a streak."
      : stats.playedToday ? "You have raced today. Come back tomorrow to keep it going."
      : "Race today to keep your streak alive.";
  } catch { /* stats are a bonus; the lobby works without them */ }
}

// WebGL can be unavailable (old devices, blocked GPU); fall back to the 2D projection.
async function createView(container) {
  try {
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no webgl");
    const { Maze3D } = await import("./maze-3d.js");
    return new Maze3D(container);
  } catch {
    const canvas = document.createElement("canvas");
    canvas.width = 880;
    canvas.height = 640;
    canvas.className = "fallback-2d";
    container.append(canvas);
    document.body.dataset.renderer = "2d";
    return new MazeView(canvas);
  }
}

function drawPreview() {
  const n = today.maze.length;
  mazeView.update(today.maze, [
    { id: "preview-a", slot: 0, x: 1, y: 1, look: picker.look() },
    { id: "preview-b", slot: 1, x: n - 2, y: n - 2 },
  ], { gates: today.gates, switches: today.switches, switchOn: today.switches.map(() => false) });
}

async function initialize() {
  mazeView = await createView($("maze"));
  setupViews(mazeView, () => audio.play("camera"));
  if (mazeView.setView) {
    try { preview = new (await import("./maze-3d.js")).AvatarPreview($("avatar-preview")); }
    catch { $("avatar-preview").hidden = true; }
  } else $("avatar-preview").hidden = true;
  picker = setupAvatarPicker(preview);
  // The maze preview shows the chosen avatar at entrance A until a race begins.
  picker.onChange?.(() => { if (inLobby && today) drawPreview(); });
  document.body.dataset.step = "name";
  today = await request("/api/maze/today");
  const n = today.maze.length;
  $("maze-date").textContent = `MAZE OF ${today.mazeId}`;
  $("board-size").textContent = `${n} × ${n} · SHARED GROUND`;
  drawPreview();
  $("best").hidden = today.best.length === 0;
  $("best-list").replaceChildren(...today.best.map((entry) => {
    const item = document.createElement("li"), link = document.createElement("a"), time = document.createElement("span");
    link.href = `/race/${entry.matchId}/replay`;
    link.append(entry.name);
    time.textContent = formatTime(entry.timeMs);
    link.append(time);
    item.append(link);
    return item;
  }));
  if (watchToken) {
    // Spectators need no nickname: they only watch.
    leaveLobby();
    inLobby = false;
    return mountSpectator(watchToken, mazeView, showError);
  }
  if (replayId || invitationId) {
    try { actor = await request("/api/me"); }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  }
  if (replayId) {
    if (!actor) {
      $("entry-eyebrow").textContent = "REPLAY";
      $("entry-title").textContent = "Choose a nickname to watch.";
      $("entry-copy").textContent = "Then the replay starts straight away.";
      $("name-next").querySelector("span").textContent = "Watch the replay";
      showPane("name", { focus: false });
      mazeView.autoRotate = true;
      return;
    }
    leaveLobby();
    inLobby = false;
    return mountReplay(await request(`/api/maze/matches/${replayId}/replay`), mazeView);
  }
  if (invitationId) {
    if (actor) {
      // Already seated (the creator after reload, or a refresh): straight to the waiting room.
      let seated = true;
      try { await request(`/api/maze/matches/${invitationId}`); } catch { seated = false; }
      if (seated) return void (await enter(invitationId));
      $("entry").hidden = true;
      return void (await go(invitationId));
    }
    $("entry-eyebrow").textContent = "YOU’VE BEEN CHALLENGED";
    $("entry-title").textContent = "Your rival awaits.";
    $("entry-copy").textContent = "Pick a nickname, then choose how you look.";
    $("name-next").querySelector("span").textContent = "Pick your look";
    showPane("name", { focus: false });
    mazeView.autoRotate = true;
    return;
  }
  try { actor = await request("/api/me"); }
  catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  mazeView.autoRotate = true;
  $("avatar-open").hidden = true;
  if (actor) {
    showIdentity();
    showPane("choose", { focus: false });
    await recentRaces(); await showStats();
  } else showPane("name", { focus: false });
}

initialize().catch(showError);

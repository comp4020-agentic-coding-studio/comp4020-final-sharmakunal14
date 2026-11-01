import { ApiError, raceId, request } from "./maze-api.js";
import { MazeView } from "./maze-render.js";
import { setupViews } from "./maze-views.js";
import { mountRace } from "./maze-race.js";
import { mountReplay } from "./maze-replay.js";
import { setupAudio } from "./maze-audio-ui.js";

export const formatTime = (ms) => `${Math.floor(ms / 60_000).toString().padStart(2, "0")}:${((ms % 60_000) / 1_000).toFixed(1).padStart(4, "0")}`;

const $ = (id) => document.getElementById(id);
const replayId = /^\/race\/([a-f0-9-]{36})\/replay\/?$/.exec(location.pathname)?.[1] ?? null;
const invitationId = replayId ? null : raceId(location.href);
let actor = null;
let mazeView;
const audio = setupAudio();

function showError(error) {
  $("error").textContent = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  $("error").hidden = false;
}

async function recentRaces() {
  if (!actor || invitationId) return;
  const { matches } = await request("/api/maze/matches");
  $("recent").hidden = matches.length === 0;
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
  const view = await request(`/api/maze/matches/${id}/join`, {});
  $("entry").hidden = true;
  $("recent").hidden = true;
  mountRace(view, mazeView, showError, audio);
}

function showIdentity() {
  $("name-label").hidden = Boolean(actor);
  $("nickname").required = !actor;
  $("identity").hidden = !actor;
  if (actor) $("identity").textContent = `Racing as ${actor.name}`;
}

$("entry-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const joining = Boolean(invitationId) || event.submitter?.value === "join";
  const id = invitationId ?? (joining ? raceId($("invite").value) : null);
  if (joining && !id) {
    showError(new Error("Paste the full invitation link from a race on this site."));
    $("invite").focus();
    return;
  }
  $("entry-fields").disabled = true;
  $("error").hidden = true;
  try {
    if (!actor) {
      actor = await request("/api/session", { name: $("nickname").value.trim() });
      showIdentity();
    }
    if (invitationId) await enter(invitationId);
    else {
      const view = await request(id ? `/api/maze/matches/${id}/join` : "/api/maze/matches", {});
      location.assign(`/race/${view.game.id}`);
    }
  } catch (error) {
    showError(error);
    try { await recentRaces(); } catch { /* Preserve the original actionable error. */ }
  } finally { $("entry-fields").disabled = false; }
});

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

async function initialize() {
  mazeView = await createView($("maze"));
  setupViews(mazeView, () => audio.play("camera"));
  const today = await request("/api/maze/today");
  const n = today.maze.length;
  $("maze-date").textContent = `MAZE OF ${today.mazeId}`;
  $("board-size").textContent = `${n} × ${n} · SHARED GROUND`;
  mazeView.update(today.maze, [
    { id: "preview-a", slot: 0, x: 1, y: 1 },
    { id: "preview-b", slot: 1, x: n - 2, y: n - 2 },
  ], { gates: today.gates, switches: today.switches, switchOn: today.switches.map(() => false) });
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
  if (replayId) {
    try { actor = await request("/api/me"); }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
    if (!actor) {
      $("entry-eyebrow").textContent = "REPLAY";
      $("entry-title").textContent = "Choose a nickname to watch.";
      $("create-race").textContent = "Watch the replay";
      $("join-divider").hidden = true;
      $("invite-label").hidden = true;
      $("join-race").hidden = true;
      $("entry-fields").disabled = false;
      $("entry-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          actor = await request("/api/session", { name: $("nickname").value.trim() });
          location.reload();
        } catch (error) { showError(error); }
      }, { capture: true });
      return;
    }
    $("entry").hidden = true;
    $("recent").hidden = true;
    return mountReplay(await request(`/api/maze/matches/${replayId}/replay`), mazeView);
  }
  if (invitationId) {
    $("entry-eyebrow").textContent = "YOU’VE BEEN CHALLENGED";
    $("entry-title").textContent = "Your rival awaits.";
    $("entry-copy").textContent = "Choose a nickname and join the other side of the maze.";
    $("create-race").hidden = true;
    $("join-divider").hidden = true;
    $("invite-label").hidden = true;
  }
  try { actor = await request("/api/me"); }
  catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  showIdentity();
  $("entry-fields").disabled = false;
  if (invitationId && actor) await enter(invitationId);
  else await recentRaces();
}

initialize().catch(showError);

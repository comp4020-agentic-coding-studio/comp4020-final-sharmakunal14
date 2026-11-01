import { ApiError, raceId, request } from "./maze-api.js";
import { MazeView } from "./maze-render.js";
import { mountRace } from "./maze-race.js";

const $ = (id) => document.getElementById(id);
const invitationId = raceId(location.href);
let actor = null;
let mazeView;

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
    status.textContent = game.status;
    link.append(status);
    item.append(link);
    return item;
  }));
}

async function enter(id) {
  const view = await request(`/api/maze/matches/${id}/join`, {});
  $("entry").hidden = true;
  $("recent").hidden = true;
  mountRace(view, mazeView, showError);
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

async function initialize() {
  mazeView = new MazeView($("maze"));
  const { maze } = await request("/api/maze/layout");
  mazeView.update(maze, [
    { id: "preview-a", slot: 0, x: 1, y: 1 },
    { id: "preview-b", slot: 1, x: 11, y: 11 },
  ]);
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

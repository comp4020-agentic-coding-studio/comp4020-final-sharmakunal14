import { request } from "./maze-api.js";
import { celebrate } from "./maze-celebrate.js";
import { lookOf } from "./maze-look.js";

const $ = (id) => document.getElementById(id);
const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
const clock = (ms) => `${Math.floor(ms / 60_000).toString().padStart(2, "0")}:${((ms % 60_000) / 1_000).toFixed(1).padStart(4, "0")}`;

// Read-only view of a race. A spectator has no identity and no controls: they
// choose the camera (map, or first/third person of either player) and nothing
// they do reaches the server.
export function mountSpectator(token, mazeView, showError) {
  let game = null, serverAt = 0, observedAt = performance.now(), connected = false, watching = 0, follow = 0, done = false;
  document.body.dataset.inRace = "true";
  document.body.dataset.mode = "spectator";
  $("spectator-panel").hidden = false;
  $("spectator-panel").querySelector("a[href='/']")?.removeAttribute("hidden");

  const buttons = [...document.querySelectorAll("[data-follow]")];
  for (const button of buttons) button.addEventListener("click", () => { follow = Number(button.dataset.follow); focus(); render(); });

  function focus() {
    const player = game?.players.find((p) => p.slot === follow);
    mazeView.setFocus?.(player?.id ?? null);
  }

  function render() {
    if (!game) return;
    document.body.dataset.phase = game.status;
    const now = serverAt + performance.now() - observedAt;
    const names = game.players.map((p) => p.name);
    const [a, b] = [game.players.find((p) => p.slot === 0), game.players.find((p) => p.slot === 1)];
    if (following) text("spec-title", "Rematch! Following them to the next race…");
    else text("spec-title", {
      waiting: b ? "Waiting for both players to be ready." : "Waiting for a rival to join.",
      countdown: "Here we go.",
      racing: "The race is on.",
      finished: `${game.players.find((p) => p.id === game.winnerId)?.name ?? "Someone"} won.`,
      interrupted: game.interruption === "forfeit" ? "The race was cancelled." : "This race ended without a winner.",
    }[game.status]);
    text("spec-players", names.length ? names.map((n, i) => `${i === 0 ? "A" : "B"}: ${n}`).join(" · ") : "");
    text("spec-watching", `${watching} watching`);
    text("connection", connected ? "● Watching live" : "Reconnecting…");
    $("connection").dataset.state = connected ? "live" : "offline";
    for (const button of buttons) {
      const p = game.players.find((q) => q.slot === Number(button.dataset.follow));
      button.hidden = !p;
      button.setAttribute("aria-pressed", String(Number(button.dataset.follow) === follow));
      if (p) button.querySelector("span").textContent = p.name;
    }
    text("legend-a", a ? `${a.name} → B` : "Waiting for a player");
    text("legend-b", b ? `${b.name} → A` : "Waiting for a player");
    $("race-clock").hidden = game.startsAt === null || game.status === "interrupted";
    $("countdown").hidden = game.status !== "countdown";
    if (game.status === "countdown") text("countdown-number", String(Math.max(1, Math.ceil((game.startsAt - now) / 1_000))));
    const elapsed = game.startsAt === null ? 0 : Math.max(0, (game.finishedAt ?? now) - game.startsAt);
    text("elapsed", clock(elapsed));
    text("board-note", game.status === "racing" ? "WATCHING · choose a camera" : "Drag to orbit · scroll to zoom");
    $("maze").setAttribute("aria-label", `Live maze, watched by spectators. ${names.join(" versus ")}.`);
    focus();
    mazeView.update(game.maze, game.players.map((p) => ({ ...p, mine: false })), {
      gates: game.gates, switches: game.switches, switchOn: game.switchOn,
      pulses: game.pulses, rifts: game.rifts, startsAt: game.startsAt, now,
    });
  }

  function apply(view, announce) {
    // A rematch is a different race whose revision restarts at 1.
    if (game && view.game.id === game.id && view.game.revision < game.revision) return;
    const before = game;
    game = view.game;
    serverAt = view.serverNow; observedAt = performance.now();
    watching = view.watching ?? watching;
    if (announce && before && before.status !== "finished" && game.status === "finished" && !done) {
      done = true;
      const winner = game.players.find((p) => p.id === game.winnerId);
      if (winner) celebrate(document.querySelector(".stage"), { mode: "watch", name: winner.name, hue: lookOf(winner).hue });
    }
    render();
    // The players started a rematch: the same link now leads to the new race.
    if (game.rematched && !following) followRematch();
  }

  let source = null, first = true, following = false;
  function open() {
    source?.close();
    source = new EventSource(`/api/maze/watch/${token}/stream`);
    first = true;
    source.addEventListener("state", (event) => {
      const announce = connected && !first;
      connected = true;
      apply(JSON.parse(event.data), announce);
      first = false;
    });
    source.onerror = () => { connected = false; render(); };
  }
  function followRematch() {
    following = true;
    text("announcement", "Rematch! Following the players to their next race.");
    // A short pause lets the result be seen before switching.
    setTimeout(() => { done = false; following = false; open(); }, 2_500);
  }
  open();
  const timer = setInterval(render, 100);
  window.addEventListener("pagehide", () => { source.close(); clearInterval(timer); }, { once: true });
  request(`/api/maze/watch/${token}`).then((view) => { if (!game) apply(view, false); }).catch(showError);
}

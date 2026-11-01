import { ApiError, request } from "./maze-api.js";
import { setupControls } from "./maze-controls.js";

const $ = (id) => document.getElementById(id);
const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };

export function mountRace(initial, mazeView, showError) {
  let game = initial.game, connected = false, online = [], busy = false;
  let serverAt = initial.serverNow, observedAt = performance.now();
  const me = initial.me, path = `/api/maze/matches/${game.id}`;
  const self = () => game.players.find((player) => player.id === me);
  const canMove = () => connected && game.status === "racing" && !document.hidden;
  document.body.dataset.inRace = "true";
  $("race-panel").hidden = false;
  $("race-code").textContent = game.id.slice(0, 8).toUpperCase();
  $("race-link").value = `${location.origin}/race/${game.id}`;

  function renderClock() {
    const now = serverAt + performance.now() - observedAt;
    if (game.status === "countdown") text("countdown-number", String(Math.max(1, Math.ceil((game.startsAt - now) / 1_000))));
    const elapsed = game.startsAt === null ? 0 : Math.max(0, (game.finishedAt ?? now) - game.startsAt);
    const minutes = Math.floor(elapsed / 60_000).toString().padStart(2, "0");
    const seconds = ((elapsed % 60_000) / 1_000).toFixed(1).padStart(4, "0");
    text("elapsed", `${minutes}:${seconds}`);
  }

  function render() {
    const player = self(), opponent = game.players.find((p) => p.id !== me);
    const goal = player.slot === 0 ? "B" : "A";
    const done = game.status === "finished" || game.status === "interrupted";
    let title, description;
    if (game.status === "waiting") {
      title = !opponent ? "Waiting for a rival." : player.ready ? "You’re ready." : "Ready when you are.";
      description = !opponent ? "Share your link to fill the second spot." : player.ready ? "The countdown begins when your opponent is ready too." : "Both players must be ready. Then you get a three-second countdown.";
    } else if (game.status === "countdown") {
      title = "Here we go.";
      description = `You are ${player.slot === 0 ? "A" : "B"}. Race to entrance ${goal} when the countdown ends.`;
    } else if (game.status === "racing") {
      title = `Find entrance ${goal}.`;
      description = opponent && online.includes(opponent.id) ? `${opponent.name} is racing to the other side. Keep moving.` : "Your opponent is disconnected. The race clock continues.";
    } else if (game.status === "finished") {
      title = game.winnerId === me ? "You made it first." : `${game.players.find((p) => p.id === game.winnerId).name} wins.`;
      description = "Race complete. The result is saved, so you can return to this link later.";
    } else {
      title = game.interruption === "time_limit" ? "Time’s up." : "Race interrupted.";
      description = game.interruption === "time_limit" ? "This race reached the ten-minute limit. No winner was awarded." : "The server restarted during the race. Your last positions are saved; no winner was awarded.";
    }
    text("race-title", title);
    text("race-description", description);
    text("connection", connected ? "● Live together" : "Reconnecting…");
    $("connection").dataset.state = connected ? "live" : "offline";
    for (const slot of [0, 1]) {
      const p = game.players.find((member) => member.slot === slot), label = slot === 0 ? "a" : "b";
      text(`player-${label}-name`, p ? `${p.name}${p.id === me ? " (you)" : ""}` : "Open spot");
      text(`player-${label}-status`, !p ? "Invite a friend" : online.includes(p.id) ? "Connected" : "Disconnected");
      text(`player-${label}-ready`, p?.ready && game.status === "waiting" ? "READY" : "");
      text(`legend-${label}`, p ? `${p.id === me ? "You" : p.name} → ${slot === 0 ? "B" : "A"}` : "Waiting for a rival");
    }
    $("invitation").hidden = Boolean(opponent);
    $("ready").hidden = game.status !== "waiting";
    $("ready").disabled = busy || !connected || player.ready;
    text("ready", player.ready ? "Ready ✓" : "I’m ready ✓");
    $("movement").hidden = game.status !== "racing";
    for (const button of document.querySelectorAll("[data-direction]")) button.disabled = !canMove();
    $("another-race").hidden = !done;
    $("race-clock").hidden = game.startsAt === null || game.status === "interrupted";
    $("countdown").hidden = game.status !== "countdown";
    text("your-goal", `You are ${player.slot === 0 ? "A" : "B"} · reach entrance ${goal}`);
    text("position", `Your position: row ${player.y}, column ${player.x}`);
    text("board-note", done ? "RACE RECORDED" : game.status === "racing" ? "THE RACE IS ON" : "One maze. Equal distance.");
    $("maze").setAttribute("aria-label", `Maze. You are player ${player.slot === 0 ? "A" : "B"}, row ${player.y}, column ${player.x}. Your goal is entrance ${goal}. Use the directional controls to move.`);
    mazeView.update(game.maze, game.players.map((p) => ({ ...p, mine: p.id === me })));
    renderClock();
  }

  function apply(view) {
    if (view.game.revision < game.revision) return;
    game = view.game;
    serverAt = view.serverNow;
    observedAt = performance.now();
    if (view.online) online = view.online;
    render();
  }

  const stopControls = setupControls(canMove, async (direction) => {
    try {
      apply(await request(`${path}/move`, { direction, sequence: self().sequence + 1 }));
      $("error").hidden = true;
    } catch (error) {
      if (error instanceof ApiError && error.code === "WALL") { text("announcement", "There is a wall in that direction."); return; }
      if (error instanceof ApiError && error.code === "TOO_FAST") return;
      stopControls();
      try { apply(await request(path)); }
      catch { connected = false; render(); }
      showError(error);
    }
  });

  $("ready").addEventListener("click", async () => {
    busy = true;
    $("error").hidden = true;
    render();
    try { apply(await request(`${path}/ready`, {})); }
    catch (error) { showError(error); }
    finally { busy = false; render(); }
  });
  $("copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("race-link").value);
      text("copy-status", "Copied. Send this link to your friend.");
    } catch {
      $("race-link").focus();
      $("race-link").select();
      text("copy-status", "Select and copy the invitation link above.");
    }
  });
  $("another-race").addEventListener("click", async () => {
    $("another-race").disabled = true;
    try {
      const next = await request("/api/maze/matches", {});
      location.assign(`/race/${next.game.id}`);
    } catch (error) { showError(error); $("another-race").disabled = false; }
  });

  const source = new EventSource(`${path}/stream`);
  source.addEventListener("state", (event) => { connected = true; apply(JSON.parse(event.data)); });
  source.onerror = () => { connected = false; online = []; stopControls(); render(); };
  const clock = setInterval(renderClock, 100);
  window.addEventListener("pagehide", () => { source.close(); clearInterval(clock); stopControls(); }, { once: true });
  window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
  render();
}

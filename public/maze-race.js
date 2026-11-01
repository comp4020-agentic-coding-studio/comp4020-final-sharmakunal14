import { ApiError, request } from "./maze-api.js";
import { createSender, setupControls } from "./maze-controls.js";
import { DIRECTIONS, passable, switchAt } from "./maze-rules.js";
import { raceCues } from "./maze-audio-events.js";

const $ = (id) => document.getElementById(id);
const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };

export function mountRace(initial, mazeView, showError, audio) {
  let game = initial.game, connected = false, online = [], busy = false;
  let serverAt = initial.serverNow, observedAt = performance.now();
  let countdownSecond = null;
  const me = initial.me, path = `/api/maze/matches/${game.id}`;
  const confirmed = () => game.players.find((player) => player.id === me);
  // The player as drawn: the server position plus unconfirmed predicted steps.
  function predicted() {
    let p = { ...confirmed() }, board = game;
    for (const action of sender.unconfirmed) {
      if (action === "flip") {
        const index = switchAt(board, p.x, p.y);
        if (index >= 0) board = { ...board, switchOn: board.switchOn.map((on, i) => i === index ? !on : on) };
        continue;
      }
      const [dx, dy] = DIRECTIONS[action];
      if (passable(board, p.x + dx, p.y + dy)) p = { ...p, x: p.x + dx, y: p.y + dy };
    }
    return { player: p, board };
  }
  const self = () => predicted().player;
  const canMove = () => connected && game.status === "racing" && !document.hidden;
  window.addEventListener("blur", () => sender.clear());
  document.body.dataset.inRace = "true";
  $("race-panel").hidden = false;
  $("race-code").textContent = game.id.slice(0, 8).toUpperCase();
  $("race-link").value = `${location.origin}/race/${game.id}`;

  function renderClock() {
    const now = serverAt + performance.now() - observedAt;
    if (game.status === "countdown") {
      const second = Math.max(1, Math.ceil((game.startsAt - now) / 1_000));
      text("countdown-number", String(second));
      if (connected && second !== countdownSecond && now < game.startsAt) audio.play("tick");
      countdownSecond = second;
    } else countdownSecond = null;
    const elapsed = game.startsAt === null ? 0 : Math.max(0, (game.finishedAt ?? now) - game.startsAt);
    const minutes = Math.floor(elapsed / 60_000).toString().padStart(2, "0");
    const seconds = ((elapsed % 60_000) / 1_000).toFixed(1).padStart(4, "0");
    text("elapsed", `${minutes}:${seconds}`);
  }

  function render() {
    if (document.body.dataset.phase !== game.status && game.status === "countdown" && matchMedia("(max-width: 700px)").matches) {
      document.querySelector(".stage")?.scrollIntoView({ block: "start" });
    }
    document.body.dataset.phase = game.status;
    audio.setRacing(connected && game.status === "racing");
    const player = self(), opponent = game.players.find((p) => p.id !== me);
    const goal = player.slot === 0 ? "B" : "A";
    const view = predicted();
    const onSwitch = game.status === "racing" && switchAt(view.board, view.player.x, view.player.y) >= 0;
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
    $("watch-replay").hidden = !done;
    $("watch-replay").href = `/race/${game.id}/replay`;
    $("race-clock").hidden = game.startsAt === null || game.status === "interrupted";
    $("countdown").hidden = game.status !== "countdown";
    text("your-goal", `You are ${player.slot === 0 ? "A" : "B"} · reach entrance ${goal}`);
    text("position", `Your position: row ${player.y}, column ${player.x}`);
    text("board-note", done ? "RACE RECORDED" : game.status === "racing" ? "THE RACE IS ON · V switches camera" : "Drag to orbit · scroll to zoom");
    $("maze").setAttribute("aria-label", `Maze. You are player ${player.slot === 0 ? "A" : "B"}, row ${player.y}, column ${player.x}. Your goal is entrance ${goal}. Use the directional controls to move.`);
    $("flip").hidden = !onSwitch;
    $("flip").disabled = !canMove();
    text("switch-hint", onSwitch ? "You’re on a switch. Press E or Space to flip it — it changes gates for both of you." : "");
    mazeView.update(game.maze, game.players.map((p) => p.id === me ? { ...view.player, mine: true } : { ...p, mine: false }), view.board);
    renderClock();
  }

  function apply(view, audible = connected) {
    if (view.game.revision < game.revision) return;
    if (audible) for (const cue of raceCues(game, view.game, me)) audio.play(cue);
    // A reconnect establishes current state, not an opportunity to replay the
    // result, flips or countdown seconds missed while offline.
    if (!audible && view.game.status === "countdown") {
      countdownSecond = Math.max(1, Math.ceil((view.game.startsAt - view.serverNow) / 1_000));
    }
    game = view.game;
    sender.settle(confirmed().sequence);
    serverAt = view.serverNow;
    observedAt = performance.now();
    if (view.online) online = view.online;
    render();
  }

  const sender = createSender(async (actions, sequence) => {
    try {
      const view = await request(`${path}/move`, { actions, sequence });
      apply(view);
      $("error").hidden = true;
      return confirmed().sequence;
    } catch (error) {
      if (error instanceof ApiError && error.body?.game) {
        apply(error.body);
        const notice = { WALL: error.message, NO_SWITCH: error.message, SWITCH_COOLDOWN: error.message, GATE_OCCUPIED: error.message }[error.code];
        if (notice) { text("announcement", notice); audio.play("bump"); }
        else if (error.code !== "TOO_FAST") showError(error);
        render();
        return confirmed().sequence;
      }
      stopControls();
      try { apply(await request(path)); }
      catch { connected = false; render(); }
      showError(error);
      return null;
    }
  });

  // Predict locally: refuse what the saved layout already refuses, so a held
  // key against a wall never queues phantom steps.
  const stopControls = setupControls(canMove, (input) => {
    const { player, board } = predicted();
    // In 1st/3rd person, forward walks the way the avatar faces and the other
    // directions only turn it. Facing is presentation; the server owns position.
    let action = input;
    if (input !== "flip" && mazeView.view && mazeView.view !== "overview") {
      if (input !== "up") { mazeView.turn(input); audio.play("turn"); return; }
      action = mazeView.facing();
    }
    if (action === "flip") {
      if (switchAt(board, player.x, player.y) < 0) { audio.play("bump"); return false; }
    } else {
      const [dx, dy] = DIRECTIONS[action];
      if (!passable(board, player.x + dx, player.y + dy)) { text("announcement", "There is a wall in that direction."); audio.play("bump"); return false; }
    }
    if (sender.unconfirmed.length >= 8) return false;
    sender.push(action);
    if (action !== "flip") audio.play("step");
    render();
  }, initial.moveInterval ?? 140);

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
  source.addEventListener("state", (event) => {
    const audible = connected;
    connected = true;
    apply(JSON.parse(event.data), audible);
  });
  source.onerror = () => { connected = false; online = []; stopControls(); sender.clear(); render(); };
  const clock = setInterval(renderClock, 100);
  window.addEventListener("pagehide", () => { source.close(); clearInterval(clock); stopControls(); }, { once: true });
  window.addEventListener("pageshow", (event) => { if (event.persisted) location.reload(); });
  render();
}

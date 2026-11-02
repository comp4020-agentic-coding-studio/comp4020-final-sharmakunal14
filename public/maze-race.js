import { ApiError, request } from "./maze-api.js";
import { createSender, setupControls } from "./maze-controls.js";
import { DIRECTIONS, goalOf, passable, switchAt } from "./maze-rules.js";
import { raceCues } from "./maze-audio-events.js";
import { setupChat } from "./maze-chat.js";
import { celebrate } from "./maze-celebrate.js";
import { lookOf } from "./maze-look.js";

const $ = (id) => document.getElementById(id);
const clock = (ms) => `${Math.floor(ms / 60_000).toString().padStart(2, "0")}:${((ms % 60_000) / 1_000).toFixed(1).padStart(4, "0")}`;
const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };

export function mountRace(initial, mazeView, showError, audio) {
  let game = initial.game, connected = false, online = [], busy = false;
  let serverAt = initial.serverNow, observedAt = performance.now();
  let countdownSecond = null, rematching = false, resultShown = false;
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
  const chat = setupChat({
    send: (body) => request(`${path}/chat`, body).then(apply),
    audio,
  });
  let celebration = null, lookSynced = false;
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
    const done = game.status === "finished" || game.status === "interrupted";
    if (document.body.dataset.phase !== game.status && game.status === "countdown" && matchMedia("(max-width: 700px)").matches) {
      document.querySelector(".stage")?.scrollIntoView({ block: "start" });
    }
    if (document.body.dataset.phase !== game.status && game.status === "countdown") {
      // The race opens in the player's own point of view, full screen.
      document.querySelector('[data-view="first"]')?.click();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    }
    if (done && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // The designer is only for the waiting room; the server locks looks after that.
    $("avatar-open").hidden = game.status !== "waiting";
    if (game.status !== "waiting" && $("avatar-card").open) $("avatar-card").close();
    // Show what the server saved for this seat once; after that the picker leads.
    if (!lookSynced) {
      lookSynced = true;
      document.dispatchEvent(new window.CustomEvent("maze:sync-look", { detail: lookOf(confirmed()) }));
    }
    chat.update(game, me, (message) => text("announcement", message));
    document.body.dataset.phase = game.status;
    // The tune follows the game: waiting room, countdown, race. A result stops it for the jingle.
    audio.setScene(!connected ? "off" : { waiting: "waiting", countdown: "countdown", racing: "race" }[game.status] ?? "off");
    const player = self(), opponent = game.players.find((p) => p.id !== me);
    const goal = player.slot === 0 ? "B" : "A";
    const view = predicted();
    const onSwitch = game.status === "racing" && switchAt(view.board, view.player.x, view.player.y) >= 0;
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
      const left = game.interruption === "forfeit" ? game.players.find((p) => p.id === game.forfeitedBy) : null;
      if (left) title = left.id === me ? "You left the race." : `${left.name} left the race.`;
      description = left ? "The race was cancelled. Nobody wins and no time is recorded."
        : game.interruption === "time_limit" ? "This race reached the ten-minute limit. No winner was awarded." : "The server restarted during the race. Your last positions are saved; no winner was awarded.";
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
    // Sharing the watch link makes sense before the race starts, and stays handy after.
    $("spectate-box").hidden = game.status === "racing" || done;
    $("ready").hidden = game.status !== "waiting";
    $("ready").disabled = busy || !connected || player.ready;
    text("ready", player.ready ? "Ready ✓" : "I’m ready ✓");
    $("movement").hidden = game.status !== "racing";
    for (const button of document.querySelectorAll("[data-direction]")) button.disabled = !canMove();
    $("another-race").hidden = !done;
    $("rematch").hidden = !done || game.players.length < 2;
    $("rematch").disabled = rematching;
    // The other player is told with a card that slides in; the first asker is not.
    const asked = done && game.rematchId && game.rematchBy && game.rematchBy !== me;
    if (asked) showRematch(opponent?.name ?? "Your rival", game.rematchId);
    else if (!done || !game.rematchId) hideRematch();
    text("rematch-note", done && game.rematchId && game.rematchBy === me ? "Rematch sent. Waiting for your rival…" : "");
    $("copy-replay").hidden = game.status !== "finished";
    if (game.status === "finished") showResult();
    $("watch-replay").hidden = !done;
    $("watch-replay").href = `/race/${game.id}/replay`;
    $("race-clock").hidden = game.startsAt === null || game.status === "interrupted";
    $("countdown").hidden = game.status !== "countdown";
    text("your-goal", `You are ${player.slot === 0 ? "A" : "B"} · reach entrance ${goal}`);
    text("board-note", done ? "RACE RECORDED" : game.status === "racing" ? "THE RACE IS ON · V switches camera" : "Drag to orbit · scroll to zoom");
    $("maze").setAttribute("aria-label", `Maze. You are player ${player.slot === 0 ? "A" : "B"}, row ${player.y}, column ${player.x}. Your goal is entrance ${goal}. Use the directional controls to move.`);
    $("flip").hidden = !onSwitch;
    $("flip").disabled = !canMove();
    text("switch-hint", onSwitch ? "You’re on a switch. Press E or Space to flip it — it changes gates for both of you." : "");
    mazeView.update(game.maze, game.players.map((p) => p.id === me ? { ...view.player, mine: true } : { ...p, mine: false }), view.board);
    renderClock();
  }

  // Summary of a finished race, from the saved step log rather than client state.
  async function showResult() {
    if (resultShown) return;
    resultShown = true;
    try {
      const { steps } = await request(`${path}/replay`);
      const winner = game.players.find((p) => p.id === game.winnerId);
      const lines = game.players.map((p) => {
        const mine = steps.filter((s) => s.slot === p.slot);
        return `${p.id === me ? "You" : p.name}: ${mine.filter((s) => s.kind === "step").length} steps, ${mine.filter((s) => s.kind === "flip").length} flips`;
      });
      const ms = game.finishedAt - game.startsAt;
      const time = `${Math.floor(ms / 60_000).toString().padStart(2, "0")}:${((ms % 60_000) / 1_000).toFixed(1).padStart(4, "0")}`;
      text("result-card", `${winner.id === me ? "You" : winner.name} won in ${time} · ${lines.join(" · ")}`);
      $("result-card").hidden = false;
    } catch { resultShown = false; }
  }

  let toastFor = null, toastDismissed = null;
  function showRematch(name, id) {
    if (toastDismissed === id) return;
    if (toastFor !== id) { toastFor = id; audio.play("join"); text("announcement", `${name} wants a rematch.`); }
    text("toast-title", `${name} wants a rematch`);
    text("toast-body", "Tap to jump straight into the next race.");
    $("rematch-toast").hidden = false;
    requestAnimationFrame(() => $("rematch-toast").classList.add("in"));
  }
  function hideRematch() {
    $("rematch-toast").classList.remove("in");
    $("rematch-toast").hidden = true;
    toastFor = null;
  }
  $("toast-join").addEventListener("click", () => { $("rematch").click(); });
  $("toast-close").addEventListener("click", () => { toastDismissed = toastFor; hideRematch(); });

  // After a win, show whether it is a new personal best and the streak.
  async function noteResult(id) {
    try {
      const stats = await request(`/api/maze/stats?match=${id}`);
      const r = stats.result;
      const parts = [];
      if (r) parts.push(r.newBest ? (r.previousBest === null ? "First win on today's maze!" : "★ New personal best!") : `Personal best: ${clock(r.previousBest)}`);
      if (stats.streak > 0) parts.push(`${stats.streak}-day streak 🔥`);
      const line = parts.join(" · ");
      celebration?.setNote?.(line);
      if (line) text("stats-line", line);
      $("stats-line").hidden = !line;
    } catch { /* a bonus line; the result stands without it */ }
  }

  function apply(view, audible = connected) {
    if (view.game.revision < game.revision) return;
    if (audible) for (const cue of raceCues(game, view.game, me)) audio.play(cue);
    // A result seen live gets a screen for each side; one found by reloading does not replay it.
    if (audible && game.status !== "finished" && view.game.status === "finished" && view.game.winnerId && !celebration) {
      const won = view.game.winnerId === me, winner = view.game.players.find((p) => p.id === view.game.winnerId);
      celebration = celebrate(document.querySelector(".stage"), {
        mode: won ? "win" : "lose", name: winner.name, hue: lookOf(view.game.players.find((p) => p.id === me)).hue,
      });
      noteResult(view.game.id);
    }
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
  const act = (input) => {
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
    if (action !== "flip") {
      audio.play("step");
      // Stepping onto the opposite portal gets its own whoosh before the result.
      const [sx, sy] = DIRECTIONS[action], goal = goalOf(board, player.slot);
      if (player.x + sx === goal.x && player.y + sy === goal.y) audio.play("portal");
    }
    render();
  };
  const stopControls = setupControls(canMove, act, initial.moveInterval ?? 140);

  // Swipe on the view to turn in 1st/3rd person; the map keeps drag-to-orbit.
  const stage = document.querySelector(".stage");
  let swipe = null;
  stage.addEventListener("pointerdown", (event) => {
    swipe = event.pointerType === "touch" && !event.target.closest("button, dialog") ? { x: event.clientX, y: event.clientY } : null;
  });
  stage.addEventListener("pointerup", (event) => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    swipe = null;
    if (!canMove() || mazeView.view === "overview" || !mazeView.turn) return;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) act(dx > 0 ? "right" : "left");
    else if (dy > 60 && dy > Math.abs(dx) * 1.5) act("down");
  });
  stage.addEventListener("pointercancel", () => { swipe = null; });

  // Interface buttons share one click sound; movement and flip have their own.
  const onUiClick = (event) => {
    const button = event.target.closest?.("button");
    if (button && !button.disabled && !button.matches("[data-direction]")) audio.play("click");
  };
  document.querySelector(".panel-col")?.addEventListener("click", onUiClick);

  const leave = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    location.assign("/");
  };
  // Leaving a started race cancels it for both players, so ask first.
  $("exit-game").addEventListener("click", () => {
    if (game.status === "countdown" || game.status === "racing") { stopControls(); sender.clear(); $("exit-dialog").showModal(); }
    else leave();
  });
  $("exit-dialog").addEventListener("close", async () => {
    if ($("exit-dialog").returnValue !== "leave") return;
    try { await request(`${path}/forfeit`, {}); } catch { /* already over: leaving is still fine */ }
    leave();
  });
  // Changing the avatar in the waiting room is saved on the server so the rival sees it.
  document.addEventListener("maze:look", async (event) => {
    if (game.status !== "waiting") return;
    try { apply(await request(`${path}/look`, { look: event.detail })); }
    catch (error) { showError(error); }
  });
  $("rematch").addEventListener("click", async () => {
    rematching = true;
    render();
    try { location.assign(`/race/${(await request(`${path}/rematch`, {})).game.id}`); }
    catch (error) { rematching = false; showError(error); render(); }
  });
  $("copy-replay").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/race/${game.id}/replay`);
      text("replay-status", "Replay link copied.");
    } catch { text("replay-status", `Replay link: ${location.origin}/race/${game.id}/replay`); }
  });
  $("ready").addEventListener("click", async () => {
    // A click is the gesture browsers need to allow full screen.
    document.documentElement.requestFullscreen?.().catch(() => {});
    busy = true;
    $("error").hidden = true;
    render();
    try { apply(await request(`${path}/ready`, {})); }
    catch (error) { showError(error); }
    finally { busy = false; render(); }
  });
  // The spectator link is a separate secret; it is created the first time it is needed.
  request(`${path}/spectate`).then(({ token }) => {
    $("spectate-link").value = `${location.origin}/watch/${token}`;
  }).catch(() => text("spectate-status", "The spectator link is not available right now."));
  $("copy-spectate").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("spectate-link").value);
      text("spectate-status", "Copied. Anyone with this link can watch, not play.");
    } catch {
      $("spectate-link").focus(); $("spectate-link").select();
      text("spectate-status", "Select and copy the spectator link above.");
    }
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

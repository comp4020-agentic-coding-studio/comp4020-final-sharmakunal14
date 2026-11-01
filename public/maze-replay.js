const $ = (id) => document.getElementById(id);
const format = (ms) => `${Math.floor(ms / 60_000).toString().padStart(2, "0")}:${((ms % 60_000) / 1_000).toFixed(1).padStart(4, "0")}`;

// Rebuilds a finished race from the server's step log: positions, explored
// cells and switch states at any moment.
export function stateAt(replay, t) {
  const { game, steps } = replay, n = game.maze.length;
  const players = game.players.map((p) => ({ ...p, x: p.slot === 0 ? 1 : n - 2, y: p.slot === 0 ? 1 : n - 2 }));
  const switchOn = game.switches.map(() => false);
  const trails = players.map((p) => ({ slot: p.slot, cells: [{ x: p.x, y: p.y }] }));
  let flips = 0;
  for (const step of steps) {
    if (step.at - game.startsAt > t) break;
    if (step.kind === "flip") { switchOn[step.switch] = step.on; flips++; continue; }
    const p = players.find((q) => q.slot === step.slot);
    p.x = step.x;
    p.y = step.y;
    const trail = trails[step.slot].cells;
    if (!trail.some((c) => c.x === step.x && c.y === step.y)) trail.push({ x: step.x, y: step.y });
  }
  return { players, switchOn, trails, flips };
}

export function mountReplay(replay, mazeView) {
  const { game, steps } = replay;
  const duration = Math.max(0, ...steps.map((s) => s.at - game.startsAt), (game.finishedAt ?? game.startsAt) - game.startsAt);
  const winner = game.players.find((p) => p.id === game.winnerId);
  document.body.dataset.inRace = "true";
  document.body.dataset.phase = "replay";
  $("replay-panel").hidden = false;
  $("connection").textContent = "Replay";
  $("legend-a").textContent = `${game.players.find((p) => p.slot === 0)?.name ?? "A"} → B`;
  $("legend-b").textContent = `${game.players.find((p) => p.slot === 1)?.name ?? "B"} → A`;
  $("board-note").textContent = "Replay · drag to orbit";
  $("replay-title").textContent = winner ? `${winner.name} won in ${format(duration)}` : "Race ended without a winner";
  $("replay-players").textContent = game.players.map((p) => `${p.slot === 0 ? "A" : "B"}: ${p.name}`).join(" · ");
  $("replay-scrub").max = String(duration);
  let t = 0, playing = true, last = performance.now(), speed = 2;

  function draw() {
    const state = stateAt(replay, t);
    mazeView.update(game.maze, state.players.map((p) => ({ ...p, mine: false })), {
      gates: game.gates, switches: game.switches, switchOn: state.switchOn, trails: state.trails,
    });
    $("replay-scrub").value = String(t);
    $("replay-time").textContent = `${format(t)} / ${format(duration)}`;
    $("replay-explored").textContent = state.trails.map((tr, i) => `${game.players.find((p) => p.slot === i)?.name ?? "?"} explored ${tr.cells.length} cells`).join(" · ") + ` · ${state.flips} switch flip${state.flips === 1 ? "" : "s"}`;
    $("replay-play").textContent = playing ? "Pause" : t >= duration ? "Replay" : "Play";
  }
  function frame(now) {
    if (playing) {
      t = Math.min(duration, t + (now - last) * speed);
      if (t >= duration) playing = false;
      draw();
    }
    last = now;
    requestAnimationFrame(frame);
  }
  $("replay-play").addEventListener("click", () => {
    if (t >= duration) t = 0;
    playing = !playing;
    draw();
  });
  $("replay-scrub").addEventListener("input", () => { t = Number($("replay-scrub").value); playing = false; draw(); });
  $("replay-speed").addEventListener("change", () => { speed = Number($("replay-speed").value); });
  draw();
  requestAnimationFrame(frame);
}

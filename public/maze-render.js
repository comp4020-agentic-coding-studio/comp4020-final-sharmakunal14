const WIDTH = 880, HEIGHT = 640;
const COLORS = ["#c7ee89", "#efb17b"];

// A fixed orthographic projection keeps the controls aligned with the maze.
// The game remains a grid; raised wall faces are presentation, not physics.
const project = (x, y, z = 0) => [88 + x * 46 + y * 8, 92 + y * 35 - z * 25];

export class MazeView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) throw new Error("Your browser could not open the maze view. Try enabling hardware graphics or using another browser.");
    this.maze = [];
    this.players = [];
    this.positions = new Map();
    this.frame = 0;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    this.resize = new ResizeObserver(() => this.draw());
    this.resize.observe(canvas);
  }

  update(maze, players) {
    this.maze = maze;
    const now = performance.now();
    for (const player of players) {
      const old = this.positions.get(player.id);
      if (!old || old.x !== player.x || old.y !== player.y) {
        this.positions.set(player.id, { x: player.x, y: player.y, fromX: old?.x ?? player.x, fromY: old?.y ?? player.y, at: now });
      }
    }
    this.players = players;
    for (const id of this.positions.keys()) if (!players.some((p) => p.id === id)) this.positions.delete(id);
    this.draw();
  }

  polygon(points, fill, stroke) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  tile(x, y, fill, height = 0) {
    const corners = [project(x, y, height), project(x + 1, y, height), project(x + 1, y + 1, height), project(x, y + 1, height)];
    if (height) {
      this.polygon([corners[1], project(x + 1, y), project(x + 1, y + 1), corners[2]], "#233423");
      this.polygon([corners[3], corners[2], project(x + 1, y + 1), project(x, y + 1)], "#293d29");
    }
    this.polygon(corners, fill, height ? "#647755" : "#2e402d");
  }

  portal(x, y, slot) {
    const ctx = this.ctx, [cx, cy] = project(x + 0.5, y + 0.5);
    ctx.save();
    ctx.shadowColor = COLORS[slot];
    ctx.shadowBlur = 18;
    ctx.strokeStyle = COLORS[slot];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 17, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  marker(player, x, y, mine) {
    const ctx = this.ctx, [cx, cy] = project(x + 0.5, y + 0.5, 0.55);
    ctx.fillStyle = "#00000060";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.slot === 0 ? "#718e46" : "#a46c43";
    ctx.beginPath();
    ctx.roundRect(cx - 11, cy - 6, 22, 18, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 12, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[player.slot];
    ctx.fill();
    ctx.strokeStyle = "#f5f3df";
    ctx.lineWidth = mine ? 2.5 : 1;
    ctx.stroke();
    ctx.fillStyle = "#152016";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.slot === 0 ? "A" : "B", cx, cy - 4);
    if (mine) {
      ctx.fillStyle = "#eff5e5";
      ctx.font = "bold 9px monospace";
      ctx.fillText("YOU", cx, cy - 28);
    }
  }

  draw() {
    cancelAnimationFrame(this.frame);
    if (!this.maze.length) return;
    const ctx = this.ctx, ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio));
    const height = Math.round(width * HEIGHT / WIDTH);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    ctx.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.shadowColor = "#050d08";
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 25;
    this.polygon([project(0, 0), project(13, 0), project(13, 13), project(0, 13)], "#182618");
    ctx.restore();
    this.polygon([project(0, 13), project(13, 13), project(13, 13, -0.45), project(0, 13, -0.45)], "#111c13");
    this.polygon([project(13, 0), project(13, 13), project(13, 13, -0.45), project(13, 0, -0.45)], "#172517");
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        this.tile(x, y, "#20311f");
      }
    }
    this.tile(1, 1, "#455d2d");
    this.tile(11, 11, "#65462e");
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        if (this.maze[y][x] === "#") this.tile(x, y, (x + y) % 3 === 0 ? "#526546" : "#4a5e40", 0.5);
      }
    }
    this.portal(1, 1, 0);
    this.portal(11, 11, 1);
    const now = performance.now();
    let animating = false;
    for (const player of this.players) {
      const p = this.positions.get(player.id);
      const amount = this.reducedMotion.matches ? 1 : Math.min(1, (now - p.at) / 110);
      animating ||= amount < 1;
      const x = p.fromX + (p.x - p.fromX) * amount, y = p.fromY + (p.y - p.fromY) * amount;
      this.marker(player, x, y, player.mine);
    }
    if (animating) this.frame = requestAnimationFrame(() => this.draw());
  }
}

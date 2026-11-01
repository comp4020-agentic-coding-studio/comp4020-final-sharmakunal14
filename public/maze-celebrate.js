// Winner celebration: fireworks and confetti on a canvas over the stage.
// Pure presentation. It starts once, stops itself after a few seconds, runs
// only while the page is visible, and is a still banner when motion is reduced.

const COLORS = ["#3dffa8", "#2fd8ff", "#ff4fd8", "#ffd34d", "#ff7a3d", "#ffffff"];
const MAX_PARTICLES = 700;

export function celebrate(stage, { hue = 152, reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches, seconds = 7 } = {}) {
  const banner = document.createElement("div");
  banner.className = "win-banner";
  banner.setAttribute("aria-hidden", "true");
  banner.innerHTML = "<strong>VICTORY</strong>";
  stage.append(banner);
  if (reducedMotion) return { stop: () => banner.remove(), banner };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // No 2D context (rare, or a blocked canvas): the banner alone still celebrates.
  if (!ctx) return { stop: () => banner.remove(), banner };
  canvas.className = "win-fx";
  canvas.setAttribute("aria-hidden", "true");
  stage.append(canvas);
  const parts = [];
  let last = performance.now(), until = last + seconds * 1000, nextBurst = last, raf = 0, stopped = false;
  const palette = [`hsl(${hue} 90% 60%)`, ...COLORS];

  function size() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(stage.clientWidth * ratio));
    canvas.height = Math.max(1, Math.floor(stage.clientHeight * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  size();
  const resizer = typeof ResizeObserver === "function" ? new ResizeObserver(size) : null;
  resizer?.observe(stage);

  function burst(x, y) {
    const color = palette[Math.floor(Math.random() * palette.length)], count = 46;
    for (let i = 0; i < count && parts.length < MAX_PARTICLES; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2, speed = 90 + Math.random() * 190;
      parts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.1 + Math.random() * 0.7, age: 0, color, size: 2 + Math.random() * 2, spark: true });
    }
  }
  function confetti() {
    for (let i = 0; i < 6 && parts.length < MAX_PARTICLES; i++) {
      parts.push({ x: Math.random() * stage.clientWidth, y: -10, vx: (Math.random() - 0.5) * 60, vy: 70 + Math.random() * 90, life: 4, age: 0,
        color: palette[Math.floor(Math.random() * palette.length)], size: 5 + Math.random() * 4, spin: Math.random() * 6, spinV: (Math.random() - 0.5) * 12 });
    }
  }

  function frame(now) {
    if (stopped) return;
    raf = window.requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (now < until - 1200) {
      confetti();
      if (now >= nextBurst) { burst(w * (0.15 + Math.random() * 0.7), h * (0.15 + Math.random() * 0.4)); nextBurst = now + 260 + Math.random() * 320; }
    }
    ctx.clearRect(0, 0, w, h);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.vy += (p.spark ? 160 : 40) * dt;
      p.vx *= p.spark ? 0.985 : 1;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const fade = Math.max(0, 1 - p.age / p.life);
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      if (p.spark) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade + 0.5, 0, Math.PI * 2); ctx.fill(); }
      else { p.spin += p.spinV * dt; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    if (now > until && parts.length === 0) stop();
  }
  raf = window.requestAnimationFrame(frame);

  function stop() {
    if (stopped) return;
    stopped = true;
    window.cancelAnimationFrame(raf);
    resizer?.disconnect();
    canvas.remove();
    banner.remove();
  }
  return { stop, banner, canvas, count: () => parts.length };
}

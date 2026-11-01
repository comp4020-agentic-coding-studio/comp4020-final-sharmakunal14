import puppeteer from "puppeteer-core";
const base = "http://localhost:8080", sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phone = process.argv[2] === "phone", tag = phone ? "phone" : "desk";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--enable-unsafe-swiftshader"] });
const size = phone ? { width: 390, height: 844, isTouch: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1440, height: 900 };
const out = {};
async function open(name) {
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport(size);
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/404|401/.test(m.text())) page.errors.push(m.text()); });
  await page.goto(base); await page.waitForSelector("#nickname"); await page.type("#nickname", name);
  return page;
}
const A = await open("Alice"), B = await open("Bob");
// Several tabs share one headless browser: only the front tab reliably receives input.
const front = async (p) => { await p.bringToFront(); await sleep(150); };
await front(A);
// Lobby avatar designer
await sleep(800);
out.pickerRendered = await A.evaluate(() => ({ groups: document.querySelectorAll("#avatar-options fieldset").length, chips: document.querySelectorAll("#avatar-options .chip-opt").length, canvas: Boolean(document.querySelector("#avatar-preview canvas")) }));
await A.evaluate(() => { for (const [n, v] of [["look-shape", "robot"], ["look-accessory", "crown"], ["look-face", "cyclops"], ["look-finish", "neon"]]) document.querySelector(`input[name="${n}"][value="${v}"]`).click(); const h = document.getElementById("avatar-hue"); h.value = "280"; h.dispatchEvent(new Event("input", { bubbles: true })); });
await sleep(400);
await A.screenshot({ path: `/tmp/driver/${tag}-lobby-avatar.png` });
await A.click("#create-race"); await A.waitForFunction(() => location.pathname.startsWith("/race/"), { timeout: 15000 }); await sleep(800);
const link = A.url();
await front(B); await B.goto(link); await B.waitForSelector("#nickname"); await B.type("#nickname", "Bob"); await sleep(1200);
await B.evaluate(() => document.querySelector('input[name="look-shape"][value="blob"]').click());
await B.click("#join-race"); await sleep(2500);
console.log("B error:", await B.evaluate(() => document.getElementById("error").textContent), B.errors);
await B.waitForSelector("#race-panel:not([hidden])", { timeout: 5000 });
await A.waitForSelector("#chat:not([hidden])", { timeout: 8000 });
await sleep(600);
out.seenByRival = await B.evaluate(async () => { const id = location.pathname.split("/").pop(); const g = (await (await fetch(`/api/maze/matches/${id}`)).json()).game; return g.players.map((p) => [p.name, p.look.shape, p.look.hue, p.look.accessory]); });
out.pickerVisibleWaiting = await A.evaluate(() => !document.getElementById("avatar-card").hidden);
// Look change while waiting reaches the server and the other page
await A.evaluate(() => document.querySelector('input[name="look-accessory"][value="halo"]').click());
await sleep(600);
out.afterChange = await B.evaluate(async () => { const id = location.pathname.split("/").pop(); return (await (await fetch(`/api/maze/matches/${id}`)).json()).game.players[0].look.accessory; });
// Chat
await front(B); await B.click("#chat-toggle"); await B.type("#chat-input", "good luck <b>Alice</b>"); await B.keyboard.press("Enter"); await sleep(600);
await B.click('[data-reaction="fire"]'); await sleep(700);
out.chat = await A.evaluate(() => ({ unread: document.getElementById("chat-unread").textContent, floats: document.querySelectorAll("#reaction-floats .float").length, bold: document.querySelectorAll("#chat-log b").length }));
await front(A); await A.click("#chat-toggle"); await sleep(200);
out.chatLines = await A.evaluate(() => [...document.querySelectorAll("#chat-log li")].map((l) => l.textContent));
await A.screenshot({ path: `/tmp/driver/${tag}-waiting-chat.png` });
await front(A); await A.click("#ready"); await front(B); await B.click("#ready"); await front(A);
await A.waitForFunction(() => document.body.dataset.phase === "racing", { timeout: 9000 });
out.pickerHiddenRacing = await A.evaluate(() => document.getElementById("avatar-card").hidden);
await sleep(300);
// Play: solve the maze for Alice via the page's own move API using a BFS over the saved layout
const win = await A.evaluate(async () => {
  const id = location.pathname.split("/").pop();
  const { game } = await (await fetch(`/api/maze/matches/${id}`)).json();
  const n = game.maze.length, key = (x, y) => `${x},${y}`;
  const open = (x, y) => game.maze[y]?.[x] === "." || game.gates.some((g) => g.x === x && g.y === y && g.openWhen === false);
  const start = game.players[0], goal = { x: n - 2, y: n - 2 };
  const D = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const q = [{ x: start.x, y: start.y, p: [] }], seen = new Set([key(start.x, start.y)]);
  for (const c of q) { if (c.x === goal.x && c.y === goal.y) return c.p; for (const [d, [dx, dy]] of Object.entries(D)) { const x = c.x + dx, y = c.y + dy; if (open(x, y) && !seen.has(key(x, y))) { seen.add(key(x, y)); q.push({ x, y, p: [...c.p, d] }); } } }
  return null;
});
out.routeLength = win?.length ?? null;
if (win) {
  let seq = 1;
  for (let i = 0; i < win.length; i += 3) {
    const batch = win.slice(i, i + 3);
    for (;;) {
      const status = await A.evaluate(async (actions, sequence) => { const id = location.pathname.split("/").pop(); const r = await fetch(`/api/maze/matches/${id}/move`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ actions, sequence }) }); return r.status; }, batch, seq);
      if (status === 200) { seq += batch.length; break; }
      await sleep(150);
    }
    await sleep(430);
  }
}
await A.waitForFunction(() => document.body.dataset.phase === "finished", { timeout: 15000 }).catch(() => {});
await sleep(1800);
out.celebration = await A.evaluate(() => ({ phase: document.body.dataset.phase, canvas: Boolean(document.querySelector("canvas.win-fx")), banner: document.querySelector(".win-banner")?.textContent ?? null }));
await A.screenshot({ path: `/tmp/driver/${tag}-victory.png` });
out.loserSees = await B.evaluate(() => ({ canvas: Boolean(document.querySelector("canvas.win-fx")), title: document.getElementById("race-title").textContent }));
await sleep(7500);
out.afterSeconds = await A.evaluate(() => ({ canvas: Boolean(document.querySelector("canvas.win-fx")), banner: Boolean(document.querySelector(".win-banner")) }));
out.errors = { A: A.errors, B: B.errors };
console.log(JSON.stringify(out, null, 1));
await browser.close();

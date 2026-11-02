import puppeteer from "puppeteer-core";
const base = "http://localhost:8080", sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const phone = process.argv[2] === "phone", tag = phone ? "phone" : "desk";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--enable-unsafe-swiftshader"] });
const size = phone ? { width: 390, height: 844, isTouch: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1440, height: 900 };
const out = {};
const front = async (p) => { await p.bringToFront(); await sleep(150); };
async function open(name, url = base) {
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport(size);
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/404|401/.test(m.text())) page.errors.push(m.text()); });
  await page.goto(url);
  if (name) { await page.waitForSelector("#nickname"); await page.type("#nickname", name); }
  return page;
}
const A = await open("Alice"); await sleep(1000);
// Lobby: designer pops in front when creating
await A.click("#create-race"); await sleep(900);
out.dialogOpen = await A.evaluate(() => { const d = document.getElementById("avatar-card"); const r = d.getBoundingClientRect(); return { open: d.open, centred: Math.abs((r.left + r.width / 2) - innerWidth / 2) < 4, width: Math.round(r.width) }; });
await A.screenshot({ path: `/tmp/driver/${tag}2-dialog.png` });
await A.evaluate(() => { document.querySelector('input[name="look-shape"][value="blob"]').click(); document.querySelector('input[name="look-accessory"][value="crown"]').click(); });
await A.waitForSelector("#avatar-go", { visible: true }); await sleep(500); await A.click("#avatar-go"); await A.waitForFunction(() => location.pathname.startsWith("/race/"), { timeout: 15000 }); await sleep(900);
const raceUrl = A.url();
out.spectateLink = await A.evaluate(() => document.getElementById("spectate-link").value);
out.spectateVisibleWaiting = await A.evaluate(() => !document.getElementById("spectate-box").hidden);
const B = await open("", raceUrl); await front(B); await B.waitForSelector("#nickname"); await B.type("#nickname", "Bob"); await B.click("#join-race"); await sleep(900);
await B.waitForSelector("#avatar-go", { visible: true }); await sleep(500); await B.click("#avatar-go"); await B.waitForSelector("#race-panel:not([hidden])", { timeout: 10000 });
// Spectator joins from the shared link
const S = await open(null, out.spectateLink); await sleep(2500);
out.spectator = await S.evaluate(() => ({ panel: !document.getElementById("spectator-panel").hidden, title: document.getElementById("spec-title").textContent, players: document.getElementById("spec-players").textContent, followBtns: document.querySelectorAll("[data-follow]:not([hidden])").length, hasEntry: !document.getElementById("entry").hidden, hasMove: Boolean(document.querySelector("#movement:not([hidden])")), watching: document.getElementById("spec-watching").textContent, mode: document.body.dataset.mode }));
await front(A); await A.click("#ready"); await front(B); await B.click("#ready"); await front(A);
await A.waitForFunction(() => document.body.dataset.phase === "racing", { timeout: 9000 });
await sleep(1500);
await front(S);
out.specRacing = await S.evaluate(() => ({ phase: document.body.dataset.phase, fixed: getComputedStyle(document.querySelector(".stage")).position, moveShown: getComputedStyle(document.getElementById("movement")).display, chat: getComputedStyle(document.getElementById("chat")).display }));
// spectator cameras: 3rd of A, 1st of B
await S.click('[data-view="third"]'); await sleep(600); await S.screenshot({ path: `/tmp/driver/${tag}2-spec-third-A.png` });
await S.click('[data-follow="1"]'); await S.click('[data-view="first"]'); await sleep(700); await S.screenshot({ path: `/tmp/driver/${tag}2-spec-first-B.png` });
out.specView = await S.evaluate(() => ({ view: document.body.dataset.view, followPressed: document.querySelector('[data-follow="1"]').getAttribute("aria-pressed") }));
// Alice wins through the API
await front(A);
const route = await A.evaluate(async () => {
  const id = location.pathname.split("/").pop(); const { game } = await (await fetch(`/api/maze/matches/${id}`)).json();
  const n = game.maze.length, k = (x, y) => `${x},${y}`; const open = (x, y) => game.maze[y]?.[x] === "." || game.gates.some((g) => g.x === x && g.y === y && g.openWhen === false);
  const s = game.players[0], goal = { x: n - 2, y: n - 2 }, D = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const q = [{ x: s.x, y: s.y, p: [] }], seen = new Set([k(s.x, s.y)]);
  for (const c of q) { if (c.x === goal.x && c.y === goal.y) return c.p; for (const [d, [dx, dy]] of Object.entries(D)) { const x = c.x + dx, y = c.y + dy; if (open(x, y) && !seen.has(k(x, y))) { seen.add(k(x, y)); q.push({ x, y, p: [...c.p, d] }); } } }
});
let seq = 1;
for (let i = 0; i < route.length; i += 3) {
  const batch = route.slice(i, i + 3);
  for (;;) { const st = await A.evaluate(async (a, sq) => (await fetch(`/api/maze/matches/${location.pathname.split("/").pop()}/move`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ actions: a, sequence: sq }) })).status, batch, seq); if (st === 200) { seq += batch.length; break; } await sleep(150); }
  await sleep(430);
}
await A.waitForFunction(() => document.body.dataset.phase === "finished", { timeout: 15000 });
await sleep(1500);
const banner = (p) => p.evaluate(() => ({ phase: document.body.dataset.phase, banner: document.querySelector(".win-banner")?.innerText ?? null, cls: document.querySelector(".win-banner")?.className ?? null, canvas: Boolean(document.querySelector("canvas.win-fx")), stats: document.getElementById("stats-line")?.textContent ?? "" }));
out.winner = await banner(A); await A.screenshot({ path: `/tmp/driver/${tag}2-winner.png` });
await front(B); await sleep(300); out.loser = await banner(B); await B.screenshot({ path: `/tmp/driver/${tag}2-loser.png` });
await front(S); await sleep(300); out.spectatorEnd = await banner(S); await S.screenshot({ path: `/tmp/driver/${tag}2-spec-end.png` });
// Rematch: Bob asks, Alice gets a card
await front(B); await B.click("#rematch"); await B.waitForFunction(() => location.pathname !== "/race/" + "x" && document.body.dataset.phase === "waiting", { timeout: 10000 });
await front(A); await sleep(1200);
out.toast = await A.evaluate(() => { const t = document.getElementById("rematch-toast"); return { hidden: t.hidden, shown: t.classList.contains("in"), title: document.getElementById("toast-title").textContent }; });
await A.screenshot({ path: `/tmp/driver/${tag}2-toast.png` });
const before = new URL(A.url()).pathname;
await A.click("#toast-join"); await A.waitForFunction((b) => location.pathname !== b, { timeout: 10000 }, before);
out.aliceAfterToast = { moved: new URL(A.url()).pathname !== before, sameAsBob: new URL(A.url()).pathname === new URL(B.url()).pathname };
await sleep(800);
await A.goto(base); await sleep(1200);
out.stats = await A.evaluate(() => ({ shown: !document.getElementById("stats-card").hidden, streak: document.getElementById("stat-streak").textContent, best: document.getElementById("stat-best").textContent, note: document.getElementById("stat-note").textContent }));
await A.screenshot({ path: `/tmp/driver/${tag}2-lobby.png` });
out.errors = { A: A.errors, B: B.errors, S: S.errors };
console.log(JSON.stringify(out, null, 1));
await browser.close();

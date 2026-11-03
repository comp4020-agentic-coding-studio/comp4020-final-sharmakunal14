import puppeteer from "puppeteer-core";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = "http://localhost:8080";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const errs = [];
const A = await b.newPage(); await A.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
A.on("pageerror", e => errs.push(e.message));
await A.goto(H + "/", { waitUntil: "domcontentloaded" }); await sleep(2500);
await A.type("#nickname", "Ann"); await A.click("#name-next"); await sleep(600);
await A.click("#create-race"); await sleep(700); await A.click("#avatar-go");
await A.waitForFunction(() => location.pathname.startsWith("/race/"), { timeout: 10000 });
const id = A.url().split("/race/")[1]; await sleep(1500);
let cookie = "";
const call = async (path, body, method = "POST") => {
  const r = await fetch(H + path, { method, headers: { "content-type": "application/json", origin: H, cookie }, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
  const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
await call("/api/session", { name: "Ben" }); await call(`/api/maze/matches/${id}/join`, {});
await A.click("#ready"); await call(`/api/maze/matches/${id}/ready`, {});
await sleep(4200);
await A.evaluate(() => document.querySelector('[data-view="overview"]')?.click());
// Today's pulse at (4,3); A starts at (1,1). Route to (3,3) on 2026-11-02: computed by BFS in page.
const path = await A.evaluate(async () => {
  const { game } = await (await fetch(location.pathname.replace("/race/", "/api/maze/matches/"))).json();
  const target = { x: game.pulses[0].x - 1, y: game.pulses[0].y };
  const D = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const q = [{ x: 1, y: 1, p: [] }], seen = new Set(["1,1"]);
  for (const c of q) { if (c.x === target.x && c.y === target.y) return c.p;
    for (const [d, [dx, dy]] of Object.entries(D)) { const x = c.x + dx, y = c.y + dy; if (game.maze[y]?.[x] === "." && !seen.has(x + "," + y)) { seen.add(x + "," + y); q.push({ x, y, p: [...c.p, d] }); } } }
});
console.log("path", path);
const key = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
for (const d of path) { await A.keyboard.press(key[d]); await sleep(220); }
await sleep(800);
const g = (await call(`/api/maze/matches/${id}`, null, "GET")).body.game;
const into = (Date.now() - g.startsAt) % 5000;
await sleep((3500 - into + 5000) % 5000);
console.log("hint closed:", await A.evaluate(() => document.getElementById("switch-hint").textContent));
await A.keyboard.press("ArrowRight"); await sleep(300);
console.log("announce:", await A.evaluate(() => document.getElementById("announcement").textContent));
await A.screenshot({ path: "/tmp/driver/pulse-phone-closed.png" });
await sleep(2000);
console.log("hint open:", await A.evaluate(() => document.getElementById("switch-hint").textContent));
await A.keyboard.press("ArrowRight"); await sleep(600);
const me = (await A.evaluate(async () => (await (await fetch(location.pathname.replace("/race/", "/api/maze/matches/"))).json()).game.players[0]));
console.log("A now at", me.x, me.y);
await A.screenshot({ path: "/tmp/driver/pulse-phone-open.png" });
console.log("errors", errs);
await b.close();

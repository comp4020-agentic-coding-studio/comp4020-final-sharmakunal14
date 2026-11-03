import puppeteer from "puppeteer-core";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = process.env.H ?? "http://localhost:8090";
const twoD = process.argv[2] === "2d", phone = process.argv[2] === "phone";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: twoD ? ["--disable-webgl", "--disable-3d-apis"] : ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const errs = [], tag = process.argv[2] ?? "3d";
const A = await b.newPage(); await A.setViewport(phone ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
A.on("pageerror", e => errs.push(e.message));
await A.goto(H + "/", { waitUntil: "domcontentloaded" }); await sleep(2500);
await A.type("#nickname", "Ann"); await A.click("#name-next"); await sleep(700);
await A.click("#to-worlds"); await sleep(1200);
await A.screenshot({ path: `/tmp/driver/worlds-${tag}-picker.png` });
console.log("locked:", await A.evaluate(() => [...document.querySelectorAll(".level-btn")].filter((b) => b.disabled).length));
await A.click(".level-btn:not([disabled])"); await sleep(1500);
console.log("create label:", await A.evaluate(() => document.getElementById("create-level-label").textContent));
await A.click("#create-level"); await sleep(700); await A.click("#avatar-go");
await A.waitForFunction(() => location.pathname.startsWith("/race/"), { timeout: 10000 });
const id = A.url().split("/race/")[1]; await A.waitForFunction(() => document.body.dataset.inRace === "true", { timeout: 60000 }); await sleep(1500);
console.log("title:", await A.evaluate(() => [document.getElementById("arena-title").textContent, document.getElementById("board-size").textContent]));
let cookie = "";
const call = async (path, body, method = "POST") => {
  const r = await fetch(H + path, { method, headers: { "content-type": "application/json", origin: H, cookie }, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
  const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
  return r.json().catch(() => ({}));
};
await call("/api/session", { name: "Ben" }); await call(`/api/maze/matches/${id}/join`, {});
await A.click("#ready"); await call(`/api/maze/matches/${id}/ready`, {});
await sleep(4300);
await A.evaluate(() => document.querySelector('[data-view="overview"]')?.click()); await sleep(1200);
await A.screenshot({ path: `/tmp/driver/worlds-${tag}-race.png` });
// Ben wins by walking his route.
const g = (await call(`/api/maze/matches/${id}`, null, "GET")).game;
const D = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const n = g.maze.length, start = { x: n - 2, y: n - 2 }, goal = { x: 1, y: 1 };
const q = [{ ...start, p: [] }], seen = new Set([`${start.x},${start.y}`]); let path;
for (const c of q) { if (c.x === goal.x && c.y === goal.y) { path = c.p; break; }
  for (const [d, [dx, dy]] of Object.entries(D)) { const x = c.x + dx, y = c.y + dy; if (g.maze[y]?.[x] === "." && !seen.has(x + "," + y)) { seen.add(x + "," + y); q.push({ x, y, p: [...c.p, d] }); } } }
let seq = 1;
for (let i = 0; i < path.length; i += 4) { await sleep(600); const r = await call(`/api/maze/matches/${id}/move`, { actions: path.slice(i, i + 4), sequence: seq }); seq = r.game.players[1].sequence + 1; }
await sleep(2500);
console.log("next button:", await A.evaluate(() => [document.getElementById("next-level").hidden, document.getElementById("next-level-label").textContent]));
await A.screenshot({ path: `/tmp/driver/worlds-${tag}-result.png` });
await A.click("#next-level");
await A.waitForFunction((old) => location.pathname !== old, { timeout: 10000 }, `/race/${id}`); await A.waitForFunction(() => document.body.dataset.inRace === "true", { timeout: 60000 }); await sleep(1500);
console.log("after next:", await A.evaluate(() => [document.getElementById("arena-title").textContent, document.getElementById("board-size").textContent]));
console.log("errors", errs);
await b.close();

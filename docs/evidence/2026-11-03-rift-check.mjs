import puppeteer from "puppeteer-core";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = "http://localhost:8080";
const twoD = process.argv[2] === "2d";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: twoD ? ["--disable-webgl", "--disable-3d-apis"] : ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const errs = [];
const A = await b.newPage(); await A.setViewport({ width: 1440, height: 900 });
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
await sleep(4300);
await A.evaluate(() => document.querySelector('[data-view="overview"]')?.click());
// Walk to the cell next to the nearer rift, avoiding rift cells, by BFS in page.
const plan = await A.evaluate(async () => {
  const { game } = await (await fetch(location.pathname.replace("/race/", "/api/maze/matches/"))).json();
  const D = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  const isRift = (x, y) => game.rifts.some((r) => r.x === x && r.y === y);
  const q = [{ x: 1, y: 1, p: [] }], seen = new Set(["1,1"]);
  for (const c of q) for (const [d, [dx, dy]] of Object.entries(D)) {
    const x = c.x + dx, y = c.y + dy;
    if (game.maze[y]?.[x] !== ".") continue;
    if (isRift(x, y)) return { path: [...c.p, d], rifts: game.rifts };
    if (!seen.has(x + "," + y)) { seen.add(x + "," + y); q.push({ x, y, p: [...c.p, d] }); }
  }
});
console.log("plan", JSON.stringify(plan));
const key = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
for (const d of plan.path.slice(0, -1)) { await A.keyboard.press(key[d]); await sleep(230); }
await sleep(700); await A.screenshot({ path: `/tmp/driver/rift-${twoD ? "2d" : "3d"}-before.png` });
await A.keyboard.press(key[plan.path.at(-1)]); await sleep(150);
await A.screenshot({ path: `/tmp/driver/rift-${twoD ? "2d" : "3d"}-flash.png` });
await sleep(900);
console.log("announce", await A.evaluate(() => document.getElementById("announcement").textContent));
const me = (await call(`/api/maze/matches/${id}`, null, "GET")).body.game.players[0];
console.log("server says A at", me.x, me.y);
await A.screenshot({ path: `/tmp/driver/rift-${twoD ? "2d" : "3d"}-after.png` });
await call(`/api/maze/matches/${id}/forfeit`, {});
console.log("errors", errs);
await b.close();

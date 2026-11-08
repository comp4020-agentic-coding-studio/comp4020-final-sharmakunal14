import puppeteer from "puppeteer-core";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = "http://localhost:8080";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const out = {};
for (const [tag, vp] of [["phone", { width: 390, height: 844, isMobile: true, hasTouch: true }], ["small", { width: 360, height: 640, isMobile: true, hasTouch: true }], ["desk", { width: 1440, height: 900 }]]) {
  const A = await b.newPage(); await A.setViewport(vp);
  const jar = {};
  const call = async (who, path, body, method = "POST") => {
    const r = await fetch(H + path, { method, headers: { "content-type": "application/json", origin: H, cookie: jar[who] ?? "" }, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
    const set = r.headers.get("set-cookie"); if (set) jar[who] = set.split(";")[0];
    return r.json().catch(() => ({}));
  };
  await call("a", "/api/session", { name: "Ann" }); await call("b", "/api/session", { name: "Ben" });
  const { game } = await call("a", "/api/maze/matches", {});
  await call("b", `/api/maze/matches/${game.id}/join`, {});
  const [name, value] = jar.a.split("=");
  await A.setCookie({ name, value, url: H });
  await A.goto(`${H}/race/${game.id}`, { waitUntil: "domcontentloaded" });
  await A.waitForFunction(() => document.body.dataset.inRace === "true", { timeout: 60000 });
  await call("a", `/api/maze/matches/${game.id}/ready`, {}); await call("b", `/api/maze/matches/${game.id}/ready`, {});
  await sleep(5500);
  const boxes = await A.evaluate(() => Object.fromEntries(["connection", "race-clock", "arena-title", "exit-game"].map((id) => {
    const r = document.getElementById(id)?.getBoundingClientRect(); return [id, r && r.width ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] : null];
  })));
  const hit = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  out[tag] = { overlapClockConn: hit(boxes.connection, boxes["race-clock"]), overlapClockTitle: hit(boxes["arena-title"], boxes["race-clock"]), overlapConnTitle: hit(boxes.connection, boxes["arena-title"]), boxes };
  await A.screenshot({ path: `/tmp/driver/hud-${tag}.png` });
  await A.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();

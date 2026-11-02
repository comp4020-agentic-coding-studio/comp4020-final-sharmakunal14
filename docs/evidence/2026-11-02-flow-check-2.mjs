import puppeteer from "puppeteer-core";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = "http://localhost:8080";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const errs = [];
const A = await b.newPage(); await A.setViewport({ width: 1440, height: 900 });
A.on("pageerror", e => errs.push(e.message));
const shot = async (n, p = A) => { await sleep(900); await p.screenshot({ path: `/tmp/driver/f3-${n}.png` }); };
await A.goto(H + "/", { waitUntil: "domcontentloaded" }); await sleep(2500);
await A.type("#nickname", "Ann"); await A.click("#name-next"); await sleep(600);
await A.click("#create-race"); await sleep(700); await A.click("#avatar-go");
await A.waitForFunction(() => location.pathname.startsWith("/race/"), { timeout: 10000 });
const id = A.url().split("/race/")[1]; await sleep(1500);
// Player B over HTTP
let cookie = "";
const call = async (path, body, method = "POST") => {
  const r = await fetch(H + path, { method, headers: { "content-type": "application/json", origin: H, cookie }, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
  const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
  return r.json().catch(() => ({}));
};
await call("/api/session", { name: "Ben" }); await call(`/api/maze/matches/${id}/join`, {});
// Spectator
const sp = await (async () => { const c = await A.evaluate(async (id) => (await (await fetch(`/api/maze/matches/${id}/spectate`)).json()).token, id); return c; })();
const C = await b.newPage(); await C.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
C.on("pageerror", e => errs.push("C " + e.message));
await C.goto(`${H}/watch/${sp}`, { waitUntil: "domcontentloaded" }); await sleep(2500); await shot("spectator-phone", C);
console.log("spectator", await C.evaluate(() => [document.getElementById("entry").hidden, document.getElementById("spectator-panel").hidden, document.querySelector(".steps")?.hidden ?? "nosteps"]));
await shot("spectator-phone2", C); await C.close(); await A.bringToFront(); await sleep(500);
await A.click("#ready"); await call(`/api/maze/matches/${id}/ready`, {});
await sleep(1200); await shot("countdown");
await sleep(3500); await shot("racing");
console.log("phase", await A.evaluate(() => [document.body.dataset.phase, document.getElementById("entry").hidden, getComputedStyle(document.querySelector(".scene")).display, document.getElementById("exit-game").getBoundingClientRect().top]));
await call(`/api/maze/matches/${id}/forfeit`, {});
await sleep(1500); await shot("result-A");
console.log("result", await A.evaluate(() => [document.body.dataset.phase, document.getElementById("another-race").hidden]));
await A.click("#another-race"); await sleep(1500); await shot("rematch");
// reduced motion + replay entry for a signed-out visitor
const R = await (await b.createBrowserContext()).newPage(); await R.setViewport({ width: 1440, height: 900 });
await R.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await R.goto(`${H}/race/${id}/replay`, { waitUntil: "domcontentloaded" }); await sleep(2500); await shot("replay-signedout", R);
console.log("replay entry", await R.evaluate(() => [document.getElementById("entry-title").textContent, document.querySelector('.pane[data-pane="name"]').dataset.pos, document.querySelector(".pane").style.transition || getComputedStyle(document.querySelector(".pane")).transitionDuration]));
console.log(errs);
await b.close();

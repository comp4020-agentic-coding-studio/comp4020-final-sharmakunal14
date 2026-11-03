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
await A.screenshot({ path: "/tmp/driver/fog-choose.png" });
await A.click('input[name="fog"][value="fog"]');
await A.click("#create-race"); await sleep(700); await A.click("#avatar-go");
await A.waitForFunction(() => location.pathname.startsWith("/race/"), { timeout: 10000 });
const id = A.url().split("/race/")[1]; await sleep(1500);
console.log("mode line", await A.evaluate(() => [document.getElementById("race-mode").hidden, document.getElementById("race-mode").textContent]));
let cookie = "";
const call = async (path, body, method = "POST") => {
  const r = await fetch(H + path, { method, headers: { "content-type": "application/json", origin: H, cookie }, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
  const set = r.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
await call("/api/session", { name: "Ben" }); await call(`/api/maze/matches/${id}/join`, {});
await A.click("#ready"); await call(`/api/maze/matches/${id}/ready`, {});
await sleep(4500);
const tag = twoD ? "2d" : "3d";
if (!twoD) { await A.evaluate(() => document.querySelector('[data-view="third"]')?.click()); await sleep(1200); await A.screenshot({ path: `/tmp/driver/fog-${tag}-third.png` }); }
await A.evaluate(() => document.querySelector('[data-view="overview"]')?.click()); await sleep(1500);
await A.screenshot({ path: `/tmp/driver/fog-${tag}-map.png` });
for (const k of ["ArrowDown", "ArrowDown", "ArrowRight", "ArrowRight"]) { await A.keyboard.press(k); await sleep(250); }
await sleep(800); await A.screenshot({ path: `/tmp/driver/fog-${tag}-moved.png` });
console.log("errors", errs);
await b.close();

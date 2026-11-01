import puppeteer from "puppeteer-core";
const base = "http://localhost:8080";
const exe = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const out = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: exe, headless: "new", args: ["--use-angle=metal", "--enable-unsafe-swiftshader"] });
async function player(name, size) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(size);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/401/.test(m.text())) errors.push(m.text()); });
  await page.goto(base);
  await page.waitForSelector("#nickname");
  await page.type("#nickname", name);
  return { page, errors };
}
const phone = process.argv[2] === "phone";
const size = phone ? { width: 390, height: 844, isTouch: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1440, height: 900 };
const A = await player("Alice", size), B = await player("Bob", size);
await Promise.all([A.page.click("#create-race"), A.page.waitForNavigation()]);
const link = A.page.url();
await B.page.goto(link.replace(/.*\/race\//, base + "/race/"));
await sleep(1500);
if (await B.page.$("#nickname:not([hidden])")) { await B.page.type("#nickname", "Bob"); await B.page.click("#join-race"); await B.page.waitForSelector("#race-panel:not([hidden])"); }
await A.page.waitForSelector("#ready:not([disabled])");
await B.page.waitForSelector("#ready:not([disabled])");
await A.page.click("#ready"); await B.page.click("#ready");
await A.page.waitForFunction(() => document.body.dataset.phase === "countdown");
await sleep(400);
const snap = (p) => p.evaluate(() => ({
  phase: document.body.dataset.phase, view: document.body.dataset.view,
  fs: Boolean(document.fullscreenElement),
  stage: (({ width, height }) => [width, height])(document.querySelector(".stage").getBoundingClientRect()),
  exitVisible: getComputedStyle(document.getElementById("exit-game")).display !== "none",
  firstPressed: document.querySelector('[data-view="first"]').getAttribute("aria-pressed"),
}));
out.countdown = await snap(A.page);
await A.page.screenshot({ path: `/tmp/driver/${phone ? "phone" : "desk"}-countdown.png` });
await A.page.waitForFunction(() => document.body.dataset.phase === "racing", { timeout: 6000 });
await sleep(500);
out.racing = await snap(A.page);
await A.page.screenshot({ path: `/tmp/driver/${phone ? "phone" : "desk"}-racing.png` });
// Exit: dialog opens, keep racing leaves race running
await A.page.click("#exit-game");
out.dialogOpen = await A.page.evaluate(() => document.getElementById("exit-dialog").open);
await A.page.screenshot({ path: `/tmp/driver/${phone ? "phone" : "desk"}-dialog.png` });
await A.page.click('#exit-dialog button[value="stay"]');
out.afterStay = await A.page.evaluate(() => ({ open: document.getElementById("exit-dialog").open, phase: document.body.dataset.phase }));
// Leave: bob should see cancelled
await A.page.click("#exit-game");
await Promise.all([A.page.waitForNavigation(), A.page.click('#exit-dialog button[value="leave"]')]);
out.alicePath = new URL(A.page.url()).pathname;
await B.page.waitForFunction(() => document.body.dataset.phase === "interrupted", { timeout: 5000 });
out.bob = await B.page.evaluate(() => ({ title: document.getElementById("race-title").textContent, desc: document.getElementById("race-description").textContent, rematch: !document.getElementById("rematch").hidden, fs: Boolean(document.fullscreenElement) }));
await B.page.screenshot({ path: `/tmp/driver/${phone ? "phone" : "desk"}-bob-cancelled.png` });
// Rematch from Bob, then Alice follows via her recent race link
await Promise.all([B.page.waitForNavigation(), B.page.click("#rematch")]);
out.bobRematch = new URL(B.page.url()).pathname;
out.errors = { A: A.errors, B: B.errors };
console.log(JSON.stringify(out, null, 1));
await browser.close();

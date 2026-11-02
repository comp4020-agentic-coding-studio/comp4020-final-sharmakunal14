import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
for (const [tag, w, h, mobile] of [["desk",1440,900,false],["phone",390,844,true]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type()==="error" && errs.push(m.text()));
  await p.goto("http://localhost:8080/maze.html", { waitUntil: "networkidle2" });
  const shot = async n => { await new Promise(r=>setTimeout(r,700)); await p.screenshot({ path: `/tmp/driver/flow-${tag}-${n}.png` }); };
  await shot("1-name");
  await p.type("#nickname", "Kay"); await p.click("#name-next"); await shot("2-choose");
  await p.click("#to-join"); await shot("3-join");
  await p.click("#join-back"); await new Promise(r=>setTimeout(r,500));
  await p.click("#create-race"); await shot("4-avatar");
  await p.click("#avatar-go"); await p.waitForFunction(()=>location.pathname.startsWith("/race/"),{timeout:8000});
  await new Promise(r=>setTimeout(r,1500)); await shot("5-wait");
  console.log(tag, p.url(), errs);
  await p.close();
}
await b.close();

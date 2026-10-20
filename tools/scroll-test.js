// Scroll-stop test: real wheel input against the local site (python3 -m http.server 8765).
// Trackpad-like bursts with momentum and single mouse notches; each gesture must move exactly one stop.
//   node tools/scroll-test.js chromium 1512x860     (or webkit; needs Playwright: npm i playwright)
const { chromium, webkit } = require(process.env.PLAYWRIGHT || "playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function swipe(page, dir = 1, n = 50) {               // decaying deltas, ~16ms apart, like trackpad momentum
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dir * Math.max(4, 30 * Math.pow(0.93, i))); await sleep(16); }
}
(async () => {
  const engine = process.argv[2] === "webkit" ? webkit : chromium;
  const [w, h] = (process.argv[3] || "1440x900").split("x").map(Number);
  const browser = await engine.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://localhost:8765/"); await sleep(1200);
  await page.mouse.move(w / 2, h / 2);
  const stops = await page.evaluate(() => { const t = document.getElementById("hero-track");
    return [...document.querySelectorAll(".hero-stop")].map(e => e.offsetTop + t.offsetTop).concat(document.getElementById("day").offsetTop); });
  console.log(engine.name(), w + "x" + h, "stops", stops);
  const y = () => page.evaluate(() => Math.round(scrollY));
  const log = [];
  for (let k = 0; k < 4; k++) { await swipe(page, 1); await sleep(1500); log.push(await y()); }
  console.log(" trackpad down:", log.join(" → "));
  const up = [];
  for (let k = 0; k < 4; k++) { await swipe(page, -1); await sleep(1500); up.push(await y()); }
  console.log(" trackpad up:  ", up.join(" → "));
  await page.evaluate(() => scrollTo(0, 0)); await sleep(800);
  const notch = [];
  for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, 100); await sleep(1500); notch.push(await y()); }
  console.log(" mouse notch:  ", notch.join(" → "));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });

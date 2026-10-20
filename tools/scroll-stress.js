// Stress cases for the scroll stepper: each must keep the page scrollable.
//   node tools/scroll-stress.js chromium|webkit   (site served on :8765; PLAYWRIGHT=path to playwright)
const pw = require(process.env.PLAYWRIGHT || "playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function burst(page, dir, n = 50, peak = 30) {
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dir * Math.max(4, peak * Math.pow(0.93, i))); await sleep(16); }
}
(async () => {
  const engine = pw[process.argv[2] || "chromium"];
  const b = await engine.launch(); const page = await b.newPage({ viewport: { width: 1512, height: 860 } });
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:8765/"); await sleep(1200); await page.mouse.move(700, 400);
  const y = () => page.evaluate(() => Math.round(scrollY));
  const reset = async () => { await page.evaluate(() => scrollTo(0, 0)); await sleep(900); };
  const res = {};
  // 1. resting finger: 3 s of 1px deltas, then a normal swipe must still move
  await reset(); await burst(page, 1); await sleep(1300); const a0 = await y();
  for (let i = 0; i < 190; i++) { await page.mouse.wheel(0, 1); await sleep(16); }
  await burst(page, 1); await sleep(1300); res.restingFinger = [a0, await y()];
  // 2. a second swipe chained straight into the first one's momentum (no pause)
  await reset(); await burst(page, 1, 50); await burst(page, 1, 50); await sleep(1500); res.chained = [await y()];
  // 3. three quick swipes 60 ms apart, then wait: must have moved, and keep moving after
  await reset(); for (let k = 0; k < 3; k++) { await burst(page, 1, 12, 40); await sleep(60); } await sleep(1500);
  const c1 = await y(); await burst(page, 1); await sleep(1300); res.quickThenNormal = [c1, await y()];
  // 4. long continuous momentum (3 s, never quiet) after a step, then a normal swipe
  await reset(); for (let i = 0; i < 190; i++) { await page.mouse.wheel(0, Math.max(2, 40 * Math.pow(0.985, i))); await sleep(16); }
  await sleep(300); const d1 = await y(); await burst(page, 1); await sleep(1300); res.longMomentum = [d1, await y()];
  // 5. bottom of the page: wheel keeps working back up
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(900);
  const e0 = await y(); await burst(page, -1); await sleep(1300); res.fromBottomUp = [e0, await y()];
  console.log(process.argv[2] || "chromium", JSON.stringify(res), errors.length ? "ERRORS " + errors.join(" | ") : "no errors");
  await b.close();
})();

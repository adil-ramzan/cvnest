// Run by hand: typing latency at 6x CPU throttling with a 6-page resume in the preview.
// BASE_URL=http://localhost:3000 node tests/e2e/typing-latency.mjs [template]
import { BASE, launch, sleep } from "./helpers.mjs";
import { buildResume, storageFor } from "./pagination-lib.mjs";

const slug = process.argv[2] ?? "modern";
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
await page.evaluate((storage) => { localStorage.clear(); for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v); }, storageFor(buildResume({ slug, size: "letter", bullets: 110 })));
await page.goto(`${BASE}/editor`, { waitUntil: "load" });
await page.waitForSelector(".resume-page");
await sleep(1500);
const pages = () => page.evaluate(() => Number(document.body.innerText.match(/about (\d+) pages?/)?.[1]));
console.log("pages", await pages());

await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Content").click());
await sleep(300);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Profile")).click());
await sleep(500);
await page.waitForSelector("textarea");
await page.focus("textarea");
await page.evaluate(() => {
  window.__events = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (entry.name === "keydown" || entry.name === "input") window.__events.push(entry.duration);
  }).observe({ type: "event", durationThreshold: 16, buffered: false });
});
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });

const times = [];
for (const char of "typing a little more text into the profile while the preview keeps up with it".split("")) {
  const start = Date.now();
  await page.keyboard.type(char);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))));
  times.push(Date.now() - start);
  await sleep(90);
}
const sorted = [...times].sort((a, b) => a - b);
const pct = (p) => sorted[Math.floor((sorted.length - 1) * p)];
const events = await page.evaluate(() => window.__events);
console.log(`keystroke to paint, ms: median ${pct(0.5)}, p95 ${pct(0.95)}, max ${sorted.at(-1)} (${times.length} keys)`);
console.log(`browser event timing, ms: over 16ms ${events.length}, max ${Math.max(0, ...events)}`);

// How long the page count takes to catch up after a pause.
const before = await pages();
const start = Date.now();
await page.evaluate(() => {
  const area = document.querySelector("textarea");
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(area, "A long paragraph of further text. ".repeat(260));
  area.dispatchEvent(new Event("input", { bubbles: true }));
});
for (let i = 0; i < 100 && (await pages()) === before; i++) await sleep(50);
console.log(`page count went ${before} to ${await pages()} in ${Date.now() - start}ms at 6x throttling`);
await browser.close();
process.exit(0);

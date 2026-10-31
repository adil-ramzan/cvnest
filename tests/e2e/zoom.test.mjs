// The editor at high zoom and on short screens: the whole page scrolls, so the form
// is never squeezed. Browser zoom is simulated by the CSS size it leaves: 1440x900
// at 200% lays out as 720x450, and at 400% as 360x225.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";
import { longResume } from "./long-resume.mjs";

const check = createChecks("Zoom and short screens: page scroll, sticky preview, reload");
const browser = await launch();
const resume = longResume("");

async function open(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "long", zoom: "fit" })); }, JSON.stringify({ schemaVersion: 2, resumes: [resume] }));
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#editor-tabpanel");
  await sleep(400);
  return page;
}
/** How much of the screen the form can use once scrolled past the header. */
const formView = (page) => page.evaluate(async () => {
  const panel = document.getElementById("editor-tabpanel");
  window.scrollTo({ top: panel.getBoundingClientRect().top + scrollY, behavior: "instant" });
  await new Promise((r) => requestAnimationFrame(r));
  const header = document.querySelector("body header, header").getBoundingClientRect();
  const sticky = getComputedStyle(document.querySelector("header")).position === "sticky";
  const top = sticky ? Math.max(0, header.bottom) : 0;
  const bar = [...document.querySelectorAll("[aria-label='View']")].map((el) => el.parentElement).find((el) => el.offsetParent && getComputedStyle(el).position === "sticky");
  const bottom = bar ? bar.getBoundingClientRect().top : innerHeight;
  return { visible: Math.round(bottom - top), sticky, over: document.documentElement.scrollWidth - innerWidth, canScroll: document.documentElement.scrollHeight > innerHeight };
});

for (const [label, width, height, minimum] of [["200% zoom", 720, 450, 300], ["400% zoom", 360, 225, 200], ["landscape 1180x667", 1180, 667, 500], ["landscape phone 844x390", 844, 390, 300], ["landscape phone 667x375", 667, 375, 300]]) {
  const page = await open(width, height);
  const view = await formView(page);
  console.log(`  ${label}: form sees ${view.visible}px of ${height}px`);
  check(`${label}: form has ${minimum}px or more`, view.visible >= minimum, `${view.visible}px`);
  check(`${label}: no sideways scroll`, view.over <= 0, String(view.over));
  if (height < 600) check(`${label}: nothing is sticky`, !view.sticky);
  await page.close();
}

// Wide and tall: sticky preview
let page = await open(1440, 900);
const pos = () => page.$eval("[aria-label='Resume preview']", (el) => Math.round(el.getBoundingClientRect().top));
await page.evaluate(() => [...document.querySelectorAll("h2 button")].find((b) => /Experience/.test(b.textContent)).click());
await sleep(900);
const startTop = await pos();
const heading = await page.evaluate(() => { const h = [...document.querySelectorAll("h2 button")].find((b) => /Experience/.test(b.textContent)).getBoundingClientRect(); const bar = document.querySelector("header").getBoundingClientRect(); return { top: h.top, bar: bar.bottom }; });
check("Opened section sits below the sticky header", heading.top >= heading.bar && heading.top < 300, JSON.stringify(heading));
await page.evaluate(() => document.querySelector("li button[aria-expanded]").click());
await sleep(300);
check("Opening a form doesn't move the preview", (await pos()) === startTop, `${startTop} -> ${await pos()}`);
await page.evaluate(() => window.scrollBy({ top: 600, behavior: "instant" }));
await sleep(200);
check("Preview stays put while the form scrolls", (await pos()) === startTop);
const inner = await page.$eval("[aria-label='Resume preview']", (el) => { el.scrollTop = 100000; return { scrolled: el.scrollTop > 0, end: el.scrollTop + el.clientHeight >= el.scrollHeight - 2, bottom: el.getBoundingClientRect().bottom }; });
check("Long resume is fully reachable inside the preview", inner.scrolled && inner.end, JSON.stringify(inner));
check("Preview fits under the header", inner.bottom <= 900.5, String(inner.bottom));

// Reload
await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
await sleep(200);
await page.locator("::-p-aria(Job title)").fill("Reload Check");
await sleep(800);
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("#editor-tabpanel");
await sleep(500);
check("Autosaved edit survives a reload", (await page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].sections.find((s) => s.type === "experience").entries[0].role)) === "Reload Check");
console.log(`  after reload: scrollY ${await page.evaluate(() => scrollY)}, open sections ${await page.$$eval("h2 button[aria-expanded='true']", (b) => b.length)}`);
await page.close();

// Below 1024px the toggle stays
page = await open(900, 800);
check("Under 1024px the Edit and Preview toggle stays", !!(await page.$("[aria-label='View']")));
check("Tab ids are unique", await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length === new Set(ids).size; }));
await page.close();

// Targets
page = await open(1440, 900);
await page.evaluate(() => [...document.querySelectorAll("h2 button")].find((b) => /Experience/.test(b.textContent)).click());
await sleep(500);
const sizes = await page.evaluate(() => ["[aria-label^='Reorder ']", "[aria-label^='Hide ']", "[aria-label^='Stored in']", "[aria-label^='Section options']", "[aria-label='More actions']"].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [s, r.width, r.height]; }));
check("Small controls have 40px hit areas", sizes.every(([, w, h]) => w >= 40 && h >= 40), JSON.stringify(sizes));
await page.close();

// Reduced motion
page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
check("Reduced motion removes transitions", await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("header button")).transitionDuration) < 0.001));
await browser.close();

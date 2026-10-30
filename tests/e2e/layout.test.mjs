// No horizontal overflow on any page at phone, tablet and desktop widths, and
// the gallery keeps its 1/2/3-column layout.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Layout: horizontal overflow and gallery columns");
const browser = await launch();
const page = await browser.newPage();

const routes = ["/", "/templates", "/templates/portrait", "/free", "/about", "/contact", "/privacy", "/terms", "/sign-in", "/editor", "/missing-page"];
const widths = [360, 390, 768, 1440];
const expectedColumns = { 360: 1, 390: 1, 768: 2, 1440: 3 };

for (const width of widths) {
  await page.setViewport({ width, height: 900, isMobile: width < 500, hasTouch: width < 1024 });
  const overflowing = [];
  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: "networkidle0" });
    await sleep(200);
    // Scroll the gallery so off-screen cards render too, then measure.
    if (route === "/templates") {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(300);
    }
    const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (extra > 0) overflowing.push(`${route} +${extra}px`);
  }
  check(`No horizontal overflow at ${width}px`, overflowing.length === 0, overflowing.join(", "));

  await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
  const columns = await page.$eval("#simple ul", (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  check(`Gallery shows ${expectedColumns[width]} column(s) at ${width}px`, columns === expectedColumns[width], String(columns));
}

await browser.close();

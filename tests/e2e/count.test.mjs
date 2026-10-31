// Every number the site states about its templates must match the template data.
import fs from "node:fs";
import path from "node:path";
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Template count: one number everywhere");
const registry = fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8");
const COUNT = new Set([...registry.matchAll(/^    slug: "([^"]+)"/gm)].map((m) => m[1])).size;

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const stated = async () => {
  const text = await page.evaluate(() => `${document.title} ${document.querySelector("meta[name=description]")?.content} ${document.querySelector("meta[property='og:title']")?.content} ${document.body.innerText}`);
  return [...text.matchAll(/(\d+)\s+(?:free\s+|customizable\s+)*(?:resume\s+)?(?:templates|designs)/gi)].map((m) => Number(m[1]));
};
for (const route of ["/", "/templates", "/free"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle0" });
  const numbers = await stated();
  check(`${route} only states the real count`, numbers.length > 0 && numbers.every((n) => n === COUNT), numbers.join(","));
}

for (const route of ["/", "/templates", "/free", "/about", "/privacy", "/templates/slate"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle0" });
  check(`${route} has social image tags`, await page.evaluate(() => !!document.querySelector("meta[property='og:image']") && !!document.querySelector("meta[name='twitter:image']")));
}
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
check("H1 shows the count", (await page.$eval("main h1", (el) => el.textContent)) === `${COUNT} free resume templates`);
check("Page title shows the count", (await page.title()).startsWith(`${COUNT} Free Resume Templates`), await page.title());
check("Meta description shows the count", (await page.$eval("meta[name=description]", (el) => el.content)).startsWith(`Browse ${COUNT} free`));
const chips = await page.$$eval("[aria-label='Template categories'] a", (as) => as.map((a) => Number(a.textContent.match(/\d+$/)[0])));
check("Chips add up to the headline", chips.reduce((a, b) => a + b, 0) === COUNT, chips.join("+"));
await page.type("input[type=search]", "serif");
await sleep(200);
const shown = await page.$$eval("main article.group", (els) => els.length);
check("Search shows matches of the total", (await page.$eval("main [role=status]", (el) => el.textContent)) === `${shown} of ${COUNT} templates`);

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
const lines = await page.$eval("main h1", (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
check("H1 fits two lines at 390px", lines <= 2, String(lines));
check("No sideways scroll at 390px", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await browser.close();

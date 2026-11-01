// Page structure, sample previews, focus visibility, touch targets and focus
// after dialogs. These complement a screen reader; they don't replace one.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Accessibility: headings, IDs, sample previews, focus, touch targets");
const browser = await launch();
const routes = ["/", "/templates", "/templates/professional", "/templates/kinetic", "/free", "/about", "/contact", "/privacy", "/terms", "/sign-in", "/editor", "/no-such-page"];

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const open = async (route) => {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
  await sleep(300);
};
const duplicateIds = () => page.evaluate(() => {
  const seen = {};
  document.querySelectorAll("[id]").forEach((el) => (seen[el.id] = (seen[el.id] ?? 0) + 1));
  return Object.keys(seen).filter((id) => seen[id] > 1 || /\s/.test(id));
});

const headings = [], ids = [];
for (const route of routes) {
  await open(route);
  const count = await page.$$eval("h1", (els) => els.length);
  if (count !== 1) headings.push(`${route}:${count}`);
  ids.push(...(await duplicateIds()).map((id) => `${route}#${id}`));
}
check("Every page has exactly one h1", headings.length === 0, headings.join(" "));
check("No duplicate or invalid IDs", ids.length === 0, ids.slice(0, 6).join(" "));

// Sample previews
await open("/templates");
await page.$$eval("main section button[aria-expanded='false']", (buttons) => buttons.forEach((button) => button.click()));
await sleep(1500);
check("IDs stay unique with every section expanded", (await duplicateIds()).length === 0, (await duplicateIds()).join(" "));
const previews = await page.$$eval(".resume-paper", (els) => els.map((el) => [el.getAttribute("role"), el.getAttribute("aria-label")]));
check("Gallery previews are single labelled images", previews.length > 0 && previews.every(([role, label]) => role === "img" && label?.startsWith("Sample resume")), String(previews.length));
check("Nothing inside a preview takes focus", (await page.$$("[role=img] :is(a, button, input, [tabindex])")).length === 0);
await open("/templates/kinetic");
check("Template page sample is labelled", (await page.$eval(".resume-paper", (el) => el.getAttribute("aria-label"))) === "Sample resume using the Kinetic template");
await open("/");
check("Home previews are labelled", await page.$$eval(".resume-paper", (els) => els.length > 0 && els.every((el) => el.getAttribute("role") === "img" && el.getAttribute("aria-label"))));

// Visible focus
for (const route of ["/", "/templates", "/editor"]) {
  await open(route);
  const missing = new Set();
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const ring = (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
      const cardRing = el.classList.contains("card-open") && el.closest("article") !== null;
      return ring || cardRing ? null : (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30);
    });
    if (result) missing.add(result);
  }
  check(`Focus is visible on ${route}`, missing.size === 0, [...missing].join(" | "));
}

// Focus after dialogs
await open("/editor");
await page.waitForSelector("select");
const pdfButton = await page.evaluateHandle(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")));
await pdfButton.focus();
await page.keyboard.press("Enter");
await page.waitForSelector("dialog[open]");
await sleep(150);
check("A dialog takes focus", await page.evaluate(() => document.activeElement.closest("dialog[open]") !== null));
await page.keyboard.press("Escape");
await sleep(250);
check("Closing a dialog returns focus to its button", await page.evaluate(() => document.activeElement.textContent.includes("PDF")));

// The PDF keeps the name as its main heading
await page.evaluate(() => {
  window.__printed = 0;
  window.print = () => window.__printed++;
  [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click();
});
await sleep(100);
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click());
await page.waitForFunction(() => window.__printed > 0);
check("The print copy keeps one h1", (await page.$$eval(".print-root h1", (els) => els.length)) === 1);
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));

// Long emails wrap at the @ or a dot, and short ones are left as a single run of text
const email = "alexandra.montgomery@examplemail.com";
const url = "https://alexandra.example.com/portfolio/work?year=2024";
const shortUrl = "linkedin.com/in/alexandra";
await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
await page.evaluate((address, long, short) => {
  const resume = { schemaVersion: 2, id: "r", name: "Mail", createdAt: 1, updatedAt: 2, lastBackupAt: 9, profile: { fullName: "Mail Test", jobTitle: "", email: address, phone: "", location: "", website: long, linkedin: short }, sections: [], design: { templateId: "sterling", pageSize: "letter" } };
  localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [resume] }));
  localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "r", zoom: "fit" }));
}, email, url, shortUrl);
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector(".resume-page");
await sleep(500);
const breaks = (text) => page.$eval(".resume-page", (el, value) => [...el.querySelectorAll("li, span")].filter((item) => item.textContent === value).pop()?.querySelectorAll("wbr").length ?? -1, text);
check("A long email keeps its text and gains break points", (await breaks(email)) === 3, String(await breaks(email)));
check("A long URL keeps its text and gains break points", (await breaks(url)) === 7, String(await breaks(url)));
check("A short URL stays one run of text", (await breaks(shortUrl)) === 0, String(await breaks(shortUrl)));
await page.close();

// Touch targets on a phone
const phone = await browser.newPage();
await phone.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const small = [];
for (const route of ["/", "/templates/professional", "/free", "/about", "/editor"]) {
  await phone.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
  await sleep(300);
  small.push(...(await phone.evaluate((route) => [...document.querySelectorAll("a, button, input:not([type=radio]):not([type=checkbox]), select, [role=tab]")]
    // Inline links in a sentence are exempt, and carousel dots stay 24px because nine won't fit beside the arrows.
    .filter((el) => el.offsetParent && !el.closest(".sr-only") && !el.classList.contains("sr-only") && !el.closest("p") && !el.getAttribute("aria-label")?.startsWith("Go to template"))
    .map((el) => [el, el.getBoundingClientRect()])
    .filter(([, box]) => box.width > 2 && (box.height < 40 || box.width < 40))
    .map(([el, box]) => `${route} ${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 24)} ${Math.round(box.width)}x${Math.round(box.height)}`), route)));
}
check("Touch targets are at least 40px on a phone", small.length === 0, small.slice(0, 12).join(" | "));

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

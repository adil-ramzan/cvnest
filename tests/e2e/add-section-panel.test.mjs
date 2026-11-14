// The Content tab's "Add section" opens its choices in the page, directly under the
// button and as wide as it, the same way the section cards open (--accordion-duration).
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Add section panel: in the page under the button, keyboard and choosing");
const browser = await launch();
const errors = [];
/** --accordion-duration; waits are relative to it. */
const D = 700;

const resume = {
  schemaVersion: 2, id: "panel", name: "Panel", createdAt: 1, updatedAt: 2,
  profile: { fullName: "Panel Tester", jobTitle: "Analyst", email: "panel@example.com", phone: "", location: "Austin, TX" },
  sections: [
    { id: "s", type: "summary", title: "Profile", visible: true, content: "A short profile." },
    { id: "x", type: "experience", title: "Experience", visible: true, entries: [{ id: "x0", role: "Analyst", company: "Northwind", highlights: ["Built dashboards."] }] },
  ],
  design: { templateId: "professional", pageSize: "letter" },
};

const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
async function open(size, data = resume) {
  await page.setViewport(size);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((r) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] })); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: r.id, zoom: "fit" })); }, data);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("button[aria-controls][aria-expanded]");
  await sleep(300);
}
const BUTTON = "xpath///button[normalize-space()='Add section']";
const toggle = () => page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add section").click());
const state = () => page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add section");
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  const card = panel.querySelector(".rounded-\\[22px\\]");
  const b = button.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const preview = document.querySelector("[aria-label='Resume preview']")?.getBoundingClientRect();
  const pad = getComputedStyle(document.documentElement);
  const rows = [...panel.querySelectorAll("li button")];
  return {
    expanded: button.getAttribute("aria-expanded"), inert: panel.inert, visibility: getComputedStyle(panel).visibility,
    height: Math.round(p.height), full: panel.firstElementChild.scrollHeight,
    below: Math.round(p.top - b.bottom), widths: [Math.round(c.width), Math.round(b.width)], lefts: [Math.round(c.left), Math.round(b.left)],
    cardBottom: Math.round(c.bottom), freeBottom: Math.round(innerHeight - (parseFloat(pad.scrollPaddingBottom) || 0)),
    preview: preview && preview.width ? [preview.top, preview.left, preview.width, preview.height].map(Math.round).join(",") : "hidden",
    plus: getComputedStyle(button.querySelector("svg")).rotate,
    rows: rows.map((r) => r.textContent.trim()), shortRows: rows.filter((r) => r.getBoundingClientRect().height < 44).length,
    clipped: [...panel.querySelectorAll("span")].filter((s) => s.scrollWidth > s.clientWidth + 1).length,
    overflowX: document.documentElement.scrollWidth - innerWidth,
  };
});

for (const size of [{ width: 390, height: 600 }, { width: 1440, height: 700 }]) {
  const label = `${size.width}x${size.height}`;
  await open(size);
  // Start with the button near the bottom of the screen, where the panel has to be scrolled to.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await sleep(150);
  const closed = await state();
  check(`${label}: closed panel has no height, is inert and hidden`, closed.expanded === "false" && closed.height === 0 && closed.inert && closed.visibility === "hidden", JSON.stringify(closed));
  await toggle();
  await sleep(D + 250);
  const opened = await state();
  check(`${label}: opens in the page directly below the button`, opened.expanded === "true" && opened.height === opened.full && opened.below >= 0 && opened.below <= 1, JSON.stringify({ below: opened.below, height: opened.height, full: opened.full }));
  check(`${label}: as wide as the button and aligned with it`, Math.abs(opened.widths[0] - opened.widths[1]) <= 1 && Math.abs(opened.lefts[0] - opened.lefts[1]) <= 1, JSON.stringify({ widths: opened.widths, lefts: opened.lefts }));
  // The page scrolls to show the panel, but never past the button; on a short phone screen the
  // last options are then one scroll away.
  check(`${label}: the button stays in view and the panel starts in view`, opened.below === 0 && opened.cardBottom - opened.height < opened.freeBottom, JSON.stringify({ cardBottom: opened.cardBottom, freeBottom: opened.freeBottom }));
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await sleep(150);
  const scrolled = await state();
  check(`${label}: every option can be scrolled into view`, scrolled.cardBottom <= scrolled.freeBottom, JSON.stringify({ cardBottom: scrolled.cardBottom, freeBottom: scrolled.freeBottom }));
  check(`${label}: the preview didn't move`, scrolled.preview === closed.preview, `${closed.preview} → ${opened.preview}`);
  check(`${label}: rows 44px or taller, nothing cut off, no sideways scroll`, opened.shortRows === 0 && opened.clipped === 0 && opened.overflowX <= 0, JSON.stringify({ shortRows: opened.shortRows, clipped: opened.clipped, overflowX: opened.overflowX }));
  check(`${label}: the "+" has turned into an "×"`, closed.plus === "none" && opened.plus === "45deg", `${closed.plus} → ${opened.plus}`);
}

// Keyboard: arrows move, Escape closes and returns focus
await open({ width: 1440, height: 700 });
await page.focus(BUTTON);
await page.keyboard.press("Enter");
await sleep(D + 250);
await page.keyboard.press("Tab");
const first = await page.evaluate(() => document.activeElement.textContent.trim());
await page.keyboard.press("ArrowDown");
const second = await page.evaluate(() => document.activeElement.textContent.trim());
await page.keyboard.press("ArrowUp");
await page.keyboard.press("ArrowUp");
const wrapped = await page.evaluate(() => document.activeElement.textContent.trim());
check("Tab enters the options; arrow keys move between them and wrap", first !== second && wrapped.startsWith("Custom section"), `${first} | ${second} | ${wrapped}`);
await page.keyboard.press("Escape");
await sleep(D + 250);
const escaped = await state();
const focusAfter = await page.evaluate(() => document.activeElement.textContent.trim());
check("Escape closes the panel and returns focus to the button", escaped.expanded === "false" && escaped.height === 0 && focusAfter === "Add section", `${escaped.expanded} ${escaped.height} ${focusAfter}`);

// Reversing mid-way turns around from the current height; rapid clicks settle
await toggle();
await sleep(280);
const mid = (await state()).height;
await toggle();
await sleep(60);
const turning = (await state()).height;
await sleep(D + 250);
check("Reversing mid-open shrinks from the current height", mid > 0 && turning > 0 && turning <= mid + 40 && (await state()).height === 0, `${mid} → ${turning} → 0`);
for (let i = 0; i < 5; i++) { await toggle(); await sleep(70); }
await sleep(D + 300);
const rapid = await state();
check("After rapid clicks the panel ends fully open", rapid.expanded === "true" && rapid.height === rapid.full, JSON.stringify({ expanded: rapid.expanded, height: rapid.height, full: rapid.full }));

// Choosing adds the section, closes the panel and shows the new card
await page.evaluate(() => [...document.querySelectorAll("li button")].find((b) => b.textContent.trim() === "Awards").click());
await sleep(D + 300);
const chosen = await page.evaluate(() => {
  const header = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((b) => b.textContent.includes("Awards"));
  const box = header?.closest("section").getBoundingClientRect();
  return { stored: JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].sections.map((s) => s.type), open: header?.getAttribute("aria-expanded"), inView: !!box && box.top >= 0 && box.top < innerHeight };
});
const afterChoose = await state();
check("Choosing an option adds that section, opened and in view", chosen.stored.includes("awards") && chosen.open === "true" && chosen.inView, JSON.stringify(chosen));
check("…and closes the panel", afterChoose.expanded === "false" && afterChoose.height === 0 && !afterChoose.rows.includes("Awards"));

// Reduced motion: instant
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await toggle();
await sleep(60);
const instant = await state();
check("With reduced motion the panel opens at once", instant.height === instant.full && instant.visibility === "visible");
await toggle();
await sleep(60);
check("…and closes at once", (await state()).height === 0);
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

// Every optional section added
const everything = { ...resume, sections: [...resume.sections, ...["education", "skills", "projects", "certifications", "languages", "awards", "volunteering"].map((type) => ({ id: type, type, title: type, visible: true, entries: [] }))] };
await open({ width: 1440, height: 700 }, everything);
await toggle();
await sleep(D + 250);
const full = await page.evaluate(() => { const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add section"); return document.getElementById(button.getAttribute("aria-controls")).innerText; });
check("With every optional section added, the panel says so (custom sections can still be added)", full.includes("All sections added") && full.includes("Custom section"), full.replace(/\s+/g, " "));

check("No page errors", errors.length === 0, errors.join(" | "));
await browser.close();

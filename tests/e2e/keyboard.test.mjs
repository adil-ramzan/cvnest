// The whole entry flow with the keyboard only, checking focus after every action,
// plus visible focus rings on every control and real layout width on phones.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Keyboard flow, focus rings and phone width");
const browser = await launch();
const resume = { schemaVersion: 2, id: "r", name: "K", createdAt: 1, updatedAt: 2, profile: { fullName: "Key Board", jobTitle: "", email: "", phone: "", location: "" },
  sections: [{ id: "x", type: "experience", title: "Experience", visible: true, entries: [{ id: "a", role: "First job", company: "A", highlights: [] }, { id: "b", role: "Second job", company: "B", highlights: [] }] }], design: { templateId: "minimal", pageSize: "letter" } };
async function open(viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "r", zoom: "fit" })); }, JSON.stringify({ schemaVersion: 2, resumes: [resume] }));
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);
  return page;
}
let page = await open({ width: 1440, height: 900 });
const active = () => page.evaluate(() => { const a = document.activeElement; return `${a.getAttribute("aria-label") ?? ""} ${a.textContent}`.trim(); });
const roles = () => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].sections[0].entries.map((e) => `${e.role}${e.hidden ? " (hidden)" : ""}`));
const tabTo = async (text, shift = false) => {
  if (shift) await page.keyboard.down("Shift");
  for (let i = 0; i < 40 && !(await active()).includes(text); i++) await page.keyboard.press("Tab");
  if (shift) await page.keyboard.up("Shift");
  return (await active()).includes(text);
};
await page.evaluate(() => document.querySelector("a[href='/']").focus());
check("Tab reaches the section", await tabTo("Experience"));
await page.keyboard.press("Enter");
await sleep(700);
check("Tab reaches Add entry", await tabTo("Add position"));
await page.keyboard.press("Enter");
await sleep(300);
check("New form takes focus", (await page.evaluate(() => document.activeElement.tagName)) === "INPUT");
await page.keyboard.type("Third job");
await page.keyboard.press("Escape");
await sleep(300);
check("Escape closes the form and returns to the row", (await active()).includes("Third job") && (await page.$("li input")) === null);
await page.keyboard.press("Enter");
await sleep(300);
for (let i = 0; i < 6 && (await page.evaluate(() => document.activeElement.tagName)) !== "INPUT"; i++) await page.keyboard.press("Tab");
await page.keyboard.press("End");
await page.keyboard.type(" edited");
check("Tab reaches Save", await tabTo("Save"));
await page.keyboard.press("Enter");
await sleep(700);
check("Save keeps the edit and returns to the row", (await active()).includes("edited") && (await roles()).at(-1).includes("edited"), (await roles()).join());
check("Shift+Tab reaches the drag handle", await tabTo("Reorder", true));
await page.keyboard.press("ArrowUp");
await sleep(700);
check("Arrow key reorders and keeps focus", (await roles())[1].includes("Third") && (await active()).includes("Reorder"), (await roles()).join());
check("Tab reaches the eye", await tabTo("Hide"));
await page.keyboard.press("Enter");
await sleep(700);
check("Enter hides the entry and keeps focus", (await roles())[1].includes("(hidden)") && (await active()).includes("Show"));
await page.keyboard.press("Enter");
await sleep(700);
await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
await page.keyboard.press("Enter");
await sleep(300);
check("Tab reaches delete", await tabTo("Delete position"));
await page.keyboard.press("Enter");
await sleep(500);
check("Delete removes the entry and focuses Undo", (await roles()).length === 2 && (await active()) === "Undo", `${(await roles()).join()} | ${await active()}`);
await page.keyboard.press("Enter");
await sleep(700);
check("Undo restores it in place and returns to the list", (await roles()).length === 3 && (await roles())[1].includes("Third") && /job/.test(await active()), `${(await roles()).join()} | ${await active()}`);

// Focus stays visible above the sticky header
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
await sleep(200);
await page.evaluate(() => [...document.querySelectorAll("h2 button")].at(0).focus());
await sleep(500);
check("Focused control isn't hidden behind the sticky header", await page.evaluate(() => document.activeElement.getBoundingClientRect().top >= document.querySelector("header").getBoundingClientRect().bottom));

// Rings
await page.evaluate(() => document.querySelector("a[href='/']").focus());
const noRing = [];
const seen = new Set();
for (let i = 0; i < 45; i++) {
  await page.keyboard.press("Tab");
  const info = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { name: (a.getAttribute("aria-label") ?? a.textContent ?? a.tagName).slice(0, 30), ring: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, body: a === document.body }; });
  if (info.body) break;
  seen.add(info.name);
  if (!info.ring) noRing.push(info.name);
}
check("Every control shows a focus ring", noRing.length === 0 && seen.size > 15, `${seen.size} controls; none on: ${noRing.join(", ")}`);
await page.close();

// Phones: real layout width, with forms open
for (const width of [320, 360, 390]) {
  page = await open({ width, height: 780, isMobile: true, hasTouch: true });
  const wide = () => page.evaluate(() => Math.max(innerWidth, document.documentElement.scrollWidth));
  const results = [await wide()];
  await page.click("[aria-controls='personal-form']");
  await sleep(300);
  results.push(await wide());
  await page.evaluate(() => [...document.querySelectorAll("h2 button")].find((b) => /Experience/.test(b.textContent)).click());
  await sleep(700);
  await page.evaluate(() => document.querySelector("li button[aria-expanded]").click());
  await sleep(300);
  results.push(await wide());
  check(`No sideways scroll at ${width}px with forms open`, results.every((w) => w === width), results.join(","));
  await page.close();
}
await browser.close();

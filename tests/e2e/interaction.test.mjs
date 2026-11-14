// Editor controls read as interactive: every enabled control changes when hovered (unless
// it's the chosen option), shows a pointer, and keeps a visible keyboard focus. Chrome runs
// with a mouse-like pointer here: headless Chrome otherwise reports no hover, and Tailwind
// only applies hover styles under (hover: hover).
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Interaction feedback: hover, pointer and focus on editor controls");
const browser = await launch(["--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"]);
const errors = [];

const entry = (id, name) => ({ id, name, proficiency: "Native" });
const resume = (id, name) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: "Hover Tester", jobTitle: "Analyst", email: "hover@example.com", phone: "", location: "" },
  sections: [
    { id: `${id}s`, type: "summary", title: "Profile", visible: true, content: "A short profile." },
    { id: `${id}l`, type: "languages", title: "Languages", visible: true, entries: [entry(`${id}a`, "English"), entry(`${id}b`, "Spanish")] },
  ],
  design: { templateId: "professional", pageSize: "letter" },
});

const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
await page.evaluate((list) => {
  localStorage.clear();
  localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: list }));
  localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: list[0].id, zoom: "fit" }));
}, [resume("a", "First"), resume("b", "Second")]);
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector("[role=tab]");
await sleep(500);

check("Chrome reports a hover-capable pointer for this run", await page.evaluate(() => matchMedia("(hover: hover)").matches));

/** Everything that can change a control's look, for it and its first descendants. */
const look = (el) => [el, ...el.querySelectorAll("*")].slice(0, 40).map((n) => {
  const s = getComputedStyle(n);
  return [s.color, s.backgroundColor, s.borderTopColor, s.boxShadow, s.textDecorationLine, s.opacity, s.outlineStyle, s.transform].join("|");
}).join("~");

/** Enabled controls in view that don't change on hover, aren't the chosen option, or lack the pointer. */
async function audit() {
  await page.evaluate(() => {
    let i = 0;
    for (const el of document.querySelectorAll("[data-hover-audit]")) el.removeAttribute("data-hover-audit");
    for (const el of document.querySelectorAll("button, [role=tab], [role^=menuitem], label:has(> input[type=radio]), label:has(> input[type=color])")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || el.closest("[aria-hidden=true], .resume-paper") || el.disabled) continue;
      el.setAttribute("data-hover-audit", String(++i));
    }
  });
  const ids = await page.$$eval("[data-hover-audit]", (els) => els.map((e) => e.getAttribute("data-hover-audit")));
  const noHover = [];
  const noPointer = [];
  for (const id of ids) {
    const sel = `[data-hover-audit="${id}"]`;
    const info = await page.$eval(sel, (el) => ({
      name: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      // The chosen option, or a menu item already highlighted because it has focus.
      chosen: el.matches("[aria-pressed=true], [aria-selected=true], [aria-checked=true], [aria-current]") || !!el.querySelector("input:checked") || (el.matches("[role^=menuitem]") && el === document.activeElement),
      cursor: getComputedStyle(el).cursor,
      grab: el.matches(".cursor-grab"),
    }));
    if (!["pointer", "grab"].includes(info.cursor)) noPointer.push(`${info.name} (${info.cursor})`);
    if (info.chosen) continue;
    await page.mouse.move(1, 1);
    await page.$eval(sel, (el) => el.scrollIntoView({ block: "center" }));
    await sleep(40);
    const before = await page.$eval(sel, look);
    await page.hover(sel);
    await sleep(260);
    const hovered = await page.$eval(sel, (el) => el.matches(":hover"));
    const after = await page.$eval(sel, look);
    if (hovered && before === after) noHover.push(info.name);
  }
  await page.mouse.move(1, 1);
  return { count: ids.length, noHover, noPointer };
}
const tab = (name) => page.evaluate((n) => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent.trim() === n).click(), name);

// ---- Content tab, with a section open so its entry rows show
await tab("Content");
await page.evaluate(() => [...document.querySelectorAll("h2 > button[aria-expanded=false]")].find((b) => b.textContent.includes("Languages"))?.click());
await sleep(600);
let result = await audit();
check("Content tab: every control responds to hover", result.noHover.length === 0, `${result.count} controls; none on: ${result.noHover.join(", ")}`);
check("Content tab: controls show a pointer (drag handles a grab cursor)", result.noPointer.length === 0, result.noPointer.join(", "));

// ---- Overview tab: checklist rows, resume list and backup buttons
await tab("Overview");
await sleep(400);
result = await audit();
check("Overview tab: every control responds to hover", result.noHover.length === 0, `${result.count} controls; none on: ${result.noHover.join(", ")}`);
check("Overview tab: controls show a pointer", result.noPointer.length === 0, result.noPointer.join(", "));

// ---- Customize tab: colors, fonts, sizes, templates and page size
await tab("Customize");
await sleep(500);
result = await audit();
check("Customize tab: every control responds to hover", result.noHover.length === 0, `${result.count} controls; none on: ${result.noHover.join(", ")}`);
check("Customize tab: controls show a pointer", result.noPointer.length === 0, result.noPointer.join(", "));

// ---- Menus
await page.click("[aria-label='More actions']");
await page.waitForSelector("[role=menu]");
result = await audit();
check("More actions menu: every item responds to hover", result.noHover.length === 0, result.noHover.join(", "));
await page.keyboard.press("Escape");
await page.click("[aria-label^='Switch resume']");
await page.waitForSelector("[role=menu]");
result = await audit();
check("Resume menu: every item responds to hover", result.noHover.length === 0, result.noHover.join(", "));
await page.keyboard.press("Escape");

// ---- Disabled controls look and act disabled
await page.evaluate(() => {
  const stored = JSON.parse(localStorage.getItem("folio.resumes.v2"));
  stored.resumes[0].design.templateId = "classic"; // a template that never draws an accent color
  localStorage.setItem("folio.resumes.v2", JSON.stringify(stored));
});
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector("[role=tab]");
await tab("Customize");
await sleep(400);
const swatch = await page.$eval("[aria-label=Navy]", (el) => ({ disabled: el.disabled, cursor: getComputedStyle(el).cursor, opacity: Number(getComputedStyle(el).opacity) }));
check("Disabled controls are disabled, dimmed and show not-allowed", swatch.disabled && swatch.opacity < 1 && swatch.cursor === "not-allowed", JSON.stringify(swatch));

// ---- Keyboard focus stays visible on the changed controls
await tab("Overview");
await sleep(300);
const focusRing = await page.evaluate(() => {
  const row = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Edit") && b.closest("li"));
  row.focus({ focusVisible: true });
  const s = getComputedStyle(row);
  return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
});
check("Checklist rows keep a visible focus ring", focusRing);

check("No page errors", errors.length === 0, errors.join(" | "));
await browser.close();

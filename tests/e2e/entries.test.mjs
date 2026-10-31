// Entry rows in the editor: adding, editing, Cancel, hiding and reordering, plus
// the sample shown for an empty resume.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Entry rows: add, edit, Cancel, hide, reorder, sample data");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const job = (id, role) => ({ id, role, company: "Acme", highlights: ["Shipped things"] });
const resume = {
  schemaVersion: 2, id: "r", name: "R", createdAt: 1, updatedAt: 2,
  profile: { fullName: "Rowan Tester", jobTitle: "Tester", email: "", phone: "", location: "" },
  sections: [{ id: "x", type: "experience", title: "Experience", visible: true, entries: [job("a", "First role"), job("b", "Second role"), job("c", "Third role")] }],
  design: { templateId: "minimal", pageSize: "letter" },
};
const seed = async (resumes) => {
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((v) => { localStorage.clear(); if (v) { localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "r", zoom: "fit" })); } }, resumes && JSON.stringify({ schemaVersion: 2, resumes }));
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);
};
const entries = () => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].sections.find((s) => s.type === "experience").entries);
const roles = async () => (await entries()).map((e) => e.role);
const preview = () => page.$eval("[aria-label='Resume preview']", (el) => el.textContent);
const clickButton = (text) => page.evaluate((t) => [...document.querySelectorAll("li button, button")].find((b) => b.textContent.trim() === t && b.offsetParent).click(), text);
const openExperience = async () => {
  await page.evaluate(() => [...document.querySelectorAll("h2 button")].find((b) => /Experience/.test(b.textContent)).click());
  await sleep(200);
};
const openRow = async (role) => {
  await page.evaluate((r) => [...document.querySelectorAll("li button[aria-expanded]")].find((b) => b.textContent.includes(r)).click(), role);
  await sleep(200);
};

await seed([resume]);
await openExperience();
check("Rows show role and company", await page.$$eval("li button[aria-expanded]", (bs) => bs.length === 3 && bs[0].textContent.includes("First role") && bs[0].textContent.includes("Acme")));
check("Sections are collapsed until opened, one at a time", (await page.$$eval("h2 button[aria-expanded='true']", (b) => b.length)) === 1);

// Edit, then Cancel
await openRow("First role");
await page.locator("::-p-aria(Job title)").fill("Typed role");
await sleep(700);
check("Edits reach the preview while typing", (await preview()).includes("Typed role"));
check("Edits autosave while typing", (await roles())[0] === "Typed role");
await clickButton("Cancel");
await sleep(700);
check("Cancel restores the entry", (await roles())[0] === "First role" && !(await preview()).includes("Typed role"));

// Edit, then Save
await openRow("First role");
await page.locator("::-p-aria(Job title)").fill("Saved role");
await clickButton("Save");
await sleep(700);
check("Save keeps the edit and closes the form", (await roles())[0] === "Saved role" && (await page.$("li input")) === null);

// Add
await page.locator("::-p-aria(Add position)").click();
await sleep(200);
await page.locator("::-p-aria(Job title)").fill("Added role");
await clickButton("Save");
await sleep(700);
check("Add entry creates a row at the end", (await roles()).at(-1) === "Added role");
await page.locator("::-p-aria(Add position)").click();
await sleep(700);
await clickButton("Cancel");
await sleep(700);
check("Cancel on a new entry removes it", (await roles()).length === 4);

// Delete and undo
await openRow("Second role");
await page.click("button[aria-label='Delete position']");
await sleep(700);
check("Delete removes the entry and offers Undo", !(await roles()).includes("Second role") && (await page.$eval("body", (el) => el.innerText)).includes("“Second role” deleted"));
await clickButton("Undo");
await sleep(700);
check("Undo restores it in its original position", (await roles())[1] === "Second role" && (await roles()).length === 4, (await roles()).join());
await openRow("Third role");
await page.click("button[aria-label='Delete position']");
await sleep(300);
await page.keyboard.press("Escape");
await sleep(700);
check("Escape dismisses Undo and keeps the deletion", !(await roles()).includes("Third role") && !(await page.$eval("body", (el) => el.innerText)).includes("Undo"));
await page.locator("::-p-aria(Add position)").click();
await sleep(200);
await page.locator("::-p-aria(Job title)").fill("Third role");
await clickButton("Save");
await sleep(700);

// Eye toggle
await page.click("button[aria-label='Hide Second role from resume']");
await sleep(700);
check("Hide stores the optional field", (await entries())[1].hidden === true);
check("Hidden entry leaves the preview", !(await preview()).includes("Second role"));
check("Button reports its state", await page.$eval("button[aria-label='Show Second role on resume']", (el) => el.getAttribute("aria-pressed") === "true"));
await page.evaluate(() => { window.__printed = 0; window.print = () => window.__printed++; [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click(); });
await page.waitForFunction(() => window.__printed > 0);
check("Hidden entry leaves the print copy", await page.$eval(".print-root", (el) => el.textContent.includes("Third role") && !el.textContent.includes("Second role")));
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
await page.waitForFunction(() => !document.querySelector(".print-root"));
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("select");
await sleep(300);
check("Hidden survives a reload", (await entries())[1].hidden === true && !(await preview()).includes("Second role"));
await openExperience();
await page.click("button[aria-label='Show Second role on resume']");
await sleep(700);
check("Show clears the field and restores the entry", !("hidden" in (await entries())[1]) && (await preview()).includes("Second role"));

// Focus
const focusLabel = () => page.evaluate(() => document.activeElement.textContent.slice(0, 40));
await openRow("Second role");
await page.locator("::-p-aria(Job title)").click();
await page.keyboard.press("Escape");
await sleep(200);
check("Escape closes the form and returns to the row", (await page.$("li input")) === null && (await focusLabel()).includes("Second role"));
await openRow("Second role");
await clickButton("Save");
await sleep(200);
check("Save returns focus to the row", (await focusLabel()).includes("Second role"));
await openRow("Second role");
await clickButton("Cancel");
await sleep(200);
check("Cancel returns focus to the row", (await focusLabel()).includes("Second role"));
await openRow("Added role");
await page.click("button[aria-label='Delete position']");
await sleep(300);
check("Delete moves focus to the Undo action", (await focusLabel()) === "Undo");
await page.keyboard.press("Enter");
await sleep(700);
check("Undo returns focus to a row", (await page.evaluate(() => document.activeElement.getAttribute("aria-expanded"))) !== null);
await page.click("button[aria-label='Hide Second role from resume']");
await sleep(200);
check("Hide is announced", await page.$$eval("[role=status]", (els) => els.some((el) => el.textContent.includes("Second role hidden from resume"))));
await page.click("button[aria-label='Show Second role on resume']");
await sleep(500);

// Keyboard reorder
await page.focus("[aria-label^='Reorder Saved role']");
await page.keyboard.press("ArrowDown");
await sleep(700);
check("Arrow key moves the entry", (await roles()).slice(0, 2).join() === "Second role,Saved role", (await roles()).join());
check("Focus stays on the moved handle", await page.evaluate(() => document.activeElement.getAttribute("aria-label")?.startsWith("Reorder Saved role")));
check("Move is announced", await page.$$eval("[role=status]", (els) => els.some((el) => el.textContent.includes("position 2"))));
await page.keyboard.press("ArrowUp");
await sleep(700);
check("Arrow up moves it back", (await roles())[0] === "Saved role");

// Empty resume
await seed(null);
check("Empty resume previews the sample", (await preview()).includes("Load sample data"));
check("Nothing in the sample can take focus", await page.$eval("[aria-label='Resume preview'] [aria-hidden='true']", (el) => el.inert && el.querySelectorAll("a, button, input").length === 0));
await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
await page.waitForSelector("dialog[open]");
check("Download PDF warns that the resume is empty", await page.$eval("dialog[open]", (el) => el.textContent.includes("Your resume is empty") && el.textContent.includes("Download anyway")));
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Load sample data").click());
await sleep(800);
await seed(null);
await clickButton("Load sample data");
await sleep(800);
const loaded = await page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0]);
check("Load sample data fills the resume", !!loaded.profile.fullName && loaded.sections.some((s) => s.type === "experience" && s.entries.length > 0));
check("Sample notice goes away", !(await preview()).includes("Load sample data"));

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

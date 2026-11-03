// Sample content left in a real resume: the tag, when it clears, the warning before a
// PDF, and the ways past it. Also the entry form's spell-check hints and delete button.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Sample content: tags, warning, review, clear; form hints");
const browser = await launch();
const errors = [];
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("pageerror", (e) => errors.push(String(e)));
await page.evaluateOnNewDocument(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });

const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0]);
const clickText = (text, scope = "button") => page.evaluate((t, s) => [...document.querySelectorAll(s)].find((b) => b.textContent.trim() === t).click(), text, scope);
const dialogText = () => page.$eval("dialog[open]", (d) => d.textContent).catch(() => null);
const download = async () => { await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click()); await sleep(150); };
const tags = () => page.$$eval("#editor-tabpanel span", (els) => els.filter((e) => e.textContent === "Sample").length);
const printed = () => page.evaluate(() => window.__printed || 0);
const finishPrint = async () => { await page.waitForFunction((n) => (window.__printed || 0) >= n, {}, 1); await page.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await sleep(100); };
const menu = async () => { await page.click("button[aria-label='More actions']"); await sleep(80); return page.$$eval("[role^='menuitem']", (els) => els.map((e) => e.textContent.trim())); };

async function fresh(seed) {
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => { localStorage.clear(); if (v) { localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "a" })); } }, seed && JSON.stringify({ schemaVersion: 2, resumes: [seed] }));
  await page.goto(`${BASE}/editor`, { waitUntil: "load" });
  await page.waitForSelector(".resume-page");
  await sleep(500);
}
async function loadSample() {
  await fresh(null);
  await clickText("Load sample data");
  await sleep(700);
}

// ---- Marks
await loadSample();
let resume = await stored();
const skills = resume.sections.find((s) => s.type === "skills");
check("Loading the sample marks its entries", skills.entries.length > 0 && skills.entries.every((e) => e.sample === true));
check("Loading the sample marks its profile fields", resume.profile.sampleFields?.includes("email"));
check("Sample tag shows on the personal details", (await tags()) >= 1);
const paper = await page.$eval("[aria-label='Resume preview'] .resume-paper", (el) => el.textContent);
check("Sample tag never appears in the preview", !paper.includes("Sample"));

await page.reload({ waitUntil: "load" });
await page.waitForSelector(".resume-page");
await sleep(500);
resume = await stored();
check("Marks survive a reload", resume.sections.find((s) => s.type === "skills").entries.every((e) => e.sample === true));

// ---- Clearing by editing
await page.evaluate(() => document.querySelector("#section-personal button[aria-controls='personal-form']").click());
await sleep(200);
const emailBox = await page.$("#personal-form input[type='email']");
await emailBox.click({ clickCount: 3 });
await emailBox.type("me@real.example");
await sleep(700);
resume = await stored();
check("Editing a profile field clears only that field", !resume.profile.sampleFields.includes("email") && resume.profile.sampleFields.includes("fullName"));

const experience = resume.sections.find((s) => s.type === "experience");
const [firstJob, secondJob] = experience.entries;
await page.evaluate((id) => document.querySelector(`[id="section-${id}"] h2 button`).click(), experience.id);
await sleep(600);
await page.evaluate((id) => document.querySelector(`[id="sample-entry-${id}"] [aria-expanded]`).click(), firstJob.id);
await sleep(150);
await page.evaluate((id) => [...document.querySelectorAll(`[id="entry-${id}"] button`)].find((b) => b.textContent === "Save").click(), firstJob.id);
await sleep(600);
check("Opening and saving without an edit keeps the mark", (await stored()).sections.find((s) => s.id === experience.id).entries[0].sample === true);
await page.evaluate((id) => document.querySelector(`[id="sample-entry-${id}"] [aria-expanded]`).click(), firstJob.id);
await sleep(150);
const roleBox = await page.$(`[id="entry-${firstJob.id}"] input`);
await roleBox.click({ clickCount: 3 });
await roleBox.type("Real role");
await sleep(600);
let entries = (await stored()).sections.find((s) => s.id === experience.id).entries;
check("Editing an entry clears its mark and no other's", entries[0].sample === undefined && entries[1].sample === true);
check("Tag leaves the edited row", !(await page.$(`[id="sample-entry-${firstJob.id}"]`)) && !!(await page.$(`[id="sample-entry-${secondJob.id}"]`)));
await page.evaluate((id) => [...document.querySelectorAll(`[id="entry-${id}"] button`)].find((b) => b.textContent === "Cancel").click(), firstJob.id);
await sleep(600);
entries = (await stored()).sections.find((s) => s.id === experience.id).entries;
check("Cancel puts the sample text and its mark back", entries[0].sample === true && entries[0].role === firstJob.role);

// ---- Warning
await download();
const warning = await dialogText();
check("Download warns with the agreed wording", warning?.includes("This resume still contains sample content.") && warning.includes("Review it before downloading."), String(warning).slice(0, 90));
check("Warning offers all three ways on", ["Download anyway", "Review", "Clear sample content"].every((t) => warning.includes(t)));
check("Warning stops the print until answered", (await printed()) === 0);
await clickText("Download anyway");
await finishPrint();
check("Download anyway prints", (await printed()) === 1);

await page.evaluate(() => [...document.querySelectorAll("[role='tab']")].find((t) => t.textContent.includes("Overview")).click());
await sleep(100);
await download();
await clickText("Review");
await sleep(900);
const review = await page.evaluate(() => {
  const box = document.querySelector("#section-personal").getBoundingClientRect();
  return { tab: document.querySelector("[role='tab'][aria-selected='true']").textContent.trim(), onScreen: box.bottom > 0 && box.top < innerHeight, open: !document.querySelector("#personal-form").hidden, dialog: !!document.querySelector("dialog[open]") };
});
check("Review closes the warning and opens the first sample content", review.tab === "Content" && review.onScreen && review.open && !review.dialog, JSON.stringify(review));

// Past the profile and summary, Review lands on an entry row.
const rest = await stored();
await fresh({ ...rest, id: "a", profile: { ...rest.profile, sampleFields: undefined }, sections: rest.sections.map((s) => (s.type === "summary" ? { ...s, sample: undefined } : s)) });
await download();
await clickText("Review");
await sleep(900);
const firstSample = rest.sections.find((s) => s.visible && s.entries?.some((e) => e.sample)).entries.find((e) => e.sample);
const target = await page.evaluate((id) => {
  const row = document.getElementById(`sample-entry-${id}`);
  const box = row.getBoundingClientRect();
  return { onScreen: box.top >= 0 && box.bottom <= innerHeight, focused: row.contains(document.activeElement) };
}, firstSample.id);
check("Review scrolls to the first sample entry and focuses it", target.onScreen && target.focused, JSON.stringify(target));

// ---- Clearing
await loadSample();
check("Menu offers Clear sample content", (await menu()).includes("Clear sample content"));
await page.keyboard.press("Escape");
await download();
await clickText("Clear sample content");
await sleep(700);
resume = await stored();
check("Clear from the warning removes the sample", !resume.profile.fullName && resume.sections.every((s) => !s.entries?.length));
check("Clear can be undone", !!(await page.$$eval("button", (els) => els.some((e) => e.textContent.trim() === "Undo"))));
await clickText("Undo");
await sleep(700);
resume = await stored();
check("Undo brings the sample and its marks back", !!resume.profile.fullName && resume.sections.find((s) => s.type === "skills").entries.every((e) => e.sample === true));
await menu();
await clickText("Clear sample content", "[role^='menuitem']");
await sleep(700);
check("Clear from the menu removes the sample", !(await stored()).profile.fullName);
check("Menu drops the action once nothing is left", !(await menu()).includes("Clear sample content"));
await page.keyboard.press("Escape");

// ---- Real resumes, and the leave guard's Save as PDF
const real = { schemaVersion: 2, id: "a", name: "Mine", createdAt: 1, updatedAt: 100, profile: { fullName: "Real Person", jobTitle: "", email: "", phone: "", location: "" }, sections: [{ id: "s", type: "skills", title: "Skills", visible: true, entries: [{ id: "k", name: "Welding" }] }], design: { templateId: "minimal", pageSize: "letter" } };
await fresh(real);
check("Old resumes show no tags", (await tags()) === 0);
check("Old resumes have no clear action", !(await menu()).includes("Clear sample content"));
await page.keyboard.press("Escape");
await download();
check("Old resumes download with no warning", (await dialogText()) === null);
await finishPrint();

await fresh({ ...real, profile: { ...real.profile, sampleFields: ["fullName"] } });
await page.click("header a[href='/']");
await page.waitForSelector("dialog[open]");
await clickText("Save as PDF");
await sleep(250);
check("The leave guard's Save as PDF warns too", (await dialogText())?.includes("still contains sample content") && (await printed()) === 0);
await clickText("Download anyway");
await finishPrint();
check("And can be bypassed", (await printed()) === 1);

// ---- Form hints
await fresh({ ...real, sections: [{ id: "p", type: "projects", title: "Projects", visible: true, entries: [{ id: "pe", name: "Thing", description: "Text" }] }] });
await page.evaluate(() => document.querySelector("[id='section-p'] h2 button").click());
await sleep(500);
await page.evaluate(() => document.querySelector("[aria-controls='entry-pe']").click());
await sleep(150);
const form = await page.evaluate(() => {
  const body = document.getElementById("entry-pe");
  const field = (label) => { const l = [...body.querySelectorAll("label")].find((e) => e.textContent.trim() === label); return document.getElementById(l.htmlFor); };
  const name = field("Project name"), about = field("Description"), link = field("Link");
  const del = body.querySelector("button[aria-label^='Delete']").getBoundingClientRect();
  return { name: [name.spellcheck, name.lang], about: [about.spellcheck, about.lang], linkLang: link.getAttribute("spellcheck"), del: [del.width, del.height], label: body.querySelector("button[aria-label^='Delete']").getAttribute("aria-label") };
});
check("Title fields ask for spell check", form.name[0] === true && form.name[1] === "en", String(form.name));
check("Description fields ask for spell check", form.about[0] === true && form.about[1] === "en", String(form.about));
check("Links are left alone", form.linkLang === null);
check("Delete button has at least a 40px hit area", form.del[0] >= 40 && form.del[1] >= 40, form.del.join("x"));
check("Delete button has an accessible name", form.label === "Delete project", form.label);
const box = await page.$("[id='entry-pe'] textarea");
await box.click({ clickCount: 3 });
await box.type("speling mistaek");
await sleep(600);
check("Spell check never blocks input", (await stored()).sections[0].entries[0].description.includes("speling mistaek"));

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
process.exit(0);

// Protecting resume data: backup and restore, limits, storage failures and
// a second tab.
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Data safety: backup, restore, limits, storage full, two tabs");
const browser = await launch();
const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8");
const errors = [];

const resume = (id, name, extra = {}) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: `${name} Person`, jobTitle: "Tester", email: "", phone: "", location: "" },
  sections: [{ id: `${id}s`, type: "summary", title: "Profile", visible: true, content: "Hello" }],
  design: { templateId: "minimal", pageSize: "letter" }, ...extra,
});
async function open(resumes, context = browser) {
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { window.__download = blob; return create(blob); };
  });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((v) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "a", zoom: "fit" })); }, JSON.stringify({ schemaVersion: 2, resumes }));
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);
  return page;
}
const panel = (page) => page.$eval("[role=tabpanel]", (el) => el.innerText);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes);
const clickText = (page, text, scope = "button") => page.evaluate((t, s) => [...document.querySelectorAll(s)].find((b) => b.textContent.trim() === t && (b.offsetParent || b.closest("dialog"))).click(), text, scope);
const menu = async (page, item) => {
  await page.click("[aria-label='More actions']");
  await page.waitForSelector("[role=menu]");
  await clickText(page, item, "[role=menu] button");
};
const backupText = (page) => page.evaluate(() => window.__download.text());
const restoreFile = async (page, text) => {
  const file = path.join(OUT, "test-backup.json");
  fs.writeFileSync(file, text);
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  await sleep(100);
};

// ---- Reminder, backup
let page = await open([resume("a", "Alpha", { profile: { ...resume("a", "Alpha").profile, photo: { id: "ph", mimeType: "image/jpeg", width: 400, height: 400, byteSize: 9000, updatedAt: 1, inlineData: photo } } }), resume("b", "Beta")]);
check("Reminder shows for a resume with content", (await panel(page)).includes("Back up your resume"));
await sleep(500); // the inline photo moves to IndexedDB
await menu(page, "Download backup");
await sleep(400);
const backup = JSON.parse(await backupText(page));
check("Backup holds every resume", backup.kind === "resume-backup" && backup.schemaVersion === 2 && backup.resumes.length === 2);
check("Backup embeds the photo", backup.resumes[0].profile.photo?.inlineData?.startsWith("data:image/"));
check("Reminder goes away after a backup", !(await panel(page)).includes("Back up your resume"));
await page.locator("[role='tab']::-p-text(Overview)").click();
check("Overview shows backup actions and date", /Download backup[\s\S]*Restore from backup/.test(await panel(page)) && (await panel(page)).includes("Last backup:"));

// ---- Restore: preview, replace, merge
await restoreFile(page, JSON.stringify(backup));
let dialog = await page.$eval("dialog[open]", (el) => el.innerText);
check("Restore previews what's inside", dialog.includes("holds 2 resumes") && dialog.includes("Alpha") && dialog.includes("Beta Person"));
await clickText(page, "Restore", "dialog[open] button");
await sleep(800);
check("Merge keeps existing and adds the backup", (await stored(page)).length === 4);
await restoreFile(page, JSON.stringify({ ...backup, resumes: [backup.resumes[1]] }));
await page.evaluate(() => [...document.querySelectorAll("dialog[open] input[type=radio]")][1].click());
await sleep(100);
await clickText(page, "Replace and restore", "dialog[open] button");
await sleep(800);
let list = await stored(page);
check("Replace leaves only the backup", list.length === 1 && list[0].name === "Beta");

await restoreFile(page, JSON.stringify(backup));
await clickText(page, "Restore", "dialog[open] button");
await sleep(1200);
list = await stored(page);
const restoredAlpha = list.find((r) => r.name === "Alpha");
await page.waitForFunction(() => true);
check("Restored photo returns to browser storage", !!restoredAlpha?.profile.photo?.id);

// ---- Rejected files
await restoreFile(page, "not json");
check("Invalid file is rejected", (await page.$eval("dialog[open]", (el) => el.innerText)).includes("isn't a valid backup"));
await clickText(page, "Close", "dialog[open] button");
await restoreFile(page, JSON.stringify({ hello: "world" }));
check("Unrelated JSON is rejected", (await page.$eval("dialog[open]", (el) => el.innerText)).includes("isn't a resume backup"));
await clickText(page, "Close", "dialog[open] button");
await restoreFile(page, JSON.stringify({ ...backup, schemaVersion: 99 }));
check("Backup from a newer version is rejected", (await page.$eval("dialog[open]", (el) => el.innerText)).includes("newer version"));
await clickText(page, "Close", "dialog[open] button");
check("Rejected files change nothing", (await stored(page)).length === list.length);
await page.close();

// ---- Limits
page = await open([resume("a", "Alpha")]);
await page.evaluate(() => [...document.querySelectorAll("h2 button")].find((b) => /Profile/.test(b.textContent)).click());
await sleep(200);
const setSummary = (length) => page.evaluate((n) => { const el = document.querySelector("textarea"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, "x".repeat(n)); el.dispatchEvent(new Event("input", { bubbles: true })); }, length);
await setSummary(100);
await sleep(150);
check("No counter well under the limit", !(await panel(page)).includes("/ 10,000"));
await setSummary(9500);
await sleep(150);
check("Counter appears near the limit", (await panel(page)).includes("9,500 / 10,000"));
await setSummary(10000);
await sleep(150);
check("Message appears at the limit", (await panel(page)).includes("Limit reached: 10,000 characters maximum"));
check("Field stops further typing", await page.$eval("textarea", (el) => el.maxLength === 10000));
await page.close();

const big = "y".repeat(15000);
page = await open([resume("a", "Alpha", { sections: [{ id: "s", type: "summary", title: "Profile", visible: true, content: big }] })]);
check("Oversized content is reported", (await panel(page)).includes("Nothing has been cut") && (await panel(page)).includes("15,000 characters"));
await page.click("[aria-controls='personal-form']");
await page.locator("::-p-aria(Job title)").fill("Changed");
await sleep(800);
check("Oversized content survives a save", (await stored(page))[0].sections[0].content.length === 15000);
await page.reload({ waitUntil: "networkidle0" });
await sleep(400);
check("Oversized content survives a reload", (await stored(page))[0].sections[0].content.length === 15000 && (await page.$eval("[aria-label='Resume preview']", (el) => el.textContent.length)) > 15000);
await page.close();

// ---- Storage full
page = await open([resume("a", "Alpha")]);
await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "folio.resumes.v2") throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); }; });
await page.click("[aria-controls='personal-form']");
await page.locator("::-p-aria(Job title)").fill("Unsaved change");
await sleep(800);
let text = await panel(page);
check("Failed save shows a banner with Download backup", text.includes("aren’t saved") && text.includes("Download backup"));
await page.evaluate(() => [...document.querySelectorAll("[role=alert] button")].find((b) => b.textContent === "Download backup").click());
await sleep(400);
check("Banner backup includes the unsaved change", (await backupText(page)).includes("Unsaved change"));
await page.close();

// ---- Two tabs
const context = await browser.createBrowserContext();
page = await open([resume("a", "Alpha"), resume("b", "Beta")], context);
check("One tab shows no warning", !(await panel(page)).includes("open in another tab"));
const second = await context.newPage();
await second.setViewport({ width: 1440, height: 900 });
await second.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await sleep(600);
check("Second tab warns", (await panel(second)).includes("open in another tab"));
await sleep(5000);
check("First tab warns too", (await panel(page)).includes("open in another tab"));
await second.close();
await page.bringToFront();
await sleep(1500);
check("Warning clears when the other tab closes", !(await panel(page)).includes("open in another tab"));
await context.close();

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

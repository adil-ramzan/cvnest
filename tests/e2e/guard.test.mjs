// The unsaved changes guard: when it appears, every way out of the dialog, and
// that it never gets in the way when nothing is at risk.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Unsaved changes guard: at-risk rules, dialog, Back, beforeunload");
const browser = await launch();
const errors = [];

const base = (extra = {}) => ({
  schemaVersion: 2, id: "a", name: "Mine", createdAt: 1, updatedAt: 100,
  profile: { fullName: "Guard Tester", jobTitle: "", email: "", phone: "", location: "" }, sections: [],
  design: { templateId: "minimal", pageSize: "letter" }, ...extra,
});
async function open(resume, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    window.__unload = 0;
    const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window);
    window.addEventListener = (type, ...rest) => { if (type === "beforeunload") window.__unload++; return add(type, ...rest); };
    window.removeEventListener = (type, ...rest) => { if (type === "beforeunload") window.__unload--; return remove(type, ...rest); };
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((v) => { localStorage.clear(); if (v) { localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "a", zoom: "fit" })); } }, resume && JSON.stringify({ schemaVersion: 2, resumes: [resume] }));
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(600);
  return page;
}
const logo = "header a[href='/']";
const dialogOpen = (page) => page.$("dialog[open]").then((el) => el !== null);
const onEditor = (page) => new URL(page.url()).pathname === "/editor";
const unload = (page) => page.evaluate(() => window.__unload);
const press = (page, text) => page.evaluate((t) => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === t).click(), text);
const focused = (page) => page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 30));

// ---- Nothing at risk
let page = await open(null);
check("Empty resume registers no beforeunload", (await unload(page)) === 0);
await page.click(logo);
await page.waitForFunction(() => location.pathname === "/");
check("Empty resume leaves freely", !(await dialogOpen(page)));
await page.close();

page = await open(base({ lastBackupAt: 200 }));
check("Fully backed up resume registers no beforeunload", (await unload(page)) === 0);
await page.click(logo);
await page.waitForFunction(() => location.pathname === "/");
check("Fully backed up resume leaves freely", !(await dialogOpen(page)));
await page.close();

// ---- Dialog
page = await open(base());
check("At risk registers beforeunload", (await unload(page)) === 1);
await page.click(logo);
await page.waitForSelector("dialog[open]");
await sleep(100);
const attrs = await page.$eval("dialog[open]", (d) => ({ modal: d.getAttribute("aria-modal"), label: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent, describe: document.getElementById(d.getAttribute("aria-describedby"))?.textContent }));
check("Internal link opens the dialog", attrs.label === "Leave without saving a copy?" && onEditor(page));
check("Dialog is labelled and modal", attrs.modal === "true" && attrs.describe.includes("stored only in this browser"));
check("Focus starts on Download backup", (await focused(page)) === "Download backup");
await press(page, "Stay and keep editing");
await sleep(150);
check("Stay keeps the user here", onEditor(page) && !(await dialogOpen(page)));
check("Focus returns to the link", await page.$eval(logo, (el) => document.activeElement === el));

await page.click(logo);
await page.waitForSelector("dialog[open]");
await page.keyboard.press("Escape");
await sleep(150);
check("Escape means stay", onEditor(page) && !(await dialogOpen(page)));
check("Escape returns focus", await page.$eval(logo, (el) => document.activeElement === el));

await page.click(logo);
await page.waitForSelector("dialog[open]");
await page.mouse.click(5, 5);
await sleep(150);
check("Backdrop click means stay", onEditor(page) && !(await dialogOpen(page)));

// Ctrl-click
const newTab = new Promise((resolve) => browser.once("targetcreated", resolve));
await page.keyboard.down("Control");
await page.click(logo);
await page.keyboard.up("Control");
const target = await Promise.race([newTab, sleep(4000).then(() => null)]);
check("Ctrl-click still opens a new tab", target !== null && !(await dialogOpen(page)) && onEditor(page));
if (target) await (await target.page())?.close();
await page.bringToFront();

await page.click(logo);
await page.waitForSelector("dialog[open]");
await press(page, "Leave anyway");
await page.waitForFunction(() => location.pathname === "/");
check("Leave anyway continues the navigation", !(await dialogOpen(page)));
await page.click("header a[href='/templates']");
await page.waitForFunction(() => location.pathname === "/templates");
check("No guard on other pages", !(await dialogOpen(page)));
await page.close();

// ---- Backup and PDF release it; the next edit brings it back
page = await open(base());
await page.click(logo);
await page.waitForSelector("dialog[open]");
await press(page, "Download backup");
await page.waitForFunction(() => document.querySelector("dialog[open]")?.textContent.includes("Backup downloaded. Leave now?"));
await press(page, "Stay");
await sleep(800);
check("Backup releases the guard", (await unload(page)) === 0);
await page.click("[aria-controls='personal-form']");
await page.locator("::-p-aria(Job title)").fill("Edited after backup");
await sleep(800);
check("Next edit re-activates it", (await unload(page)) === 1);
await page.click(logo);
await page.waitForSelector("dialog[open]");
await press(page, "Save as PDF");
await page.waitForFunction(() => document.querySelector("dialog[open]")?.textContent.includes("Continue"));
await press(page, "Continue");
await page.waitForFunction(() => window.__printed > 0);
check("Save as PDF stays on the page", onEditor(page) && !(await dialogOpen(page)));
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
await sleep(800);
check("Closing the print window releases the guard", (await unload(page)) === 0);
await page.close();

// ---- Storage failing
page = await open(base({ lastBackupAt: 200 }));
await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "folio.resumes.v2") throw new DOMException("full", "QuotaExceededError"); return set.call(this, k, v); }; });
await page.click("[aria-controls='personal-form']");
await page.locator("::-p-aria(Job title)").fill("Will not save");
await sleep(800);
await page.click(logo);
await page.waitForSelector("dialog[open]");
check("Failed saving changes the message", (await page.$eval("dialog[open]", (el) => el.textContent)).includes("Saving to this browser failed"));
await page.close();

// ---- Back
page = await open(base());
await page.goBack().catch(() => {});
await sleep(500);
check("Back shows the dialog once and stays", onEditor(page) && (await dialogOpen(page)));
await press(page, "Leave anyway");
await page.waitForFunction(() => location.pathname === "/about", { timeout: 8000 }).catch(() => {});
check("Leave anyway goes back", new URL(page.url()).pathname === "/about", page.url());
await page.close();

// ---- Phone
page = await open(base(), { width: 390, height: 844, isMobile: true, hasTouch: true });
await page.click(logo);
await page.waitForSelector("dialog[open]");
await sleep(100);
check("Dialog fits a phone", await page.evaluate(() => { const d = document.querySelector("dialog[open]").getBoundingClientRect(); return d.left >= 0 && d.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }));
await page.close();

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

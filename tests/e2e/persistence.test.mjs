// Persistent storage and the backup reminder: the browser is asked to keep this site's
// storage exactly once, after the first PDF export or backup download, never on page load;
// Overview shows whether storage is protected; dismissing the reminder snoozes it for 7 days.
import { BASE, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

const check = createChecks("Persistent storage and backup reminder");
const browser = await launch();
const errors = [];
const DAY = 24 * 60 * 60 * 1000;

const resume = {
  schemaVersion: 2, id: "r1", name: "Persist", createdAt: 1, updatedAt: Date.now(),
  profile: { fullName: "Pat Persist", jobTitle: "Archivist", email: "", phone: "", location: "" },
  sections: [{ id: "s1", type: "summary", title: "Profile", visible: true, content: "Keeps things." }],
  design: { templateId: "professional", pageSize: "letter" },
};

/** Counts persist() calls in this page (and persisted() answers `granted` after a successful ask). */
const stubStorage = (answer) => {
  const calls = () => Number(sessionStorage.getItem("__persistCalls") ?? 0);
  let granted = false;
  const storage = navigator.storage;
  Object.defineProperty(storage, "persisted", { configurable: true, value: async () => granted });
  Object.defineProperty(storage, "persist", {
    configurable: true,
    value: async () => {
      sessionStorage.setItem("__persistCalls", String(calls() + 1));
      granted = answer;
      return answer;
    },
  });
  window.print = () => {
    window.__printed = (window.__printed || 0) + 1;
  };
};

async function editor({ answer = true, backupState } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(stubStorage, answer);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((r, b) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] }));
    localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: r.id, zoom: "fit" }));
    if (b) localStorage.setItem("folio.backup-state", JSON.stringify(b));
  }, resume, backupState ?? null);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(800);
  return { context, page };
}
const calls = (page) => page.evaluate(() => Number(sessionStorage.getItem("__persistCalls") ?? 0));
const backupState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("folio.backup-state") ?? "null"));
const panel = (page) => page.$eval("[role=tabpanel]", (el) => el.innerText);
const openTab = (page, name) => page.evaluate((n) => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === n).click(), name);
const downloadBackup = async (page) => {
  await page.click("[aria-label='More actions']");
  await page.waitForSelector("[role=menu]");
  await page.evaluate(() => [...document.querySelectorAll("[role=menu] button")].find((b) => b.textContent.trim() === "Download backup").click());
  await sleep(600);
};
const exportPdf = async (page) => {
  const before = await page.evaluate(() => window.__printed || 0);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForSelector("dialog[open]");
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Continue")?.click());
  await page.waitForFunction((b) => (window.__printed || 0) > b, {}, before);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await sleep(500);
};

// ---- First visit, editing, switching tabs: never asks
{
  const { context, page } = await editor();
  await page.click("[aria-controls='personal-form']");
  await page.locator("::-p-aria(Job title)").fill("Senior Archivist");
  await sleep(800);
  await openTab(page, "Overview");
  await sleep(400);
  check("First visit: persist() is never called on load, while editing or switching tabs", (await calls(page)) === 0, String(await calls(page)));
  check("Overview: says storage may be cleared before anything is asked", (await panel(page)).includes("Storage: may be cleared by the browser"));

  // ---- First backup download asks, once
  await downloadBackup(page);
  check("First backup download: persist() is called exactly once", await waitFor(async () => (await calls(page)) === 1, 3000), String(await calls(page)));
  check("The request is recorded in the existing backup-state key", typeof (await backupState(page))?.persistRequestedAt === "number");
  check("Overview: shows storage as protected once the browser agrees", await waitFor(async () => (await panel(page)).includes("Storage: your browser agreed to keep it"), 3000));

  // ---- Later actions never ask again, even after reopening
  await downloadBackup(page);
  await exportPdf(page);
  check("Later backups and PDF exports don't ask again", (await calls(page)) === 1, String(await calls(page)));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(600);
  await exportPdf(page);
  await downloadBackup(page);
  check("Nor after reloading the editor", (await calls(page)) === 1, String(await calls(page)));
  await context.close();
}

// ---- First PDF export asks (when it comes first); a refusal is shown truthfully
{
  const { context, page } = await editor({ answer: false });
  check("Fresh visit: no call", (await calls(page)) === 0);
  await exportPdf(page);
  check("First PDF export: persist() is called exactly once", await waitFor(async () => (await calls(page)) === 1, 3000), String(await calls(page)));
  await openTab(page, "Overview");
  await sleep(400);
  check("Overview: a refusal shows storage may be cleared", (await panel(page)).includes("Storage: may be cleared by the browser"));
  await downloadBackup(page);
  check("A backup after a refused request doesn't ask again", (await calls(page)) === 1);
  await context.close();
}

// ---- Reminder: dismiss snoozes for 7 days; it comes back after the snooze
{
  const { context, page } = await editor();
  check("Reminder shows for a resume with content and no backup", (await panel(page)).includes("Back up your resume"));
  await page.click("[aria-label='Dismiss: Back up your resume']");
  await sleep(300);
  const state = await backupState(page);
  check("Dismissing hides it", !(await panel(page)).includes("Back up your resume"));
  check("Dismissing snoozes it for 7 days (not for good)", state && Math.abs(state.remindAfter - (Date.now() + 7 * DAY)) < 60_000 && !("reminderDismissed" in state), JSON.stringify(state));
  check("Dismissing doesn't ask for storage protection", (await calls(page)) === 0);
  await context.close();
}
{
  const { context, page } = await editor({ backupState: { lastBackupAt: null, remindAfter: Date.now() - 1000, persistRequestedAt: null } });
  check("Reminder returns once the snooze has passed", (await panel(page)).includes("Back up your resume"));
  await context.close();
}
{
  const { context, page } = await editor({ backupState: { lastBackupAt: null, reminderDismissed: true } });
  check("A permanent dismissal saved by an older version doesn't hide it for good", (await panel(page)).includes("Back up your resume"));
  await context.close();
}
{
  const recentBackup = Date.now() - 1000;
  const { context, page } = await editor({ backupState: { lastBackupAt: recentBackup, remindAfter: null, persistRequestedAt: 1 } });
  check("After a recent backup, the reminder stays away", !(await panel(page)).includes("Back up your resume"));
  await context.close();
}
{
  const oldBackup = Date.now() - 20 * DAY; // the resume was edited just now: 20 days newer than the backup
  const { context, page } = await editor({ backupState: { lastBackupAt: oldBackup, remindAfter: null, persistRequestedAt: 1 } });
  check("Edits 14+ days newer than the last backup bring the reminder back", (await panel(page)).includes("Back up your resume"));
  await context.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

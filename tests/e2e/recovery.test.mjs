// Data-safety screens: storage full or blocked shows a recovery screen (never a blank editor,
// never a write), backup files from every data-safety state are restorable (or, for data from
// a newer version, refused with the right reason), and the recovered notice uses Notice.
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

const check = createChecks("Recovery screens and backup files from data-safety states");
const browser = await launch();
const errors = [];

const resume = (id, name) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: `${name} Person`, jobTitle: "Keeper", email: "", phone: "", location: "" },
  sections: [{ id: `${id}s`, type: "summary", title: "Profile", visible: true, content: "Kept safe." }],
  design: { templateId: "professional", pageSize: "letter" },
});

/** Records every write to localStorage and IndexedDB other than the editor's probe, and captures downloads. */
const recordWrites = () => {
  window.__writes = [];
  const set = Storage.prototype.setItem;
  const remove = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    if (k !== "folio.probe") window.__writes.push(`set ${k}`);
    return set.call(this, k, v);
  };
  Storage.prototype.removeItem = function (k) {
    if (k !== "folio.probe") window.__writes.push(`remove ${k}`);
    return remove.call(this, k);
  };
  for (const name of ["put", "add", "delete", "clear"]) {
    const original = IDBObjectStore.prototype[name];
    IDBObjectStore.prototype[name] = function (...args) {
      window.__writes.push(`idb ${name}`);
      return original.apply(this, args);
    };
  }
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    if (blob.type === "application/json") window.__download = blob;
    return create(blob);
  };
};
const probeFails = (name) => {
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === "folio.probe") throw new DOMException("refused", name);
    return set.call(this, k, v);
  };
};

async function openWith({ stored, init, initArg }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  if (stored) await page.evaluate((v) => localStorage.setItem("folio.resumes.v2", v), stored);
  await page.evaluateOnNewDocument(recordWrites);
  if (init) await page.evaluateOnNewDocument(init, initArg);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await sleep(1000);
  return { context, page };
}
const body = (page) => page.evaluate(() => document.body.innerText);
const writes = (page) => page.evaluate(() => window.__writes);
const clickButton = (page, text) => page.evaluate((t) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === t).click(), text);
const downloaded = async (page) => (await waitFor(async () => !!(await page.evaluate(() => window.__download?.size)), 5000)) ? page.evaluate(() => window.__download.text()) : "{}";

async function restoreInFreshProfile(text, name) {
  const file = path.join(OUT, name);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, text);
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  const dialog = await page.$eval("dialog[open]", (el) => el.innerText);
  return { context, page, dialog };
}

// ---- Storage full: recovery screen, read-only, downloadable
{
  const raw = JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha"), resume("b", "Beta")] });
  const { context, page } = await openWith({ stored: raw, init: probeFails, initArg: "QuotaExceededError" });
  const text = await body(page);
  check("Full: says the saved resumes are still in this browser", text.includes("Your saved resumes are still in this browser"));
  check("Full: names the real cause (full), not blocked", text.includes("is full") && !text.includes("blocking"));
  check("Full: says what to do (download, free space, reload)", text.includes("Download a backup file") && text.includes("Free up space") && text.includes("Reload"));
  check("Full: no editor and no blank resume to type into", !(await page.$("[role=tabpanel]")) && !(await page.$("select")) && !text.includes("Add your name"));
  check("Full: nothing is written on load", (await writes(page)).length === 0, (await writes(page)).join(", "));
  await clickButton(page, "Download backup file");
  const fileText = await downloaded(page);
  const file = JSON.parse(fileText);
  check("Full: the download is a backup file holding both resumes", file.kind === "resume-backup" && file.resumes?.length === 2);
  check("Full: it keeps the stored text exactly", file.storedText === raw);
  check("Full: still nothing written after downloading", (await writes(page)).length === 0, (await writes(page)).join(", "));
  check("Full: stored data is untouched", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2"))) === raw);
  const restored = await restoreInFreshProfile(fileText, "full-backup.json");
  check("Full: Restore from backup accepts that file", restored.dialog.includes("This backup holds 2 resumes"));
  await restored.context.close();
  await context.close();
}

// ---- Storage blocked or disabled: recovery screen, no download
{
  const { context, page } = await openWith({
    init: () => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "folio.probe") throw new DOMException("denied", "SecurityError");
        return set.call(this, k, v);
      };
      Storage.prototype.getItem = function () {
        throw new DOMException("denied", "SecurityError");
      };
    },
  });
  const text = await body(page);
  check("Blocked: says the saved resumes are still in this browser", text.includes("Your saved resumes are still in this browser"));
  check("Blocked: names the cause (blocked), not full", text.includes("blocking") && !text.includes("is full"));
  check("Blocked: says how to allow storage, then reload", text.includes("Allow this site to store data") && text.includes("Reload"));
  check("Blocked: offers no download when nothing can be read", !text.includes("Download backup file"));
  check("Blocked: no editor and no blank resume", !(await page.$("[role=tabpanel]")) && !text.includes("Add your name"));
  check("Blocked: nothing is written", (await writes(page)).length === 0, (await writes(page)).join(", "));
  await context.close();
}

// ---- Newer version: Reload and a backup file that only the newer version restores
{
  const raw = JSON.stringify({ schemaVersion: 3, resumes: [{ ...resume("n", "Newer"), schemaVersion: 3, futureField: true }] });
  const { context, page } = await openWith({ stored: raw });
  const text = await page.$eval("[role=tabpanel]", (el) => el.innerText);
  check("Newer: says resumes are safe and to reload", text.includes("Your resumes are safe") && text.includes("Reload the page"));
  check("Newer: offers Reload and Download backup", text.includes("Reload") && text.includes("Download backup"));
  await page.evaluate(() => [...document.querySelectorAll("[role=alert] button")].find((b) => b.textContent.trim() === "Download backup").click());
  const fileText = await downloaded(page);
  const file = JSON.parse(fileText);
  check("Newer: the backup file keeps the newer resumes and their version", file.kind === "resume-backup" && file.schemaVersion === 3 && file.resumes?.[0]?.futureField === true);
  check("Newer: it keeps the stored text exactly", file.storedText === raw);
  check("Newer: stored data is never overwritten", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2"))) === raw);
  const restored = await restoreInFreshProfile(fileText, "newer-backup.json");
  check("Newer: this version refuses the file and says to reload (the newer version restores it)", restored.dialog.includes("newer version") && restored.dialog.includes("Reload"));
  await restored.context.close();
  await context.close();
}

// ---- Recovered (copy kept): Notice with a standard dismiss target and a full backup file
{
  const raw = JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha"), "unreadable item"] });
  const { context, page } = await openWith({ stored: raw });
  const notice = await page.evaluate(() => {
    const alert = [...document.querySelectorAll("[role=alert]")].find((el) => el.innerText.includes("Part of your saved data couldn’t be read"));
    const dismiss = alert?.querySelector("button[aria-label^='Dismiss']");
    const box = dismiss?.getBoundingClientRect();
    return { found: !!alert, dismissName: dismiss?.getAttribute("aria-label"), w: box?.width, h: box?.height };
  });
  check("Recovered: shown as a Notice with role=alert", notice.found);
  check("Recovered: the dismiss button is named and at least 40×40", notice.dismissName === "Dismiss: Part of your saved data couldn’t be read" && notice.w >= 40 && notice.h >= 40, JSON.stringify(notice));
  await page.evaluate(() => [...document.querySelectorAll("[role=alert] button")].find((b) => b.textContent.trim() === "Download backup").click());
  const file = JSON.parse(await downloaded(page));
  check("Recovered: the backup file includes the unreadable part's text", file.kind === "resume-backup" && file.storedText === raw && file.resumes?.length === 1);
  await context.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

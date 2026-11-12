// Restore reliability: all-or-nothing restores, undo for "replace all" and for deleting a
// resume, and photo cleanup that never removes a photo something still refers to.
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

const check = createChecks("Restore reliability: all or nothing, undo, photo cleanup");
const browser = await launch();
const errors = [];
const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8").trim();

const resume = (id, name, extra = {}) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: `${name} Person`, jobTitle: "", email: "", phone: "", location: "" },
  sections: [{ id: `${id}s`, type: "summary", title: "Profile", visible: true, content: `About ${name}` }],
  design: { templateId: "portrait", pageSize: "letter" }, ...extra,
});
const withPhoto = (r, photoId, inline = true) => ({ ...r, profile: { ...r.profile, photo: { id: photoId, mimeType: "image/jpeg", width: 400, height: 400, byteSize: 1, updatedAt: 1, ...(inline ? { inlineData: photo } : {}) } } });
const backupFile = (name, resumes) => {
  const file = path.join(OUT, name);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ kind: "resume-backup", schemaVersion: 2, exportedAt: "2026-11-12T00:00:00.000Z", resumes }));
  return file;
};

async function openEditor({ seed, init } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  // "Leave site?" prompts are accepted by launch() in helpers.mjs.
  await page.setViewport({ width: 1440, height: 900 });
  if (init) await page.evaluateOnNewDocument(init);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  if (seed) {
    await page.evaluate((s) => {
      localStorage.clear();
      localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: s.resumes }));
      localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: s.resumes[0].id, zoom: "fit" }));
    }, seed);
  }
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(500);
  return { context, page };
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2") ?? "{}").resumes ?? []);
const idb = (page, db, store, op = "getAllKeys") =>
  page.evaluate((db, store, op) => new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const open = indexedDB.open(db);
    open.onsuccess = () => {
      const conn = open.result;
      if (!conn.objectStoreNames.contains(store)) { conn.close(); return resolve([]); }
      const req = conn.transaction(store).objectStore(store)[op]();
      req.onsuccess = () => { resolve(req.result); conn.close(); };
      req.onerror = () => resolve(null);
    };
    open.onerror = () => resolve(null);
  }), db, store, op);
/** Makes every stored photo look older than the cleanup's one-day grace period. */
const agePhotos = (page) =>
  page.evaluate(() => new Promise((resolve) => {
    const open = indexedDB.open("folio");
    open.onsuccess = () => {
      const tx = open.result.transaction("photos", "readwrite");
      const store = tx.objectStore("photos");
      store.getAll().onsuccess = (e) => e.target.result.forEach((r) => store.put({ ...r, createdAt: 0 }));
      tx.oncomplete = () => { open.result.close(); resolve(); };
    };
  }));
const addPhotoRecord = (page, id) =>
  page.evaluate((id) => new Promise((resolve) => {
    const open = indexedDB.open("folio", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("photos", { keyPath: "id" });
    open.onsuccess = () => {
      const tx = open.result.transaction("photos", "readwrite");
      tx.objectStore("photos").put({ id, blob: new Blob(["x"], { type: "image/jpeg" }), createdAt: 0 });
      tx.oncomplete = () => { open.result.close(); resolve(); };
    };
  }), id);

async function restore(page, file, mode = "merge") {
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  await sleep(200);
  if (mode === "replace") await page.evaluate(() => [...document.querySelectorAll("dialog[open] input[name=restore-mode]")][1].click());
  await sleep(100);
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => /^(Restore|Replace and restore)$/.test(b.textContent.trim())).click());
  // Wait for the restore dialog to close, or for its replacement (an error) to open.
  await waitFor(() => page.evaluate(() => !document.querySelector("dialog[open]") || /Nothing was restored/.test(document.querySelector("dialog[open]").innerText)), 30000);
  await sleep(300);
}
const dialogText = (page) => page.evaluate(() => document.querySelector("dialog[open]")?.innerText ?? "");
const toast = (page) => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((e) => e.innerText).find((t) => t.includes("Undo")) ?? "");
const clickUndo = (page) => page.evaluate(() => [...document.querySelectorAll("[role=status] button")].find((b) => b.textContent.trim() === "Undo").click());

// ---- 1. Restoring the same backup twice in one session leaves no photo inline
{
  const { context, page } = await openEditor();
  const file = backupFile("restore-twice.json", [withPhoto(resume("t1", "Twice"), "twice-photo")]);
  await restore(page, file);
  await restore(page, file);
  const list = await stored(page);
  check("Twice: both restores are saved", list.filter((r) => r.name === "Twice").length === 2, String(list.length));
  check("Twice: no inline photo is left in browser storage", list.every((r) => !r.profile.photo?.inlineData));
  check("Twice: the photo is in IndexedDB", ((await idb(page, "folio", "photos")) ?? []).includes("twice-photo"));
  await context.close();
}

// ---- 2. A restore that can't fit changes nothing, merge and replace
for (const mode of ["merge", "replace"]) {
  const mine = resume("mine", "Mine");
  const { context, page } = await openEditor({ seed: { resumes: [mine] } });
  const before = await page.evaluate(() => localStorage.getItem("folio.resumes.v2"));
  // About 7.5 million characters of text: over any browser's localStorage limit.
  const huge = Array.from({ length: 3 }, (_, i) => ({ ...resume(`huge${i}`, `Huge ${i}`), sections: [{ id: `h${i}`, type: "summary", title: "Profile", visible: true, content: "x".repeat(2_500_000) }] }));
  await restore(page, backupFile(`restore-huge-${mode}.json`, huge), mode);
  const text = await dialogText(page);
  check(`Too big (${mode}): explains that nothing was restored`, text.includes("Nothing was restored") && text.includes("Nothing was changed"), text.slice(0, 120));
  check(`Too big (${mode}): stored data is exactly as before`, (await page.evaluate(() => localStorage.getItem("folio.resumes.v2"))) === before);
  check(`Too big (${mode}): the editor still shows the existing resume`, (await page.$eval("[aria-label='Resume preview']", (el) => el.textContent)).includes("Mine Person"));
  check(`Too big (${mode}): the save indicator never says "Not saved"`, !(await page.evaluate(() => document.body.innerText.includes("Not saved"))));
  await context.close();
}

// ---- 3. IndexedDB unavailable: a restore with photos that doesn't fit changes nothing
{
  const big = "data:image/jpeg;base64," + "A".repeat(1_400_000);
  const resumes = Array.from({ length: 5 }, (_, i) => ({ ...resume(`n${i}`, `NoIdb ${i}`), profile: { ...resume(`n${i}`, "x").profile, photo: { id: `noidb${i}`, mimeType: "image/jpeg", width: 1, height: 1, byteSize: 1, updatedAt: 1, inlineData: big } } }));
  const { context, page } = await openEditor({ seed: { resumes: [resume("mine", "Mine")] }, init: () => Object.defineProperty(window, "indexedDB", { value: undefined }) });
  const before = await page.evaluate(() => localStorage.getItem("folio.resumes.v2"));
  await restore(page, backupFile("restore-noidb.json", resumes));
  check("No IndexedDB: a restore that doesn't fit says nothing was restored", (await dialogText(page)).includes("Nothing was restored"));
  check("No IndexedDB: stored data is unchanged", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2"))) === before);
  await context.close();
}

// ---- 4. Replace, then undo from the toast; photos come back too
{
  const mine = withPhoto(resume("mine", "Mine"), "mine-photo");
  const { context, page } = await openEditor({ seed: { resumes: [mine, resume("other", "Other")] } });
  await waitFor(async () => (await stored(page)).every((r) => !r.profile.photo?.inlineData), 5000);
  await restore(page, backupFile("restore-replace.json", [resume("b1", "FromBackup")]), "replace");
  check("Replace: only the backup's resume is stored", (await stored(page)).map((r) => r.name).join() === "FromBackup");
  const snapshot = await idb(page, "folio-snapshots", "snapshots", "getAll");
  check("Replace: the earlier resumes are kept in the snapshot database", snapshot?.[0]?.key === "folio.resumes.pre-restore" && snapshot[0].resumes.map((r) => r.name).sort().join() === "Mine,Other");
  check("Replace: an Undo toast is offered", (await toast(page)).includes("Replaced with 1 resume"));
  await clickUndo(page);
  check("Undo replace: the earlier resumes are stored again", await waitFor(async () => (await stored(page)).map((r) => r.name).sort().join() === "Mine,Other", 5000));
  check("Undo replace: the snapshot is removed once they're back", ((await idb(page, "folio-snapshots", "snapshots")) ?? ["x"]).length === 0);
  check("Undo replace: the photo is still in IndexedDB", ((await idb(page, "folio", "photos")) ?? []).includes("mine-photo"));
  check("Undo replace: the photo displays", await waitFor(() => page.$eval("[aria-label='Resume preview'] .resume-paper img", (img) => img.complete && img.naturalWidth > 0), 5000));
  await context.close();
}

// ---- 5. Replace, reload, put back from Overview; cleanup keeps snapshot photos and removes true orphans
{
  const mine = withPhoto(resume("mine", "Mine"), "kept-photo");
  const { context, page } = await openEditor({ seed: { resumes: [mine] } });
  await waitFor(async () => (await stored(page)).every((r) => !r.profile.photo?.inlineData), 5000);
  await restore(page, backupFile("restore-replace-later.json", [resume("b2", "Later")]), "replace");
  await addPhotoRecord(page, "true-orphan");
  await agePhotos(page);
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(1500);
  const photos = (await idb(page, "folio", "photos")) ?? [];
  check("Cleanup: keeps a photo only the undo snapshot refers to", photos.includes("kept-photo"), photos.join());
  check("Cleanup: still removes a photo nothing refers to", !photos.includes("true-orphan"), photos.join());
  await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Overview").click());
  await sleep(300);
  check("Overview: offers to put back the earlier resumes after a reload", (await page.$eval("[role=tabpanel]", (el) => el.innerText)).includes("Put back earlier resumes"));
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Put back earlier resumes").click());
  await page.waitForSelector("dialog[open]");
  check("Overview: asks first, and offers a backup", (await dialogText(page)).includes("Put back your earlier resumes?") && (await dialogText(page)).includes("Download backup"));
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Put them back").click());
  check("Overview: the earlier resume is stored again", await waitFor(async () => (await stored(page)).map((r) => r.name).join() === "Mine", 5000));
  await context.close();
}

// ---- 6. Delete a resume, then undo; its photo survives
{
  const doomed = withPhoto(resume("doomed", "Doomed"), "doomed-photo");
  const { context, page } = await openEditor({ seed: { resumes: [doomed, resume("keep", "Keep")] } });
  await waitFor(async () => (await stored(page)).every((r) => !r.profile.photo?.inlineData), 5000);
  await page.click("[aria-label='More actions']");
  await page.waitForSelector("[role=menu]");
  await page.evaluate(() => [...document.querySelectorAll("[role=menu] button")].find((b) => b.textContent.trim() === "Delete").click());
  await page.waitForSelector("dialog[open]");
  check("Delete: the dialog says it can be undone", (await dialogText(page)).includes("undo"));
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Delete resume").click());
  check("Delete: the resume is gone from storage", await waitFor(async () => !(await stored(page)).some((r) => r.id === "doomed"), 3000));
  check("Delete: an Undo toast is offered", (await toast(page)).includes("“Doomed” deleted"));
  await clickUndo(page);
  check("Undo delete: the resume is back, with the same id", await waitFor(async () => (await stored(page)).some((r) => r.id === "doomed"), 3000));
  check("Undo delete: its photo is still stored", ((await idb(page, "folio", "photos")) ?? []).includes("doomed-photo"));
  await context.close();
}

// ---- 7. Deleting the only resume, then undo, doesn't leave the blank placeholder behind
{
  const { context, page } = await openEditor({ seed: { resumes: [resume("only", "Only")] } });
  await page.click("[aria-label='More actions']");
  await page.waitForSelector("[role=menu]");
  await page.evaluate(() => [...document.querySelectorAll("[role=menu] button")].find((b) => b.textContent.trim() === "Delete").click());
  await page.waitForSelector("dialog[open]");
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Delete resume").click());
  await sleep(600);
  await clickUndo(page);
  check("Undo last delete: only the original resume remains", await waitFor(async () => (await stored(page)).map((r) => r.id).join() === "only", 3000));
  await context.close();
}

// ---- 8. Storage completely full: photos are never cleaned up against an empty list
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((r) => localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] })), withPhoto(resume("full", "Full"), "full-photo", false));
  await addPhotoRecord(page, "full-photo");
  // Simulate storage with no room at all: the editor's probe write is refused.
  await page.evaluateOnNewDocument(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "folio.probe") throw new DOMException("full", "QuotaExceededError");
      return set.call(this, k, v);
    };
  });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await sleep(1500);
  check("Storage full: the recovery screen says the saved resumes are still here", await page.evaluate(() => document.body.innerText.includes("Your saved resumes are still in this browser") && document.body.innerText.includes("is full")));
  check("Storage full: the stored resume's photo is not cleaned up", ((await idb(page, "folio", "photos")) ?? []).includes("full-photo"));
  await context.close();
}

// ---- 9. C1: Escape during a restore doesn't close it, and an edit made meanwhile survives
{
  const big = "data:image/jpeg;base64," + "A".repeat(1_200_000);
  const backup = Array.from({ length: 12 }, (_, i) => ({ ...resume(`e${i}`, `Esc ${i}`), profile: { ...resume(`e${i}`, `Esc ${i}`).profile, photo: { id: `esc-photo-${i}`, mimeType: "image/jpeg", width: 1, height: 1, byteSize: 1, updatedAt: 1, inlineData: big } } }));
  const file = backupFile("restore-escape.json", backup);
  const { context, page } = await openEditor({ seed: { resumes: [resume("mine", "Mine")] } });
  await page.click("[aria-controls='personal-form']");
  await sleep(200);
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  await sleep(200);
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === "Restore").click());
  await sleep(30);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await sleep(20);
  }
  const state = await page.evaluate(() => ({
    open: !!document.querySelector("dialog[open]"),
    restoring: [...document.querySelectorAll("dialog[open] button")].some((b) => b.textContent.includes("Restoring")),
  }));
  check("C1: pressing Escape three times during a restore leaves the dialog open", state.open, JSON.stringify(state));
  // An edit that gets in during the restore (here applied directly, standing in for any route around the dialog).
  const editedWhileRestoring = await page.evaluate(() => {
    const restoring = [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Restoring"));
    const input = [...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith("Full name"))?.control;
    if (!input) return { restoring, edited: false };
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "Edited During Restore");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return { restoring, edited: true };
  });
  check("C1: the edit was made while the restore was still running", editedWhileRestoring.restoring && editedWhileRestoring.edited, JSON.stringify(editedWhileRestoring));
  await waitFor(() => page.evaluate(() => !document.querySelector("dialog[open]")), 30000);
  await sleep(800);
  const after = await stored(page);
  check("C1: the restore finished and saved all 12 resumes", after.filter((r) => r.name.startsWith("Esc ")).length === 12, String(after.length));
  check("C1: the edit made during the restore survives it", after.find((r) => r.id === "mine")?.profile.fullName === "Edited During Restore", after.find((r) => r.id === "mine")?.profile.fullName);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await reopened.waitForSelector("select");
  await sleep(500);
  check("C1: and survives reopening the editor", (await stored(reopened)).find((r) => r.id === "mine")?.profile.fullName === "Edited During Restore");
  await context.close();
}

// ---- 10. I2 and expiry: a snapshot is only offered for a replace that was committed, within 7 days
{
  const putSnapshot = (page, record) =>
    page.evaluate((record) => new Promise((resolve) => {
      const open = indexedDB.open("folio-snapshots", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("snapshots", { keyPath: "key" });
      open.onsuccess = () => {
        const tx = open.result.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put(record);
        tx.oncomplete = () => { open.result.close(); resolve(); };
      };
    }), record);
  const overviewText = async (page) => {
    await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Overview").click());
    await sleep(300);
    return page.$eval("[role=tabpanel]", (el) => el.innerText);
  };
  const cases = [
    ["Tab closed between snapshot and commit", { restoredIds: ["never-committed"], age: 0 }, false],
    ["Snapshot older than 7 days", { restoredIds: ["current"], age: 8 * 24 * 60 * 60 * 1000 }, false],
    ["Committed replace within 7 days (control)", { restoredIds: ["current"], age: 60_000 }, true],
  ];
  for (const [label, { restoredIds, age }, offered] of cases) {
    const { context, page: first } = await openEditor({ seed: { resumes: [resume("current", "Current")] } });
    await putSnapshot(first, { key: "folio.resumes.pre-restore", createdAt: Date.now() - age, restoredIds, resumes: [resume("old", "Old")] });
    // A new page in the same browser profile, rather than a reload (whose "Leave site?" prompt can race the navigation).
    await first.close();
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
    await page.waitForSelector("select");
    await sleep(800);
    const shows = (await overviewText(page)).includes("Put back earlier resumes");
    check(`I2: ${label}: ${offered ? "offers" : "doesn't offer"} "Put back earlier resumes"`, shows === offered);
    const left = (await idb(page, "folio-snapshots", "snapshots")) ?? [];
    check(`I2: ${label}: the snapshot is ${offered ? "kept" : "removed"}`, offered ? left.length === 1 : left.length === 0, JSON.stringify(left));
    await context.close();
  }
}

// ---- 11. A photo moved once is moved again if it comes back inline in the same session
{
  const inline = withPhoto(resume("m1", "Mover"), "mover-photo");
  const { context, page } = await openEditor({ seed: { resumes: [inline] } });
  check("Move: the inline photo is moved to IndexedDB on load", await waitFor(async () => (await stored(page)).every((r) => !r.profile.photo?.inlineData), 5000));
  // Another tab writes the same photo inline again (for example a tab without IndexedDB).
  const other = await context.newPage();
  await other.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await other.evaluate((r) => localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] })), inline);
  check(
    "Move: the editor moves it again, so browser storage ends up without it",
    await waitFor(async () => (await stored(page)).length === 1 && (await stored(page)).every((r) => r.profile.photo?.id === "mover-photo" && !r.profile.photo.inlineData), 5000),
    JSON.stringify((await stored(page)).map((r) => !!r.profile.photo?.inlineData)),
  );
  await context.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

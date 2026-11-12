// Resume data durability (Phase 3).
//
// 1. Unreadable saved data when storage has no room for a copy: nothing may be saved over it
//    until the person has downloaded it.
// 2. ME-02 characterization: restoring a large backup (10 photos near the inline limit plus
//    about 4 million characters of text). This records how the current code behaves; it does
//    not change it. The end state must be durable; the steps on the way are printed for the report.
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

const check = createChecks("Data durability: unreadable data without room for a copy, large photo restore");
const browser = await launch();
const errors = [];

const resume = (id, name, extra = {}) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: `${name} Person`, jobTitle: "Tester", email: "", phone: "", location: "" },
  sections: [{ id: `${id}s`, type: "summary", title: "Profile", visible: true, content: "Hello" }],
  design: { templateId: "minimal", pageSize: "letter" }, ...extra,
});

async function newPage(context = browser) {
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument(() => {
    const create = URL.createObjectURL.bind(URL);
    // Photos also get object URLs for display; only the JSON files are downloads.
    URL.createObjectURL = (blob) => { if (blob.type === "application/json") window.__download = blob; return create(blob); };
  });
  return page;
}
const panel = (page) => page.$eval("[role=tabpanel]", (el) => el.innerText);
const rawStored = (page) => page.evaluate(() => localStorage.getItem("folio.resumes.v2"));
const saveIndicator = (page) =>
  page.evaluate(() => [...document.querySelectorAll("span[title]")].map((s) => (s.querySelector("span")?.textContent ?? "").trim()).find((t) => /^(Saved locally|Saving…|Not saved|Not saving|Saving paused|Storage unavailable)/.test(t)) ?? "");
const clickText = (page, text, scope = "button") =>
  page.evaluate((t, s) => [...document.querySelectorAll(s)].find((b) => b.textContent.trim() === t && (b.offsetParent || b.closest("dialog"))).click(), text, scope);
const clearAll = (page) =>
  page.evaluate(() => new Promise((resolve) => { localStorage.clear(); const request = indexedDB.deleteDatabase("folio"); request.onsuccess = request.onerror = request.onblocked = resolve; }));

// ---- 1. Unreadable data, no room for a copy
{
  const context = await browser.createBrowserContext();
  const page = await newPage(context);
  // A string and a number are skipped as unreadable; an object would be repaired into a resume.
  const raw = JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha"), "unreadable item", 5] });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await clearAll(page);
  await page.evaluate((v) => {
    localStorage.setItem("folio.resumes.v2", v);
    localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "a", zoom: "fit" }));
  }, raw);
  // Simulate a nearly full storage area: the copy of the unreadable data is refused.
  await page.evaluateOnNewDocument(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "folio.resumes.v2.unreadable-backup") throw new DOMException("full", "QuotaExceededError");
      return set.call(this, k, v);
    };
  });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);

  let text = await panel(page);
  check("Held: explains that saving is paused and offers a backup file", text.includes("Saving is paused to protect your data") && text.includes("download a backup file") && text.includes("Download backup"));
  check("Held: doesn't claim the unreadable part was kept", !text.includes("kept, untouched"));
  check("Held: save indicator says saving is paused, not the newer-version text", (await saveIndicator(page)).startsWith("Saving paused"));
  check("Held: the readable resume is open", (await page.$eval("[aria-label='Resume preview']", (el) => el.textContent)).includes("Alpha Person"));

  await page.click("[aria-controls='personal-form']");
  await page.locator("::-p-aria(Job title)").fill("Edited while held");
  await sleep(900); // longer than the autosave delay; shows that nothing is written
  check("Held: an edit doesn't write over the stored data", (await rawStored(page)) === raw);

  await clickText(page, "Download backup", "[role=alert] button");
  check("Held: asks whether the backup file downloaded", await waitFor(async () => (await page.evaluate(() => document.querySelector("dialog[open]")?.innerText ?? "")).includes("Did the backup file download?"), 3000));
  const fileText = await waitFor(async () => !!(await page.evaluate(() => window.__download?.size)), 5000) ? await page.evaluate(() => window.__download.text()) : "{}";
  const file = JSON.parse(fileText);
  check("Held: the download is a restorable backup file", file.kind === "resume-backup" && Array.isArray(file.resumes) && file.resumes.some((r) => r.profile?.fullName === "Alpha Person"));
  check("Held: the backup file keeps the stored text exactly, byte for byte", file.storedText === raw);
  await sleep(900);
  check("Held: nothing is saved before the download is confirmed", (await rawStored(page)) === raw);

  await clickText(page, "Not yet", "dialog[open] button");
  await sleep(900);
  check("Held: \"Not yet\" keeps saving paused", (await rawStored(page)) === raw && (await saveIndicator(page)).startsWith("Saving paused"));

  await clickText(page, "Download backup", "[role=alert] button");
  await page.waitForSelector("dialog[open]");
  await clickText(page, "Yes, I have it", "dialog[open] button");
  check("Held: saving resumes once the download is confirmed", await waitFor(async () => (await rawStored(page)) !== raw, 3000));
  const saved = JSON.parse(await rawStored(page));
  check("Held: the edit made while held is saved", saved.resumes.length === 1 && saved.resumes[0].profile.jobTitle === "Edited while held");
  check("Held: the notice is gone and the indicator says saved", !(await panel(page)).includes("Saving is paused") && (await saveIndicator(page)).startsWith("Saved locally"));
  await context.close();

  // That exact file restores in a fresh browser profile.
  const heldFile = path.join(OUT, "held-backup.json");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(heldFile, fileText);
  const fresh = await browser.createBrowserContext();
  const restorePage = await newPage(fresh);
  await restorePage.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await restorePage.waitForSelector("select");
  await sleep(300);
  await (await restorePage.$("[aria-label='Choose a backup file']")).uploadFile(heldFile);
  await restorePage.waitForSelector("dialog[open]");
  check("Held file: Restore from backup accepts it", (await restorePage.$eval("dialog[open]", (el) => el.innerText)).includes("This backup holds 1 resume"));
  await clickText(restorePage, "Restore", "dialog[open] button");
  check("Held file: the readable resume is restored", await waitFor(async () => (JSON.parse((await rawStored(restorePage)) ?? "{}").resumes ?? []).some((r) => r.profile.fullName === "Alpha Person"), 5000));
  await fresh.close();
}

// ---- 1b. Same data with room for a copy: unchanged behavior
{
  const context = await browser.createBrowserContext();
  const page = await newPage(context);
  const raw = JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha"), "unreadable item"] });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await clearAll(page);
  await page.evaluate((v) => localStorage.setItem("folio.resumes.v2", v), raw);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);
  const text = await panel(page);
  check("Copy kept: the recovery notice says the unreadable part is kept", text.includes("Part of your saved data couldn’t be read") && text.includes("kept, untouched") && !text.includes("Saving is paused"));
  check("Copy kept: the copy holds the original text", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2.unreadable-backup"))) === raw);
  check("Copy kept: the save indicator is normal", (await saveIndicator(page)).startsWith("Saved locally"));
  await context.close();
}

// ---- 2. ME-02 characterization: large restore with 10 photos
{
  const PHOTOS = 10;
  const TEXT_PER_RESUME = 400_000;
  const context = await browser.createBrowserContext();
  const page = await newPage(context);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await clearAll(page);

  // Real, distinct JPEGs just under the 1,500,000-character inline limit.
  const photos = await page.evaluate(async (count) => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      const image = ctx.createImageData(1000, 1000);
      for (let p = 0; p < image.data.length; p++) image.data[p] = p % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
      ctx.putImageData(image, 0, 0);
      let quality = 0.95;
      let url = canvas.toDataURL("image/jpeg", quality);
      while (url.length > 1_450_000 && quality > 0.3) url = canvas.toDataURL("image/jpeg", (quality -= 0.05));
      out.push(url);
    }
    return out;
  }, PHOTOS);
  const resumes = photos.map((inlineData, i) =>
    resume(`big${i}`, `Large ${i}`, {
      profile: { fullName: `Large ${i} Person`, jobTitle: "Tester", email: "", phone: "", location: "", photo: { id: `bigphoto${i}`, mimeType: "image/jpeg", width: 1000, height: 1000, byteSize: Math.round((inlineData.length * 3) / 4), updatedAt: 1, inlineData } },
      sections: [{ id: `big${i}s`, type: "summary", title: "Profile", visible: true, content: `${i}`.repeat(TEXT_PER_RESUME) }],
      // A template that shows the photo, so the reload check can see it.
      design: { templateId: "portrait", pageSize: "letter" },
    }),
  );
  const backupText = JSON.stringify({ kind: "resume-backup", schemaVersion: 2, exportedAt: "2026-11-05T00:00:00.000Z", resumes });
  const photoChars = photos.reduce((sum, p) => sum + p.length, 0);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, "large-backup.json");
  fs.writeFileSync(file, backupText);

  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(300);
  const estimate = await page.evaluate(async () => (navigator.storage?.estimate ? await navigator.storage.estimate() : null));

  // Record every save state the indicator passes through, and every write of the resumes key.
  await page.evaluate(() => {
    window.__writes = [];
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k !== "folio.resumes.v2") return set.call(this, k, v);
      const entry = { chars: String(v).length, inlinePhotos: (String(v).match(/"inlineData"/g) ?? []).length, at: performance.now() };
      window.__writes.push(entry);
      try { return set.call(this, k, v); } catch (error) { entry.error = error.name; throw error; }
    };
    window.__states = [];
    const read = () => [...document.querySelectorAll("span[title]")].map((s) => (s.querySelector("span")?.textContent ?? "").trim()).find((t) => /^(Saved locally|Saving…|Not saved|Not saving|Saving paused|Storage unavailable)/.test(t)) ?? "";
    const record = () => { const s = read(); if (window.__states.at(-1)?.state !== s) window.__states.push({ state: s, at: performance.now() }); };
    new MutationObserver(record).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    record();
  });

  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  const opened = await waitFor(async () => (await page.$("dialog[open]")) !== null, 30000);
  const dialogText = opened ? await page.$eval("dialog[open]", (el) => el.innerText) : "";
  check(`ME-02: the ${(backupText.length / 1e6).toFixed(1)} MB backup is accepted and previewed`, dialogText.includes(`holds ${PHOTOS} resumes`), dialogText.slice(0, 80));
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] input[type=radio]")][1].click());
  await sleep(100);
  const restoredAt = await page.evaluate(() => performance.now());
  await clickText(page, "Replace and restore", "dialog[open] button");

  const settled = await waitFor(async () => {
    const list = JSON.parse((await rawStored(page)) ?? "{}").resumes ?? [];
    return list.length === PHOTOS && list.every((r) => r.profile.photo && !r.profile.photo.inlineData) && (await saveIndicator(page)).startsWith("Saved locally");
  }, 60000, 250);
  const states = await page.evaluate((t0) => window.__states.filter((s) => s.at >= t0).map((s) => `${s.state} @${Math.round(s.at - t0)}ms`), restoredAt);
  const sawError = states.some((s) => s.startsWith("Not saved"));
  const writes = await page.evaluate((t0) => window.__writes.filter((w) => w.at >= t0).map((w) => `${w.chars.toLocaleString("en-US")} chars, ${w.inlinePhotos} inline photos, ${w.error ?? "ok"} @${Math.round(w.at - t0)}ms`), restoredAt);
  console.log(`ME-02 observation: writes of folio.resumes.v2 after restore: ${writes.join(" | ")}`);
  console.log(`ME-02 observation: backup ${backupText.length.toLocaleString("en-US")} chars (${photoChars.toLocaleString("en-US")} in ${PHOTOS} photos); storage estimate quota ${estimate?.quota ?? "n/a"}`);
  console.log(`ME-02 observation: save states after restore: ${states.join(" → ")}`);
  console.log(`ME-02 observation: first save after restore ${sawError ? "FAILED (\"Not saved\" shown), then recovered" : "did not show \"Not saved\""}`);

  check("ME-02: after a large restore, everything ends up saved", settled, states.join(" → "));
  // The restore is all or nothing: one write, with the photos already moved out of the list.
  check("ME-02: no save fails during the restore (\"Not saved\" never shown)", !sawError, states.join(" → "));
  check("ME-02: no write of the resume list is refused, and none holds an inline photo", writes.length > 0 && writes.every((w) => w.includes(" 0 inline photos, ok")), writes.join(" | "));
  const stored = JSON.parse((await rawStored(page)) ?? "{}").resumes ?? [];
  check("ME-02: stored resumes hold photo references, not inline photos", stored.length === PHOTOS && stored.every((r) => r.profile.photo?.id && !r.profile.photo.inlineData));
  check("ME-02: all text is stored in full", stored.every((r) => r.sections[0].content.length === TEXT_PER_RESUME));
  const photoCount = await page.evaluate(() => new Promise((resolve) => {
    const open = indexedDB.open("folio");
    open.onsuccess = () => { const req = open.result.transaction("photos").objectStore("photos").count(); req.onsuccess = () => { resolve(req.result); open.result.close(); }; req.onerror = () => resolve(-1); };
    open.onerror = () => resolve(-1);
  }));
  check("ME-02: every photo is in IndexedDB", photoCount === PHOTOS, `found ${photoCount}`);

  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(800);
  const afterReload = JSON.parse((await rawStored(page)) ?? "{}").resumes ?? [];
  check("ME-02: everything survives a reload", afterReload.length === PHOTOS && afterReload.every((r) => r.sections[0].content.length === TEXT_PER_RESUME));
  check("ME-02: the open resume's photo displays after a reload", await waitFor(() => page.$eval("[aria-label='Resume preview'] .resume-paper img", (img) => img.complete && img.naturalWidth === 1000 && img.src.startsWith("blob:")), 10000));

  await page.evaluate(() => (window.__download = null));
  await page.click("[aria-label='More actions']");
  await page.waitForSelector("[role=menu]");
  await clickText(page, "Download backup", "[role=menu] button");
  const again = await waitFor(async () => (await page.evaluate(() => window.__download?.size ?? 0)) > 0, 20000) ? JSON.parse(await page.evaluate(() => window.__download.text())) : null;
  const byName = new Map((again?.resumes ?? []).map((r) => [r.name, r.profile.photo?.inlineData]));
  check("ME-02: a new backup holds all 10 photos, byte for byte", photos.every((p, i) => byName.get(`Large ${i}`) === p));
  await context.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

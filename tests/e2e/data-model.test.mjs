import fs from "node:fs";
import { BASE, FIXTURES, OUT, createChecks, isKnownMissingAsset, launch, sleep } from "./helpers.mjs";

const PHOTO = `${FIXTURES}/photo.png`;
const fixture = JSON.parse(fs.readFileSync(`${FIXTURES}/v1-resumes.json`, "utf8"));
const check = createChecks("Data model: migration, recovery, sections, autosave, cross-tab");
// Opens a "⋯" options menu by its accessible label and picks an item.
async function pickOption(page, menuLabel, itemText, nth = 0) {
  const triggers = await page.$$(`[aria-label="${menuLabel}"]`);
  await triggers[nth].click();
  await page.waitForSelector("[role=menu]");
  await page.evaluate((t) => [...document.querySelectorAll("[role=menu] button")].find((b) => b.textContent.trim() === t).click(), itemText);
  await sleep(150);
}
const browser = await launch(["--force-device-scale-factor=1"]);
const errors = [], leaks = [];
async function newPage(ctx) {
  const page = await (ctx ?? browser).newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !isKnownMissingAsset(r.url()) && errors.push(`HTTP ${r.status()} ${r.url()}`));
  page.on("request", (req) => { if (req.url().startsWith("data:") || req.url().startsWith("blob:")) return; const b = `${req.url()} ${req.postData() ?? ""}`; if (/Legacy Lena|Quokka|Streamline/.test(b)) leaks.push(req.url()); });
  return page;
}
// The personal details form starts collapsed behind the profile card's Edit button.
async function openProfile(page) {
  await page.waitForSelector("[aria-controls='personal-form']");
  await page.$eval("[aria-controls='personal-form']", (el) => el.getAttribute("aria-expanded") === "false" && el.click());
  await sleep(100);
}
const v2 = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2") ?? "null"));
const preview = (page) => page.$eval("[aria-label='Resume preview']", (el) => el.textContent);
const idbPhotos = (page) => page.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open("folio"); req.onsuccess = () => { const db = req.result; if (!db.objectStoreNames.contains("photos")) return resolve([]);
    const all = db.transaction("photos").objectStore("photos").getAll(); all.onsuccess = () => resolve(all.result.map((r) => ({ id: r.id, size: r.blob.size, type: r.blob.type }))); };
}));
const seed = async (page, items) => { await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" }); await page.evaluate((items) => { localStorage.clear(); for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v); }, items); };

// ---- 1. Migration of real v1 data
{
  const ctx = await browser.createBrowserContext();
  const page = await newPage(ctx);
  await seed(page, { "folio.resumes": fixture.resumes, "folio.editor-settings": fixture.settings });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(1200);
  const v1 = JSON.parse(fixture.resumes);
  const data = await v2(page);
  const legacyNow = await page.evaluate(() => localStorage.getItem("folio.resumes"));
  check("Migration writes schema v2 envelope", data?.schemaVersion === 2 && data.resumes.length === 2, `${data?.resumes?.length} resumes`);
  check("Original v1 data left untouched as backup", legacyNow === fixture.resumes);
  check("Every resume has schemaVersion 2", data.resumes.every((r) => r.schemaVersion === 2));
  check("Resume ids preserved", data.resumes.map((r) => r.id).join() === v1.resumes.map((r) => r.id).join());
  check("Names, timestamps and templates preserved", data.resumes.every((r, i) => r.name === v1.resumes[i].name && r.design.templateId === v1.resumes[i].template && r.createdAt === v1.resumes[i].createdAt));
  const settings = JSON.parse(await page.evaluate(() => localStorage.getItem("folio.editor-settings")));
  check("Active resume setting preserved", settings.activeResumeId === JSON.parse(fixture.settings).activeResumeId);
  const r = data.resumes[0], o = v1.resumes[0].data;
  const sec = (t) => r.sections.find((s) => s.type === t);
  check("Profile migrated", r.profile.fullName === o.name && r.profile.jobTitle === o.title && r.profile.email === o.contact.email && r.profile.linkedin === o.contact.linkedin);
  check("Experience entry id and content preserved", sec("experience").entries[0].id === o.experience[0].id && sec("experience").entries[0].highlights.join("|") === o.experience[0].highlights.join("|"));
  check("Skills migrated with ids", sec("skills").entries.map((e) => e.name).join() === o.skills.join() && sec("skills").entries.every((e) => e.id));
  check("Languages split into name and proficiency", sec("languages").entries[0].name === "German" && sec("languages").entries[0].proficiency === "Fluent");
  const custom = r.sections.find((s) => s.type === "custom");
  check("Custom section id, title and items preserved", custom.id === o.customSections[0].id && custom.title === "Publications" && custom.entries[0].title === "Streaming at scale");
  check("Section order matches v1 rendering", r.sections.map((s) => s.type).join() === "summary,experience,projects,education,skills,certifications,languages,custom");
  const allIds = data.resumes.flatMap((x) => [x.id, ...x.sections.flatMap((s) => [s.id, ...(s.entries ?? []).map((e) => e.id)])]);
  check("All resume, section and entry ids unique", new Set(allIds).size === allIds.length, `${allIds.length} ids`);
  const photos = await idbPhotos(page);
  check("Inline photo moved to IndexedDB", !r.profile.photo.inlineData && photos.some((p) => p.id === r.profile.photo.id && p.size > 1000), JSON.stringify(photos));
  check("localStorage no longer holds base64 photo", !JSON.stringify(data).includes("base64"));
  const log = JSON.parse(await page.evaluate(() => localStorage.getItem("folio.migrations")));
  check("Migration logged once", log.length === 1 && log[0].from === 1 && log[0].to === 2);
  // The copy (kinetic) is active; check preview and photo
  check("Preview shows migrated content", (await preview(page)).includes("Legacy Lena Fixture") && (await preview(page)).includes("Streaming at scale"));
  await page.select("select", "portrait");
  await sleep(500);
  const img = await page.$eval("[aria-label='Resume preview'] img", (i) => [i.src.slice(0, 5), i.naturalWidth]).catch(() => null);
  check("Photo shown from IndexedDB", img && img[0] === "blob:" && img[1] === 400, JSON.stringify(img));
  // Stale old tab writes to legacy key: must not trigger a second migration.
  await page.evaluate(() => localStorage.setItem("folio.resumes", JSON.stringify({ version: 1, resumes: [] })));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(600);
  const again = await v2(page);
  const log2 = JSON.parse(await page.evaluate(() => localStorage.getItem("folio.migrations")));
  check("No duplicate migration on reload", again.resumes.length === 2 && log2.length === 1);
  await ctx.close();
}

// ---- 2. Corrupted, partial, future and duplicate-id data
{
  const ctx = await browser.createBrowserContext();
  const page = await newPage(ctx);
  await seed(page, { "folio.resumes.v2": "{not json", "folio.resumes": fixture.resumes });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[role='tabpanel']");
  check("Corrupted v2 shows recovery notice", (await page.$eval("[role='tabpanel']", (e) => e.innerText)).includes("could not be read"));
  check("Corrupted v2 backed up", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2.unreadable-backup"))) === "{not json");
  check("Legacy data still untouched", (await page.evaluate(() => localStorage.getItem("folio.resumes"))) === fixture.resumes);

  const good = { schemaVersion: 2, id: "dup", name: "A", createdAt: 5, updatedAt: 6, profile: { fullName: "Partial Pat" }, sections: [{ id: "s1", type: "experience", title: "Work", visible: true, entries: [{ id: "e1", role: "Dev" }, { id: "e1", role: "Dup entry" }] }, { id: "s2", type: "bogus" }], design: { templateId: "no-such-template" } };
  const dupe = { ...good, name: "B" };
  const future = { schemaVersion: 99, id: "future", name: "From the future" };
  const newerData = JSON.stringify({ schemaVersion: 2, resumes: [good, dupe, future] });
  await seed(page, { "folio.resumes.v2": newerData, "folio.editor-settings": JSON.stringify({ activeResumeId: "dup", zoom: "fit" }) });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await openProfile(page);
  await page.locator("::-p-aria(Job title)").fill("Edited");
  await sleep(800);
  check("Data from a newer version is never overwritten", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2"))) === newerData);
  check("Newer data shows a warning with a copy option", await page.$eval("[role=tabpanel]", (el) => el.innerText.includes("Saved by a newer version") && el.innerText.includes("Download a copy")));
  await seed(page, { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [good, dupe, "garbage", null] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "dup", zoom: "fit" }) });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  check("Loading alone does not rewrite stored data", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2"))).includes("garbage"));
  await openProfile(page);
  await page.locator("::-p-aria(Job title)").fill("Edited");
  await sleep(800);
  const d = await v2(page);
  check("Valid resumes kept from partially valid data", d.resumes.length === 2 && d.resumes.map((r) => r.name).join() === "A,B");
  check("Duplicate resume ids replaced", d.resumes[0].id === "dup" && d.resumes[1].id !== "dup");
  const ents = d.resumes[0].sections[0].entries.map((e) => e.id);
  check("Duplicate entry ids replaced", ents[0] === "e1" && ents[1] !== "e1");
  check("Unknown section type dropped, missing fields filled", d.resumes[0].sections.length === 1 && d.resumes[0].profile.email === "" && d.resumes[0].sections[0].title === "Work");
  check("Unknown template falls back to Professional", (await page.$eval("select", (s) => s.value)) === "professional");
  check("Unreadable data preserved in backup", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2.unreadable-backup"))).includes("garbage"));
  check("Missing optional fields render", (await preview(page)).includes("Partial Pat") && (await preview(page)).includes("Dup entry"));
  await ctx.close();
}

// ---- 3. New resume, all section types, editing features, autosave, cross-tab
{
  const ctx = await browser.createBrowserContext();
  const page = await newPage(ctx);
  await page.goto(`${BASE}/editor?template=minimal`, { waitUntil: "networkidle0" });
  await openProfile(page);
  let d = await v2(page);
  await sleep(600); d = await v2(page);
  check("New resume created with schema v2 and URL template", d.resumes.length === 1 && d.resumes[0].design.templateId === "minimal" && d.resumes[0].schemaVersion === 2);
  check("Default sections", d.resumes[0].sections.map((s) => s.type).join() === "summary,experience,projects,education,skills,certifications,languages");
  await page.locator("::-p-aria(Full name)").fill("Quokka Newperson");
  await page.locator("::-p-aria(Email)").fill("q@example.com");
  // Add awards, volunteering and a custom section. Adding one opens it and closes the last.
  for (const label of ["Awards", "Volunteering", "Custom section"]) {
    await page.locator("::-p-aria(Add section)").click();
    await page.locator(`[role='menu'] ::-p-text(${label})`).click();
    await sleep(150);
    if (label === "Awards") {
      await page.locator("::-p-aria(Add award)").click();
      await page.locator("::-p-aria(Award)").fill("Hackathon Winner");
    } else if (label === "Volunteering") {
      await page.locator("::-p-aria(Add role)").click();
      await page.locator("::-p-aria(Role)").fill("Food bank volunteer");
      await page.locator("::-p-aria(Organization)").fill("City Food Bank");
    } else {
      // New custom sections open with the heading field focused.
      await page.type("[aria-label='Section heading']", "Interests");
      await page.keyboard.press("Enter");
      await page.locator("::-p-aria(Add item)").click();
      await page.locator("::-p-aria(Title)").fill("Trail running");
    }
  }
  // Summary, skills, language, certification, project, education, experience
  await page.locator("::-p-text(A short introduction)").click();
  await page.locator("::-p-aria(Summary)").fill("Summary text here.");
  await page.locator("::-p-text(Tools, technologies and strengths)").click();
  await page.locator("::-p-aria(Add a skill)").fill("Go, Rust");
  await page.keyboard.press("Enter");
  await page.locator("::-p-text(Languages you speak)").click();
  await page.locator("::-p-aria(Add language)").click();
  await page.locator("::-p-aria(Language)").fill("Japanese");
  await page.locator("::-p-aria(Proficiency)").fill("Intermediate");
  await page.locator("::-p-text(Licenses and certificates)").click();
  await page.locator("::-p-aria(Add certification)").click();
  await page.locator("::-p-aria(Certification)").fill("CKA");
  await page.locator("::-p-aria(Issuer)").fill("CNCF");
  await page.locator("::-p-text(Personal, academic or open-source work)").click();
  await page.locator("::-p-aria(Add project)").click();
  await page.locator("::-p-aria(Project name)").fill("Tiny compiler");
  await page.locator("::-p-text(Degrees, courses and schools)").click();
  await page.locator("::-p-aria(Add education)").click();
  await page.locator("::-p-aria(Degree or qualification)").fill("B.S. Math");
  await page.locator("::-p-text(Jobs, internships and volunteer roles)").click();
  await page.locator("::-p-aria(Add position)").click();
  await page.locator("::-p-aria(Company)").fill("FirstCo");
  await page.locator("::-p-aria(Add position)").click();
  await page.locator("::-p-aria(Company)").fill("SecondCo");
  await sleep(800);
  let text = await preview(page);
  const expected = ["Quokka Newperson", "Summary text here.", "Hackathon Winner", "Food bank volunteer", "Interests", "Trail running", "Go", "Rust", "Japanese — Intermediate", "CKA — CNCF", "Tiny compiler", "B.S. Math", "FirstCo", "SecondCo"];
  const missing = expected.filter((t) => !text.includes(t));
  check("All section types render in preview", missing.length === 0, missing.join(","));
  d = await v2(page);
  const exp = d.resumes[0].sections.find((s) => s.type === "experience");
  const idsBefore = exp.entries.map((e) => e.id);
  // Reorder entries
  await page.focus("[aria-label^='Reorder New position']");
  await page.keyboard.press("ArrowDown");
  await sleep(600);
  d = await v2(page);
  const idsAfter = d.resumes[0].sections.find((s) => s.type === "experience").entries.map((e) => e.id);
  check("Reordering entries keeps ids", idsAfter.join() === [...idsBefore].reverse().join(), `${idsBefore} -> ${idsAfter}`);
  // Hide awards; rename experience heading; move volunteering up
  await pickOption(page, "Section options for Awards", "Hide from resume");
  await pickOption(page, "Section options for Experience", "Rename section");
  await page.$eval("[aria-label='Section heading']", (el) => (el.value = ""));
  await page.type("[aria-label='Section heading']", "Work History");
  await page.keyboard.press("Enter");
  const secIdsBefore = d.resumes[0].sections.map((s) => s.id);
  await pickOption(page, "Section options for Volunteering", "Move up");
  await sleep(700);
  text = await preview(page);
  d = await v2(page);
  check("Hidden section not on resume but kept in data", !text.includes("Hackathon Winner") && d.resumes[0].sections.some((s) => s.type === "awards" && !s.visible && s.entries[0].title === "Hackathon Winner"));
  check("Editable section title shown", text.includes("Work History"));
  const order = d.resumes[0].sections.map((s) => s.type);
  check("Section reorder saved, ids stable", order.indexOf("volunteering") < order.indexOf("awards") && new Set(d.resumes[0].sections.map((s) => s.id)).size === secIdsBefore.length && secIdsBefore.every((id) => d.resumes[0].sections.some((s) => s.id === id)));
  const volIndex = text.indexOf("Food bank volunteer"), certIndex = text.indexOf("CKA");
  check("Preview follows section order", volIndex > -1 && certIndex > -1);
  // Delete a section, undo, delete again
  const sectionsBefore = d.resumes[0].sections.map((s) => s.id).join();
  await pickOption(page, "Section options for Interests", "Delete section");
  await sleep(600);
  await page.evaluate(() => [...document.querySelectorAll("[role=status] button")].find((b) => b.textContent === "Undo").click());
  await sleep(600);
  d = await v2(page);
  check("Undo restores a section in its original position", d.resumes[0].sections.map((s) => s.id).join() === sectionsBefore);
  await pickOption(page, "Section options for Interests", "Delete section");
  await sleep(600);
  await page.keyboard.press("Escape");
  await sleep(100);
  d = await v2(page);
  check("Delete section, Escape dismisses the undo", !(await page.evaluate(() => [...document.querySelectorAll("[role=status] button")].some((b) => b.textContent === "Undo"))) && !d.resumes[0].sections.some((s) => s.type === "custom") && !(await preview(page)).includes("Trail running"));
  // Photo upload goes to IndexedDB
  await (await page.$("input[type=file]")).uploadFile(PHOTO);
  await page.waitForSelector("img[alt='Your profile photo']");
  await sleep(700);
  d = await v2(page);
  const photos = await idbPhotos(page);
  check("Uploaded photo stored as metadata + IndexedDB blob", d.resumes[0].profile.photo?.width === 400 && !d.resumes[0].profile.photo.inlineData && photos.length === 1);
  // Template switching across all 120 keeps content
  const content = (r) => JSON.stringify({ p: r.profile, s: r.sections });
  const before = content(d.resumes[0]);
  const slugs = await page.$$eval("select option", (os) => os.map((o) => o.value));
  let ok = 0;
  for (const slug of slugs) { await page.select("select", slug); if ((await preview(page)).toLowerCase().includes("quokka newperson")) ok++; }
  await sleep(700);
  d = await v2(page);
  check("All 120 templates render; switching keeps content identical", ok === 120 && slugs.length === 120 && content(d.resumes[0]) === before, `${ok}/${slugs.length}`);
  // Multiple resumes: duplicate shares photo, delete keeps shared photo
  await page.locator("::-p-aria(More actions)").click();
  await page.locator("::-p-aria(Duplicate)[role='menuitem']").click();
  await sleep(700);
  d = await v2(page);
  const [a, b] = d.resumes;
  const aIds = [a.id, ...a.sections.flatMap((s) => [s.id, ...(s.entries ?? []).map((e) => e.id)])];
  const bIds = [b.id, ...b.sections.flatMap((s) => [s.id, ...(s.entries ?? []).map((e) => e.id)])];
  check("Duplicate has fresh ids and same content", d.resumes.length === 2 && !bIds.some((id) => aIds.includes(id)) && b.profile.fullName === a.profile.fullName);
  await page.locator("::-p-aria(More actions)").click();
  await page.locator("::-p-aria(Delete)[role='menuitem']").click();
  await page.waitForSelector("dialog[open]");
  await page.locator("dialog[open] ::-p-text(Delete resume)").click();
  await sleep(700);
  check("Deleting a duplicate keeps the shared photo", (await idbPhotos(page)).length === 1);
  // Reload restores
  await page.reload({ waitUntil: "networkidle0" });
  await openProfile(page);
  check("Reload restores content", (await page.$eval("::-p-aria(Full name)", (e) => e.value)) === "Quokka Newperson");
  // Cross-tab (label-based DOM access: accessibility queries stall with two pages open)
  const fieldValue = (p, label) => p.evaluate((label) => { const l = [...document.querySelectorAll("label")].find((x) => x.textContent.trim() === label); return l && document.getElementById(l.htmlFor)?.value; }, label);
  const typeInto = async (p, label, text) => {
    const id = await p.evaluate((label) => [...document.querySelectorAll("label")].find((x) => x.textContent.trim() === label)?.htmlFor, label);
    await p.click(`[id="${id}"]`, { clickCount: 3 }); await p.keyboard.press("Backspace"); await p.type(`[id="${id}"]`, text);
  };
  const other = await newPage(ctx);
  await other.goto(`${BASE}/editor`);
  await other.waitForFunction(() => [...document.querySelectorAll("label")].some((x) => x.textContent.trim() === "Full name"));
  await openProfile(other);
  await page.bringToFront();
  await typeInto(page, "Full name", "Quokka Crosstab");
  await sleep(1500);
  check("Cross-tab update reaches other tab", (await fieldValue(other, "Full name")) === "Quokka Crosstab");
  await other.bringToFront();
  await typeInto(other, "Job title", "Set in other tab");
  await sleep(1500);
  check("Cross-tab works in both directions", (await fieldValue(page, "Job title")) === "Set in other tab" && (await fieldValue(page, "Full name")) === "Quokka Crosstab");
  const status = await page.$eval("header [title]", (el) => el.textContent);
  check("Status settles on Saved locally in synced tab", status.includes("Saved locally"), status);
  await page.bringToFront();
  await page.screenshot({ path: `${OUT}/p4-editor.png` });
  await ctx.close();
}
check("No resume content in network requests", leaks.length === 0, leaks.join(","));
check("No errors", errors.length === 0, errors.slice(0, 4).join(" | "));
await browser.close();

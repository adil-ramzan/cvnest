// The last open section is remembered per resume, survives a reload, and never
// counts as an edit. Older browsers' data, with no saved section, still loads.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Open section: restored per resume after reload");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const resume = (id, name) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: id === "a" ? 200 : 100,
  profile: { fullName: name, jobTitle: "", email: "", phone: "", location: "" },
  sections: [{ id: `${id}-skills`, type: "skills", title: "Skills", visible: true, items: [] }, { id: `${id}-languages`, type: "languages", title: "Languages", visible: true, items: [] }],
  design: { templateId: "minimal", pageSize: "letter" },
});
const open = () => page.$$eval("h2 button[aria-expanded=true]", (buttons) => buttons.map((b) => b.textContent));
const stored = () => page.evaluate(() => localStorage.getItem("folio.resumes.v2"));
const reload = async () => {
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(1000);
};

await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
await page.evaluate((list) => {
  localStorage.clear();
  localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: list }));
  localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "a", zoom: "fit" }));
}, [resume("a", "First"), resume("b", "Second")]);
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector("select");
await sleep(800);
check("Data with no saved section loads with sections closed", (await open()).length === 0, (await open()).join());

const before = await stored();
await page.locator("h2 button ::-p-text(Languages)").click();
await sleep(400);
check("Opening a section is not an edit", (await stored()) === before);

await reload();
check("The open section comes back after reload", (await open()).length === 1 && (await open())[0].startsWith("Languages"), (await open()).join());
check("The restored section is in view", await page.$eval("h2 button[aria-expanded=true]", (b) => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));

await page.evaluate(() => localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "b", zoom: "fit" })));
await reload();
check("Each resume keeps its own section", (await open()).length === 0, (await open()).join());

await page.evaluate(() => localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "a", zoom: "fit" })));
await reload();
await page.locator("h2 button ::-p-text(Languages)").click();
await sleep(400);
await reload();
check("Closing the section is remembered too", (await open()).length === 0, (await open()).join());

await page.evaluate(() => localStorage.setItem("folio.open-sections", "not json"));
await reload();
check("Unreadable saved section is ignored", (await open()).length === 0);
await page.evaluate(() => localStorage.setItem("folio.open-sections", JSON.stringify({ a: "a-removed-section" })));
await reload();
check("A section that no longer exists is ignored", (await open()).length === 0);

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

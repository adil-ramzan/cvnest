import { readStored } from "./adapter.mjs";
import { BASE, OUT, createChecks, isKnownMissingAsset, launch, sleep } from "./helpers.mjs";

const MARKER = "Zelda Quokkaface";
const check = createChecks("Editor: editing, resumes, storage recovery, mobile");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && !isKnownMissingAsset(m.location()?.url ?? "") && consoleErrors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && !isKnownMissingAsset(r.url()) && consoleErrors.push(`HTTP ${r.status()} ${r.url()}`));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const leaked = [];
page.on("request", (req) => {
  const blob = `${req.url()} ${req.postData() ?? ""} ${JSON.stringify(req.headers())}`;
  if (blob.includes(MARKER) || blob.includes("Quokka")) leaked.push(req.url());
});

const aria = (label) => page.locator(`::-p-aria(${label})`);
const stored = () => readStored(page);
const fieldValue = (label) =>
  page.$eval(`::-p-aria(${label})`, (el) => el.value);

// 1. Template from URL
await page.goto(`${BASE}/editor?template=modern`, { waitUntil: "networkidle0" });
await page.waitForSelector("::-p-aria(Full name)");
check("URL ?template is removed after load", page.url() === `${BASE}/editor`, page.url());
const modernPressed = await page.$eval("select", (el) => el.value);
check("Template from URL selected", modernPressed === "modern", modernPressed);

// 2. Edit content
await aria("Full name").fill(MARKER);
await aria("Job title").fill("Chief Cartographer");
await aria("Email").fill("zelda@example.com");
await page.locator("::-p-text(Jobs, internships and volunteer roles)").click();
await page.locator("::-p-text(Add position)").click();
await sleep(200);
const jobTitleInputs = await page.$$("::-p-aria(Job title)");
await jobTitleInputs[1].type("Map Maker");
await aria("Company").fill("Atlas Co");
await aria("Achievements and responsibilities").fill("Drew 400 maps\nLed survey team");
// Skills
await page.locator("::-p-text(Tools, technologies and strengths)").click();
await aria("Add a skill").fill("Surveying");
await page.keyboard.press("Enter");
await aria("Add a skill").fill("GIS, Python");
await page.keyboard.press("Enter");
// Languages
await page.locator("::-p-text(Languages you speak)").click();
await page.locator("::-p-text(Add language)").click();
await aria("Language").fill("Spanish");
await aria("Proficiency").fill("Fluent");
// Custom section
await aria("Add section").click();
await page.locator("[role='menu'] ::-p-text(Custom section)").click();
await page.type("[aria-label='Section heading']", "Volunteering");
await page.keyboard.press("Enter");
await sleep(900);

const preview = await page.$eval("[aria-label='Resume preview']", (el) => el.innerText);
check("Preview shows name", preview.includes(MARKER));
check("Preview shows experience bullet", preview.includes("Drew 400 maps"));
check("Preview shows skills", preview.includes("Surveying") && preview.includes("Python"));
check("Preview shows language", preview.includes("Spanish — Fluent"));
const status = await page.$eval("header [title]", (el) => el.textContent);
check("Status says Saved locally", status.includes("Saved locally"), status);

let data = await stored();
const active = data?.resumes?.find((r) => r.data.name === MARKER);
check("Autosaved to localStorage", !!active);
check("Saved template is modern", active?.template === "modern", active?.template);
check("Skills split by comma", JSON.stringify(active?.data.skills) === JSON.stringify(["Surveying", "GIS", "Python"]), JSON.stringify(active?.data.skills));
const cookies = await page.cookies();
check("No cookies contain resume data", !cookies.some((c) => c.value.includes("Quokka")), `${cookies.length} cookies`);
await page.screenshot({ path: `${OUT}/editor-desktop.png` });

// 3. Template switching
await page.select("select", "minimal");
await sleep(700);
data = await stored();
check("Switching template persists", data.resumes.find((r) => r.data.name === MARKER)?.template === "minimal");
await page.screenshot({ path: `${OUT}/editor-minimal.png` });

// Zoom
await aria("Zoom in").click();
const zoomBefore = await page.$eval("span[aria-label^='Zoom ']", (el) => el.textContent);
await aria("Zoom in").click();
const zoomText = await page.$eval("span[aria-label^='Zoom ']", (el) => el.textContent);
check("Zoom in increases level", parseInt(zoomText) > parseInt(zoomBefore), `${zoomBefore} -> ${zoomText}`);

// 4. Reload restores
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("::-p-aria(Full name)");
check("Reload restores content", (await fieldValue("Full name")) === MARKER);

// 5. Multiple resumes: new, rename, duplicate, delete
await page.locator("::-p-aria(More actions)").click();
await page.locator("::-p-aria(Rename)[role='menuitem']").click();
await page.waitForSelector("dialog[open]");
await page.$eval("#resume-name", (el) => (el.value = ""));
await page.type("#resume-name", "Cartography CV");
await page.keyboard.press("Enter");
await sleep(700);
data = await stored();
check("Rename persists", data.resumes.some((r) => r.name === "Cartography CV"));

await page.locator("::-p-aria(More actions)").click();
await page.locator("::-p-aria(Duplicate)[role='menuitem']").click();
await sleep(700);
data = await stored();
const copy = data.resumes.find((r) => r.name === "Cartography CV (copy)");
const orig = data.resumes.find((r) => r.name === "Cartography CV");
check("Duplicate creates copy with same content", copy?.data.name === MARKER);
check("Duplicate gets fresh entry ids", copy && orig && copy.data.experience[0].id !== orig.data.experience[0].id);

await page.locator("::-p-aria(Switch resume. Current resume: Cartography CV (copy))").click();
await page.locator("::-p-text(New resume)").click();
await sleep(700);
data = await stored();
check("New resume created (3 total)", data.resumes.length === 3, String(data.resumes.length));
check("New resume is empty", (await fieldValue("Full name")) === "");

await page.locator("::-p-aria(More actions)").click();
await page.locator("::-p-aria(Delete)[role='menuitem']").click();
await page.waitForSelector("dialog[open]");
await page.locator("dialog[open] ::-p-text(Delete resume)").click();
await sleep(700);
data = await stored();
check("Delete removes resume (2 left)", data.resumes.length === 2, String(data.resumes.length));

// Overview tab
await page.locator("[role='tab']::-p-text(Overview)").click();
const overview = await page.$eval("[role='tabpanel']", (el) => el.innerText);
check("Overview lists resumes", overview.includes("Your resumes (2)"));
check("Overview shows privacy statement", overview.includes("It is not uploaded to our servers."));

// 6. Corrupted storage
await page.evaluate(() => localStorage.setItem("folio.resumes.v2", "{not json"));
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("[role='tabpanel']");
const panel = await page.$eval("[role='tabpanel']", (el) => el.innerText);
check("Corrupt storage shows recovery notice", panel.includes("could not be read"));
check("Corrupt original backed up", (await page.evaluate(() => localStorage.getItem("folio.resumes.v2.unreadable-backup"))) === "{not json");
await sleep(700);
data = await stored();
check("Editor recovers with a fresh resume", data?.resumes?.length === 1);

// 7. Outdated / partial data
await page.evaluate(() =>
  localStorage.setItem(
    "folio.resumes.v2",
    JSON.stringify([{ id: "old", name: "Old resume", template: "fancy", data: { name: "Legacy Person", skills: ["A", 5], experience: [{ role: "Dev" }] } }, "garbage"]),
  ),
);
await page.evaluate(() => localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "old", zoom: 99 })));
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector("::-p-aria(Full name)");
check("Outdated data loads", (await fieldValue("Full name")) === "Legacy Person");
const legacyTpl = await page.$eval("select", (el) => el.value);
check("Unknown template falls back to Professional", legacyTpl === "professional", legacyTpl);

// 8. Mobile
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector("::-p-aria(Full name)");
await page.screenshot({ path: `${OUT}/editor-mobile-edit.png` });
await page.locator("button[aria-pressed]::-p-text(Preview)").click();
await sleep(500);
await page.screenshot({ path: `${OUT}/editor-mobile-preview.png` });
const previewVisible = await page.$eval("[aria-label='Resume preview']", (el) => el.getBoundingClientRect().width > 0);
check("Mobile preview toggle shows preview", previewVisible);

check("No network request contained resume content", leaked.length === 0, leaked.join(", "));
check("No console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();

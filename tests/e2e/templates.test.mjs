import { readStored } from "./adapter.mjs";
import { BASE, FIXTURES, OUT, createChecks, isKnownMissingAsset, launch, sleep } from "./helpers.mjs";

const PHOTO = `${FIXTURES}/photo.png`;
const check = createChecks("Templates: gallery, all 65 templates, photos, page size, long and empty resumes");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && !isKnownMissingAsset(r.url()) && errors.push(`HTTP ${r.status()} ${r.url()}`));
const leaks = [];
page.on("request", (req) => { if (req.url().startsWith("data:")) return; const b = `${req.url()} ${req.postData() ?? ""}`; if (b.includes("Xylophone") || b.includes("data:image/jpeg")) leaks.push(req.url()); });

// ---- Gallery
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
const cards = (scope = "main") => page.$$eval(`${scope} article.group`, (els) => els.length);
const status = () => page.$eval("main [role=status]", (el) => el.textContent);
check("Seven sections show their first 6 templates", (await cards()) === 42, String(await cards()));
const counts = await page.$$eval("[aria-label='Template categories'] a", (as) => as.map((a) => a.textContent));
check("Category counts", counts.join("|") === "Simple10|Modern11|Creative12|Photo9|Compact8|First Job8|Executive7", counts.join("|"));
await page.click("#photo button[aria-expanded]");
await sleep(200);
check("See more reveals the rest of a category", (await cards("#photo")) === 9, String(await cards("#photo")));
await page.click("[aria-label='Template categories'] a[href='#compact']");
await sleep(1200);
check("Chip scrolls its section below the sticky bars", await page.$eval("#compact h2", (el) => { const top = el.getBoundingClientRect().top; return top > 120 && top < 300; }));
check("Chip for the section in view is highlighted", (await page.$eval("[aria-label='Template categories'] [aria-current]", (el) => el.textContent)).startsWith("Compact"));
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.type("input[type=search]", "serif");
await sleep(200);
const serifCount = await cards();
check("Search 'serif' lists matches with a live count", serifCount > 3 && serifCount < 65 && (await status()).startsWith(`${serifCount} `), await status());
check("Search hides the category chips", (await page.$("[aria-label='Template categories']")) === null);
await page.$eval("input[type=search]", (el) => el.select());
await page.type("input[type=search]", "zzzqqq");
await sleep(200);
check("No-results empty state", (await cards()) === 0 && (await page.$("::-p-text(No templates match)")) !== null);
await page.locator("::-p-text(Clear search)").click();
await sleep(200);
check("Clear search restores the sections", (await page.$("#executive")) !== null);
await page.click("article.group .card-open");
await page.waitForSelector("dialog[open] .resume-paper", { timeout: 15000 });
check("Card opens the preview modal", await page.$eval("dialog[open]", (el) => el.textContent.includes("Use This Template")));
await page.keyboard.press("Escape");
await page.goto(`${BASE}/templates?category=executive`, { waitUntil: "networkidle0" });
await sleep(400);
check("?category=executive deep link", await page.$eval("#executive h2", (el) => el.getBoundingClientRect().top < 400));

// ---- Detail pages + Use Template
await page.$$eval("main section button[aria-expanded='false']", (buttons) => buttons.forEach((button) => button.click()));
await sleep(300);
const slugs = await page.$$eval("main a[aria-label^='Use ']", (as) => as.map((a) => new URL(a.href).searchParams.get("template")));
let okPages = 0;
for (const slug of slugs) { const r = await fetch(`${BASE}/templates/${slug}`); if (r.ok) okPages++; }
check("All 65 detail pages load", okPages === 65 && slugs.length === 65, `${okPages}/${slugs.length}`);

await page.goto(`${BASE}/templates/kinetic`, { waitUntil: "networkidle0" });
await page.locator("::-p-text(Use This Free Template)").click();
await page.waitForSelector("select");
await sleep(300);
check("Use This Template opens editor with Kinetic", (await page.$eval("select", (s) => s.value)) === "kinetic");
await page.click("[aria-controls='personal-form']");
await page.locator("::-p-aria(Full name)").fill("Xylophone Testperson");
await page.locator("::-p-aria(Job title)").fill("Test Title");
await sleep(600);

// ---- Cycle through every template with real content
const previewText = () => page.$eval("[aria-label='Resume preview']", (el) => el.textContent);
const overflow = () => page.$eval(".resume-page", (el) => el.scrollWidth - el.clientWidth);
let rendered = 0, overflowed = [];
for (const slug of slugs) {
  await page.select("select", slug);
  const text = await previewText();
  if (text.includes("Xylophone Testperson")) rendered++;
  if ((await overflow()) > 1) overflowed.push(slug);
}
check("Every template renders the user's content", rendered === 65, `${rendered}/65`);
check("No horizontal overflow", overflowed.length === 0, overflowed.join(","));
await sleep(600);
let saved = await readStored(page);
const mine = saved.resumes.find((r) => r.data.name === "Xylophone Testperson");
check("Switching templates preserves content", mine?.template === slugs[slugs.length - 1] && mine.data.title === "Test Title");

// ---- Photo upload
const fileInput = await page.$("input[type=file]");
await fileInput.uploadFile(PHOTO);
await page.waitForSelector("img[alt='Your profile photo']", { timeout: 5000 });
await page.select("select", "portrait");
await sleep(700);
saved = await readStored(page);
const photo = saved.resumes.find((r) => r.data.name === "Xylophone Testperson")?.data.photo ?? {};
check("Photo stored locally as resized JPEG", photo.mimeType === "image/jpeg" && photo.width === 400 && !photo.inlineData, JSON.stringify(photo).slice(0, 80));
const imgSize = await page.$eval("[aria-label='Resume preview'] img", (img) => [img.naturalWidth, img.naturalHeight]);
check("Photo appears in photo template", imgSize[0] === 400 && imgSize[1] === 400, imgSize.join("x"));
await page.select("select", "classic");
check("Non-photo template hides photo", (await page.$("[aria-label='Resume preview'] img")) === null);
await page.screenshot({ path: `${OUT}/p3-editor.png` });
await page.select("select", "portrait");

// ---- Page size
await page.locator("[role='tab']::-p-text(Customize)").click();
await page.locator("::-p-text(A4)").click();
await sleep(700);
saved = await readStored(page);
check("A4 page size saved", saved.resumes.find((r) => r.data.name === "Xylophone Testperson")?.pageSize === "a4");
const ratio = await page.$eval("[aria-label='Resume preview'] .resume-paper", (el) => el.classList.contains("resume-paper--a4"));
check("Preview uses A4 paper", ratio);
await page.screenshot({ path: `${OUT}/p3-customize.png` });
await page.locator("[role='tab']::-p-text(Content)").click();

// ---- Empty and very long resumes in every template
await page.evaluate(() => {
  const long = "Long".repeat(60);
  const job = (i) => ({ id: "j" + i, role: "Role " + i + " " + long, company: "Company", location: "Remote", start: "2010", end: "2020", highlights: Array(5).fill("A long achievement line that keeps going to test wrapping behaviour across narrow columns and sidebars " + i) });
  localStorage.removeItem("folio.resumes.v2"); localStorage.setItem("folio.resumes", JSON.stringify({ version: 1, resumes: [
    { id: "empty", name: "Empty", template: "professional", pageSize: "letter", createdAt: 1, updatedAt: 3, data: {} },
    { id: "long", name: "Long", template: "professional", pageSize: "letter", createdAt: 1, updatedAt: 2, data: { name: "Averyveryverylongname " + long, title: long, contact: { email: long + "@example.com", phone: "1", location: long, website: "https://example.com/" + long },
      summary: long + " " + long, experience: Array.from({ length: 12 }, (_, i) => job(i)), education: [{ id: "e", degree: long, school: long, start: "1", end: "2" }],
      skills: Array.from({ length: 40 }, (_, i) => "Skill" + i), projects: [{ id: "p", name: long, description: long }], certifications: [long], languages: [long], customSections: [{ id: "c", title: long, items: [{ id: "i", title: long, description: long }] }] } },
  ] }));
  localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "empty", zoom: "fit" }));
});
for (const id of ["empty", "long"]) {
  await page.evaluate((id) => localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: id, zoom: "fit" })), id);
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  let bad = [];
  for (const slug of slugs) {
    await page.select("select", slug);
    const t = await previewText();
    if (id === "empty" && !t.includes("Load sample data")) bad.push(slug);
    if ((await overflow()) > 1) bad.push(slug + "(overflow)");
  }
  if (id === "long") await page.screenshot({ path: `${OUT}/p3-long.png` });
  check(`${id === "empty" ? "Empty" : "Very long"} resume renders in all templates`, bad.length === 0, bad.slice(0, 6).join(","));
}

check("No resume data or photo in network requests", leaks.length === 0, leaks.join(","));
check("No errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();

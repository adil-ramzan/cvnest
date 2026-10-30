import { readStored } from "./adapter.mjs";
import { BASE, FIXTURES, OUT, createChecks, isKnownMissingAsset, launch, sleep } from "./helpers.mjs";

const PHOTO = `${FIXTURES}/photo.png`;
const check = createChecks("Templates: gallery, all 45 templates, photos, page size, long and empty resumes");
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
const visible = () => page.$$eval("#template-grid > li", (els) => els.filter((e) => !e.hidden).length);
check("Gallery shows 45 templates", (await visible()) === 45, String(await visible()));
const counts = await page.$$eval("[aria-label='Filter by category'] button", (bs) => bs.map((b) => b.textContent));
check("Category counts", counts.join("|") === "All45|Simple8|Modern8|Creative8|Photo5|Compact5|First Job6|Executive5", counts.join("|"));
await page.locator("[aria-label='Filter by category'] button::-p-text(Photo)").click();
await sleep(200);
check("Photo filter shows 5", (await visible()) === 5);
check("Category reflected in URL", page.url().endsWith("?category=photo"), page.url());
await page.locator("[aria-label='Filter by category'] button::-p-text(All)").click();
await page.type("input[type=search]", "serif");
await sleep(200);
const serifCount = await visible();
check("Search 'serif' narrows results", serifCount > 3 && serifCount < 45, String(serifCount));
await page.$eval("input[type=search]", (el) => { el.value = ""; });
await page.type("input[type=search]", "zzzqqq");
await sleep(200);
check("No-results empty state", (await visible()) === 0 && (await page.$("::-p-text(No templates match)")) !== null);
await page.locator("::-p-text(Clear filters)").click();
await sleep(200);
check("Clear filters restores all", (await visible()) === 45);
await page.goto(`${BASE}/templates?category=executive`, { waitUntil: "networkidle0" });
await sleep(200);
check("?category=executive deep link", (await visible()) === 5);

// ---- Detail pages + Use Template
const slugs = await page.$$eval("#template-grid > li a[aria-label^='Use ']", (as) => as.map((a) => new URL(a.href).searchParams.get("template")));
let okPages = 0;
for (const slug of slugs) { const r = await fetch(`${BASE}/templates/${slug}`); if (r.ok) okPages++; }
check("All 45 detail pages load", okPages === 45 && slugs.length === 45, `${okPages}/${slugs.length}`);

await page.goto(`${BASE}/templates/kinetic`, { waitUntil: "networkidle0" });
await page.locator("::-p-text(Use This Free Template)").click();
await page.waitForSelector("select");
await sleep(300);
check("Use This Template opens editor with Kinetic", (await page.$eval("select", (s) => s.value)) === "kinetic");
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
check("Every template renders the user's content", rendered === 45, `${rendered}/45`);
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
    if (id === "empty" && !t.includes("Your Name")) bad.push(slug);
    if ((await overflow()) > 1) bad.push(slug + "(overflow)");
  }
  if (id === "long") await page.screenshot({ path: `${OUT}/p3-long.png` });
  check(`${id === "empty" ? "Empty" : "Very long"} resume renders in all templates`, bad.length === 0, bad.slice(0, 6).join(","));
}

check("No resume data or photo in network requests", leaks.length === 0, leaks.join(","));
check("No errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();

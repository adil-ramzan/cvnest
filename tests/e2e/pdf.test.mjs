// Exports every template as a PDF through the editor's Save as PDF button and
// checks the files with poppler-utils (pdfinfo, pdftotext, pdfimages): page
// size, selectable text, no blank pages, text inside the page, photos only
// where the template shows one, no overlapping text, and a reading order that
// keeps each bullet whole. Skips itself if poppler isn't installed.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks, launch, sleep } from "./helpers.mjs";
import { longResume } from "./long-resume.mjs";

if (spawnSync("pdfinfo", ["-v"]).error) {
  console.log("\nPDF export\nSKIP  poppler-utils (pdfinfo, pdftotext, pdfimages) not installed");
  process.exit(0);
}

const check = createChecks("PDF export: all templates, Letter and A4, long, partial and empty resumes");
const dir = path.join(OUT, "pdf");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8");
const fixture = JSON.parse(fs.readFileSync(`${FIXTURES}/v1-resumes.json`, "utf8"));
const registry = fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8");
const photoMode = Object.fromEntries([...registry.matchAll(/slug: "([^"]+)",[\s\S]*?photo: "(always|optional|none)"/g)].map((m) => [m[1], m[2]]));
const handWritten = new Set(["professional", "modern", "minimal"]); // these never show a photo

// Many long bullets, so section cards split across pages (audit T-01) and sidebars run beside bullets (T-02).
const denseBullet = (e, b) => `Led a cross-functional programme that reduced cost across several regions and improved reliability for every customer group involved over the year D${e}x${b}D`;
const dense = {
  schemaVersion: 2, id: "dense", name: "Dense", createdAt: 1, updatedAt: 2,
  profile: { fullName: "Dana Densely", jobTitle: "Principal Engineer", email: "dana@example.com", phone: "+1 555 0101", location: "Seattle, WA" },
  sections: [
    { id: "d1", type: "summary", title: "Profile", visible: true, content: "Principal engineer with fifteen years of experience building distributed systems." },
    { id: "d2", type: "experience", title: "Experience", visible: true, entries: Array.from({ length: 9 }, (_, e) => ({ id: `de${e}`, role: `Role ${e} Lead`, company: `Company ${e}`, location: "Remote", startDate: `${2023 - e * 2}`, endDate: `${2024 - e * 2}`, highlights: Array.from({ length: 6 }, (_, b) => denseBullet(e, b)) })) },
    { id: "d3", type: "education", title: "Education", visible: true, entries: [{ id: "ded1", degree: "M.S. Computer Science", school: "State University", startDate: "2008", endDate: "2010" }, { id: "ded2", degree: "B.S. Computer Science", school: "State University", startDate: "2004", endDate: "2008" }] },
    { id: "d4", type: "skills", title: "Skills", visible: true, entries: Array.from({ length: 24 }, (_, i) => ({ id: `dsk${i}`, name: `Skill${i}` })) },
    { id: "d5", type: "languages", title: "Languages", visible: true, entries: [{ id: "dl1", name: "English", proficiency: "Native" }] },
  ],
  design: { templateId: "professional", pageSize: "letter" },
};
const denseBullets = Array.from({ length: 9 }, (_, e) => Array.from({ length: 6 }, (_, b) => denseBullet(e, b))).flat();
const empty = { schemaVersion: 2, id: "empty", name: "Empty", createdAt: 1, updatedAt: 2, profile: {}, sections: [], design: { templateId: "professional", pageSize: "a4" } };
const datasets = [
  ["long", "letter", { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [longResume(photo)] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "long", zoom: "fit" }) }],
  ["long", "a4", null],
  ["fixture", "letter", { "folio.resumes": fixture.resumes, "folio.editor-settings": fixture.settings }],
  ["dense", "letter", { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [dense] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "dense", zoom: "fit" }) }],
  ["empty", "a4", { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [empty] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "empty", zoom: "fit" }) }],
];
const expectedText = {
  long: ["zz-end-marker", "seniorplatformengineer8", "m.s.computerscience3", "skill23", "cka", "alexandra", "opensourcecli", "supercalifragilistic", "2010"],
  fixture: ["legacylenafixture", "seniordataengineer", "streamline", "python", "german", "streamingatscale"],
  empty: ["yourname"],
  dense: ["danadensely", "d0x0d", "d8x5d", "skill23"],
};
// Bullets that must come out of plain-text extraction whole, and how many times each.
const longBullets = [
  "Led the migration of a monolith to event-driven services, cutting p95 latency by 45% and infrastructure cost by 30% across four regions.",
  "Mentored eight engineers; introduced design reviews and an on-call rotation that halved incident time.",
];
const wholeBullets = { long: [longBullets, 9], dense: [denseBullets, 1] };
const pageSizes = { letter: [612, 792], a4: [594.96, 841.92] };

// ---- Export
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.evaluateOnNewDocument(() => {
  window.print = () => {
    window.__printed = (window.__printed || 0) + 1;
  };
});
const errors = [];
const leaks = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("request", (r) => {
  const url = r.url();
  if (url.startsWith("data:") || url.startsWith("blob:")) return;
  if (/Alexandra|Legacy Lena|Montgomery/.test(url + (r.postData() ?? ""))) leaks.push(url);
});

const clickTab = (name) => page.evaluate((n) => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === n).click(), name);
const files = [];
for (const [name, size, storage] of datasets) {
  if (storage) {
    await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
    await page.evaluate((st) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v);
    }, storage);
  }
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(1500);
  await clickTab("Customize");
  await sleep(300);
  await page.evaluate((s) => [...document.querySelectorAll("input[name=page-size]")].find((i) => i.value === s).click(), size);
  await sleep(500);
  await clickTab("Content");
  await sleep(300);
  const slugs = await page.$$eval("select option", (os) => os.map((o) => o.value));
  for (const slug of slugs) {
    await page.select("select", slug);
    await sleep(150);
    const before = await page.evaluate(() => window.__printed || 0);
    await page.evaluate(async () => {
      [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click();
      await new Promise((resolve) => setTimeout(resolve, 60));
      [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Save as PDF anyway")?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
      [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Continue")?.click();
    });
    await page.waitForFunction((b) => (window.__printed || 0) > b, {}, before);
    const file = path.join(dir, `${name}-${size}-${slug}.pdf`);
    await page.pdf({ path: file, preferCSSPageSize: true });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await page.waitForFunction(() => !document.querySelector(".print-root"));
    files.push({ file, name, size, slug });
  }
}

// ---- Very long resumes: dozens of pages, in four layouts. Page count must keep growing
// with the content (no cap), match the preview, and lose or repeat nothing.
const huge = {
  ...dense, id: "huge", name: "Huge",
  sections: [
    ...dense.sections.filter((section) => section.type !== "experience"),
    { id: "h2", type: "experience", title: "Experience", visible: true, entries: Array.from({ length: 70 }, (_, e) => ({ id: `he${e}`, role: `Role ${e} Lead`, company: `Company ${e}`, startDate: "2010", endDate: "2011", highlights: Array.from({ length: 6 }, (_, b) => `${denseBullet(e, b)} H${e}x${b}H`) })) },
    { id: "h9", type: "custom", title: "Final Marker Section", visible: true, entries: [{ id: "hz", title: "HUGE-END-MARKER", description: "Last item in the document." }] },
  ],
};
const hugeRuns = [];
for (const slug of ["professional", "halcyon", "kite", "tessera"]) {
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((r) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] })); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: r.id, zoom: "fit" })); localStorage.setItem("folio.print-notice-hidden", "1"); }, { ...huge, design: { templateId: slug, pageSize: "letter" } });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".resume-page");
  let preview = null;
  for (let k = 0; k < 30; k++) { await sleep(400); const now = await page.evaluate(() => document.body.innerText.match(/about (\d+) pages?/)?.[1] ?? null); if (now && now === preview) break; preview = now; }
  const before = await page.evaluate(() => window.__printed || 0);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForFunction((b) => (window.__printed || 0) > b, { timeout: 120000 }, before);
  const file = path.join(dir, `huge-${slug}.pdf`);
  await page.pdf({ path: file, preferCSSPageSize: true, timeout: 240000 });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  hugeRuns.push({ slug, file, preview: Number(preview) });
}
// ---- Short paragraphs stay whole: an education note or project description of two or
// three lines must not print one line on each side of a page break. These two resumes
// reproduced that break in Minimal and Kinetic before the fix; exact text matters, since
// it decides where pages end.
const shortNote = "Thesis on distributed consensus; teaching assistant for two years.";
const shortDescription = "An open source tool used by thousands of developers to manage deployments and releases safely.";
const work = "Coordinated delivery across product, design and engineering, aligned stakeholders on scope and measured outcomes against agreed targets";
const caseResume = (id, { jobs, bullets, edu, certs, projects }) => ({
  schemaVersion: 2, id: `case-${id}`, name: `Case ${id}`, createdAt: 1, updatedAt: 2,
  profile: { fullName: "Jordan Avery", jobTitle: "Delivery Lead", email: "jordan@example.com", phone: "+1 555 0100", location: "Austin, TX", linkedin: "linkedin.com/in/jordan", website: "jordan.example.com" },
  sections: [
    { id: "s", type: "summary", title: "Profile", visible: true, content: `Delivery lead with a long record of shipping reliable products for demanding customers across several industries. ${id}SUMQ` },
    { id: "x", type: "experience", title: "Experience", visible: true, entries: Array.from({ length: jobs }, (_, e) => ({ id: `x${e}`, role: `Role ${e} Lead`, company: `Company ${e}`, location: "Remote", startDate: `${2024 - e}`, endDate: e === 0 ? "Present" : `${2025 - e}`, highlights: Array.from({ length: bullets }, (_, b) => `${work} ${id}${e}x${b}Q`) })) },
    { id: "e", type: "education", title: "Education", visible: true, entries: Array.from({ length: edu }, (_, i) => ({ id: `e${i}`, degree: `Degree ${i} ${id}ED${i}Q`, school: "State University", startDate: "2004", endDate: "2008", details: edu > 3 ? shortNote : "" })) },
    { id: "k", type: "skills", title: "Skills", visible: true, entries: Array.from({ length: 8 }, (_, i) => ({ id: `k${i}`, name: i === 0 ? `Skill0 ${id}SKQ` : `Skill${i}` })) },
    ...(certs ? [{ id: "c", type: "certifications", title: "Certifications", visible: true, entries: Array.from({ length: certs }, (_, i) => ({ id: `c${i}`, name: `Certification ${i} ${id}C${i}Q`, issuer: "Institute", date: "2021" })) }] : []),
    ...(projects ? [{ id: "p", type: "projects", title: "Projects", visible: true, entries: Array.from({ length: projects }, (_, i) => ({ id: `p${i}`, name: `Project ${i} ${id}P${i}Q`, role: "Maintainer", link: `https://example.org/project-${i}`, description: shortDescription })) }] : []),
    { id: "z", type: "custom", title: "Final Section", visible: true, entries: [{ id: "z0", title: `FINALMARK ${id}ENDQ`, description: "The last line of the resume." }] },
  ],
  design: { templateId: "professional", pageSize: "letter" },
});
const noteCases = [
  ["minimal", caseResume("F", { jobs: 2, bullets: 3, edu: 14, certs: 40, projects: 0 })],
  ["kinetic", caseResume("C", { jobs: 7, bullets: 5, edu: 2, certs: 3, projects: 3 })],
  ["professional", caseResume("F", { jobs: 2, bullets: 3, edu: 14, certs: 40, projects: 0 })],
];
const noteRuns = [];
for (const [slug, base] of noteCases) {
  const resume = { ...base, design: { templateId: slug, pageSize: "letter" } };
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((r) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] })); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: r.id, zoom: "fit" })); localStorage.setItem("folio.print-notice-hidden", "1"); }, resume);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".resume-page");
  await sleep(1500);
  const before = await page.evaluate(() => window.__printed || 0);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForFunction((b) => (window.__printed || 0) > b, { timeout: 60000 }, before);
  const file = path.join(dir, `notes-${slug}-${base.id}.pdf`);
  await page.pdf({ path: file, preferCSSPageSize: true });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  noteRuns.push({ label: `${slug} ${base.name}`, file });
}
await browser.close();
check("Exported a PDF for every template and dataset", files.length === datasets.length * 120, String(files.length));
check("No page errors during export", errors.length === 0, errors.slice(0, 2).join(" | "));
check("No resume content in network requests", leaks.length === 0, leaks.join(", "));

// ---- Verify
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const problems = [];
const overlaps = [];
const readingOrder = [];
let leastFilled = 1;
for (const { file, name, size, slug } of files) {
  const label = `${name}-${size}-${slug}`;
  const info = run("pdfinfo", [file]);
  const pages = Number(info.match(/Pages:\s+(\d+)/)[1]);
  const [w, h] = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/).slice(1).map(Number);
  const [ew, eh] = pageSizes[size];
  if (Math.abs(w - ew) > 1 || Math.abs(h - eh) > 1) problems.push(`${label}: page size ${w}x${h}`);
  if (name === "empty" && pages !== 1) problems.push(`${label}: empty resume has ${pages} pages`);

  const text = run("pdftotext", [file, "-"]).toLowerCase().replace(/\s+/g, "");
  for (const expected of expectedText[name]) if (!text.includes(expected)) problems.push(`${label}: missing text "${expected}"`);

  const bbox = run("pdftotext", ["-bbox", file, "-"]);
  [...bbox.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)].forEach((m, index) => {
    const [pw, ph] = [Number(m[1]), Number(m[2])];
    const words = [...m[3].matchAll(/xMin="([-\d.]+)" yMin="([-\d.]+)" xMax="([-\d.]+)" yMax="([-\d.]+)"/g)].map((x) => x.slice(1).map(Number));
    if (!words.length) return problems.push(`${label}: page ${index + 1} is blank`);
    if (words.some(([x0, y0, x1, y1]) => x0 < -0.5 || y0 < -0.5 || x1 > pw + 0.5 || y1 > ph + 0.5)) problems.push(`${label}: text outside page ${index + 1}`);
    if (name === "long" && index < pages - 1) leastFilled = Math.min(leastFilled, Math.max(...words.map((x) => x[3])) / ph);
  });

  if (name === "long" && size === "letter") {
    const urls = run("pdfinfo", ["-url", file]);
    for (const expected of ["https://linkedin.com/in/alexandra", "https://github.com/alexandra", "mailto:alexandra@example.com", "https://alexandra.example.com/portfolio"]) {
      if (!urls.includes(expected)) problems.push(`${label}: no link to ${expected}`);
    }
    if (!/github\.com\/alexandra\/cli/.test(urls)) problems.push(`${label}: no project link`);
    if (/javascript:|data:/i.test(urls)) problems.push(`${label}: unsafe link`);
  }

  // Overlapping text (audit T-01): body-size lines whose boxes intersect. Display-size
  // names are left out, because pdftotext gives them boxes far taller than the letters.
  [...run("pdftotext", ["-bbox-layout", file, "-"]).split("<page ").slice(1).entries()].forEach(([index, chunk]) => {
    const lines = [...chunk.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/line>/g)]
      .map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], text: [...m[5].matchAll(/<word[^>]*>([\s\S]*?)<\/word>/g)].map((w) => w[1]).join(" ") }))
      .filter((l) => l.text.trim() && l.y1 - l.y0 <= 24);
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      const [A, B] = [lines[a], lines[b]];
      const w = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), h = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      if (w > 3 && h > Math.min(A.y1 - A.y0, B.y1 - B.y0) * 0.5) overlaps.push(`${label} page ${index + 1}: "${A.text.slice(0, 30)}" over "${B.text.slice(0, 30)}"`);
    }
  });

  // Reading order (audit T-02): in the order the PDF draws its text, each bullet must come
  // out whole, with no sidebar text mixed into it. Compared without spaces, because some
  // fonts don't encode them. (pdftotext's default mode re-sorts text by position instead,
  // and still mixes columns in some sidebar layouts; see the audit report.)
  if (wholeBullets[name]) {
    const [sentences, times] = wholeBullets[name];
    const drawn = run("pdftotext", ["-raw", "-enc", "UTF-8", file, "-"]).replace(/\s+/g, "");
    const broken = sentences.filter((sentence) => drawn.split(sentence.replace(/\s+/g, "")).length - 1 !== times);
    if (broken.length) readingOrder.push(`${label}: ${broken.length} bullet(s) split, e.g. "${broken[0].slice(-30)}"`);
  }

  const images = run("pdfimages", ["-list", file]).split("\n").slice(2).filter((l) => l.trim()).length;
  const showsPhoto = name !== "empty" && name !== "dense" && photoMode[slug] !== "none" && !handWritten.has(slug);
  if (showsPhoto && images !== 1) problems.push(`${label}: expected the photo, found ${images} images`);
  if (!showsPhoto && images !== 0) problems.push(`${label}: unexpected images (${images})`);
}
check("All PDFs pass size, text, bounds, blank-page and image checks", problems.length === 0, problems.slice(0, 5).join(" | "));
check("Non-final pages are well filled (no premature page breaks)", leastFilled >= 0.75, `${Math.round(leastFilled * 100)}% minimum`);
const hugeProblems = [];
for (const { slug, file, preview } of hugeRuns) {
  const pages = Number(execFileSync("pdfinfo", [file], { encoding: "utf8" }).match(/Pages:\s+(\d+)/)[1]);
  const drawn = execFileSync("pdftotext", ["-raw", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).replace(/\s+/g, "");
  const counts = Array.from({ length: 70 * 6 }, (_, i) => drawn.split(`H${Math.floor(i / 6)}x${i % 6}H`).length - 1);
  const blank = [...execFileSync("pdftotext", ["-bbox", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).matchAll(/<page [^>]*>([\s\S]*?)<\/page>/g)].filter((m) => !m[1].includes("<word")).length;
  if (pages < 20) hugeProblems.push(`${slug}: only ${pages} pages`);
  if (pages !== preview) hugeProblems.push(`${slug}: preview says ${preview}, PDF has ${pages}`);
  if (counts.some((n) => n !== 1)) hugeProblems.push(`${slug}: ${counts.filter((n) => n === 0).length} bullets missing, ${counts.filter((n) => n > 1).length} repeated`);
  if (!drawn.includes("HUGE-END-MARKER")) hugeProblems.push(`${slug}: final section missing`);
  if (blank) hugeProblems.push(`${slug}: ${blank} blank pages`);
}
check("Very long resumes export in full, page count matching the preview", hugeRuns.length === 4 && hugeProblems.length === 0, hugeProblems.join(" | ") || hugeRuns.map((r) => `${r.slug} ${r.preview}p`).join(", "));
const splitNotes = [];
for (const { label, file } of noteRuns) {
  const pageLines = [...execFileSync("pdftotext", ["-bbox-layout", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).matchAll(/<page [^>]*>([\s\S]*?)<\/page>/g)].map((m) =>
    [...m[1].matchAll(/<line xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([\s\S]*?)<\/line>/g)]
      .map((l) => ({ top: +l[1], bottom: +l[2], text: [...l[3].matchAll(/<word[^>]*>([\s\S]*?)<\/word>/g)].map((w) => w[1]).join(" ") }))
      .filter((l) => l.text.trim()));
  for (let i = 1; i < pageLines.length; i++) {
    const last = [...pageLines[i - 1]].sort((a, b) => a.bottom - b.bottom).at(-1)?.text ?? "";
    const first = [...pageLines[i]].sort((a, b) => a.top - b.top)[0]?.text ?? "";
    const joined = `${last} ${first}`.replace(/\s+/g, " ").trim();
    if ([shortNote, shortDescription].some((paragraph) => paragraph.includes(joined))) splitNotes.push(`${label} p${i}/${i + 1}: "${last.slice(-25)}" | "${first.slice(0, 25)}"`);
  }
}
check("Short paragraphs never split one line per page", noteRuns.length === noteCases.length && splitNotes.length === 0, splitNotes.join(" | "));
check("No overlapping text in any PDF", overlaps.length === 0, `${overlaps.length}: ${overlaps.slice(0, 3).join(" | ")}`);
check("Plain-text reading order keeps every bullet whole", readingOrder.length === 0, `${readingOrder.length}: ${readingOrder.slice(0, 4).join(" | ")}`);

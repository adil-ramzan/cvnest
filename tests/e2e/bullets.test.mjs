// Pasted bullets in free-text fields: for every template, the preview and the real
// PDF show the same text, with no marker left over and nothing lost.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch } from "./helpers.mjs";
import { buildResume, chromeExporter, firefoxExporter, readLines, storageFor } from "./pagination-lib.mjs";

if (spawnSync("pdftotext", ["-v"]).error) {
  console.log("\nPasted bullets\nSKIP  poppler-utils not installed");
  process.exit(0);
}
const check = createChecks("Pasted bullets: preview and PDF match on every template");
const WORDS = ["PROJA", "PROJB", "PROJC", "EDUA", "CUSTA", "CUSTB", "AWARDA", "SUMMA"];
// A template's own marker can be text in a PDF, so a lone "•" or "–" there is fine. Two would be a pasted one.
const LEFTOVER = new RegExp(`(?:^|\\s)(?:[-*]|•\\s*•)\\s*(?:${WORDS.join("|")})`);
const file = path.join(OUT, "bullets.pdf");
const slugs = [...fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8").matchAll(/^    slug: "([^"]+)"/gm)].map((m) => m[1]);

function resumeFor(slug, size) {
  const resume = buildResume({ slug, size, bullets: 4 });
  resume.sections = resume.sections.filter((s) => !["summary", "education"].includes(s.type));
  resume.sections.unshift(
    { id: "b1", type: "summary", title: "Profile", visible: true, content: "- SUMMA a pasted summary line" },
    { id: "b2", type: "projects", title: "Projects", visible: true, entries: [{ id: "bp", name: "Project One", description: "- PROJA developed a responsive site\n• PROJB built the tests\n* PROJC shipped it" }] },
    { id: "b3", type: "education", title: "Education", visible: true, entries: [{ id: "be", degree: "Degree", school: "School", details: "- EDUA with honors" }] },
    { id: "b4", type: "custom", title: "Other", visible: true, entries: [{ id: "bc", title: "Item", description: "Intro line\n- CUSTA one\n- CUSTB two" }] },
    { id: "b5", type: "awards", title: "Awards", visible: true, entries: [{ id: "ba", title: "Award", description: "• AWARDA for service" }] },
  );
  return resume;
}

const browser = await launch();
const run = await chromeExporter(browser, BASE);
// Its own browser: a background tab would stall the exporter's page, and the two would share storage.
const previewBrowser = await launch();
const preview = await previewBrowser.newPage();
await preview.setViewport({ width: 1280, height: 800 });
const previewText = async (resume) => {
  await preview.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  await preview.evaluate((storage) => { localStorage.clear(); for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v); }, storageFor(resume));
  await preview.goto(`${BASE}/editor`, { waitUntil: "load" });
  await preview.waitForSelector("[aria-label='Resume preview'] .resume-page");
  return preview.$eval("[aria-label='Resume preview'] .resume-paper", (el) => ({ text: el.textContent, items: [...el.querySelectorAll("li")].map((li) => li.textContent.trim()) }));
};
const pdfText = () => readLines(file).flatMap((page) => page.lines.map((line) => line.text)).join("\n");

const problems = [];
for (const [i, slug] of slugs.entries()) {
  const resume = resumeFor(slug, i % 2 ? "a4" : "letter");
  const shown = await previewText(resume);
  await run(resume, file);
  const pdf = pdfText();
  if (LEFTOVER.test(shown.text)) problems.push(`${slug}: marker in preview`);
  if (LEFTOVER.test(pdf)) problems.push(`${slug}: marker in PDF`);
  for (const word of WORDS) {
    if (!shown.text.includes(word)) problems.push(`${slug}: ${word} missing from preview`);
    if (!pdf.includes(word)) problems.push(`${slug}: ${word} missing from PDF`);
  }
  if (!["PROJA", "PROJC", "CUSTA", "SUMMA"].every((word) => shown.items.some((item) => item.includes(word)))) problems.push(`${slug}: not real bullets`);
}
check(`All ${slugs.length} templates: no leftover markers, nothing lost, real bullets, preview matches PDF`, problems.length === 0, problems.slice(0, 6).join("; "));
await browser.close();
await previewBrowser.close();

if (spawnSync("firefox", ["--version"]).error || spawnSync("geckodriver", ["--version"]).error) {
  console.log("SKIP  Firefox pasted bullets: needs firefox and geckodriver");
} else {
  const firefox = await firefoxExporter(BASE, 4900 + Math.floor(Math.random() * 90));
  const missed = [];
  for (const slug of ["professional", "minimal", "modern", "atlas", "marquee", "terrazzo", "almanac"]) {
    await firefox(resumeFor(slug, "a4"), file);
    const pdf = pdfText();
    if (LEFTOVER.test(pdf) || !WORDS.every((word) => pdf.includes(word))) missed.push(slug);
  }
  await firefox.close();
  check("Firefox: same result on one template per layout", missed.length === 0, missed.join(", "));
}
process.exit(0);

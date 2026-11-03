// Firefox only: long resumes whose page breaks used to end the PDF with a blank page.
// Firefox splits a positioned marker that crosses the end of a page, and when its entry
// then moves whole to the next page, the leftover piece adds a page to the print frame.
// These lengths put a timeline dot or a bullet dot on that edge. Skips itself without
// Firefox, geckodriver or poppler-utils.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks } from "./helpers.mjs";
import { longResume } from "./long-resume.mjs";
import { firefoxExporter } from "./pagination-lib.mjs";

if (spawnSync("pdfinfo", ["-v"]).error || spawnSync("firefox", ["--version"]).error || spawnSync("geckodriver", ["--version"]).error) {
  console.log("\nPDF export in Firefox: no blank last page\nSKIP  needs firefox, geckodriver and poppler-utils");
  process.exit(0);
}

const check = createChecks("PDF export in Firefox: no blank last page on long timeline and Modern resumes");
const dir = path.join(OUT, "pdf-firefox-blank");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8");
/** The long resume with `jobs` experience entries. */
function resumeWith(slug, size, jobs) {
  const resume = longResume(photo);
  resume.design = { ...resume.design, templateId: slug, pageSize: size };
  const experience = resume.sections.find((s) => s.type === "experience");
  const base = experience.entries;
  experience.entries = Array.from({ length: jobs }, (_, i) => ({ ...base[i % base.length], id: `e${i}`, role: `Senior Platform Engineer ${i}` }));
  return resume;
}

const cases = [
  ["kinetic", "a4", 7],
  ["kinetic", "a4", 12],
  ["charter", "letter", 7],
  ["charter", "letter", 12],
  ["modern", "a4", 7],
];

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const exportPdf = await firefoxExporter(BASE, 4300 + Math.floor(Math.random() * 90));
const blank = [];
const mismatched = [];
for (const [slug, size, jobs] of cases) {
  const label = `${slug}-${size}-${jobs}jobs`;
  const file = path.join(dir, `${label}.pdf`);
  const previewPages = await exportPdf(resumeWith(slug, size, jobs), file);
  const pages = [...run("pdftotext", ["-bbox", file, "-"]).matchAll(/<page [^>]*>([\s\S]*?)<\/page>/g)].map((m) => m[1].includes("<word"));
  const empty = pages.flatMap((hasText, i) => (hasText ? [] : [i + 1]));
  if (empty.length) blank.push(`${label}: page ${empty.join(", ")} of ${pages.length} is blank`);
  if (pages.length !== previewPages) mismatched.push(`${label}: ${pages.length} pages, preview shows ${previewPages}`);
}
await exportPdf.close();

check("No blank pages, including the last one", blank.length === 0, blank.join(" | "));
check("PDF page count matches the preview's", mismatched.length === 0, mismatched.join(" | "));

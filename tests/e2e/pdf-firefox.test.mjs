// Exports every template in real Firefox and checks the files with poppler-utils.
// Firefox has its own print engine and export path (see usePdfExport), so on top
// of the Chrome suite's checks this confirms bold text stays in the text layer,
// digits and ligatures survive, and continuation pages keep their spacing.
// Printing goes through WebDriver's print command, which uses Firefox's PDF
// output but not its print dialog. Skips itself without Firefox or geckodriver.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks, sleep } from "./helpers.mjs";
import { longResume } from "./long-resume.mjs";

if (spawnSync("pdfinfo", ["-v"]).error || spawnSync("firefox", ["--version"]).error || spawnSync("geckodriver", ["--version"]).error) {
  console.log("\nPDF export in Firefox\nSKIP  needs firefox, geckodriver and poppler-utils");
  process.exit(0);
}

const check = createChecks("PDF export in Firefox: all templates, Letter and A4, long, partial and empty resumes");
const dir = path.join(OUT, "pdf-firefox");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8");
const fixture = JSON.parse(fs.readFileSync(`${FIXTURES}/v1-resumes.json`, "utf8"));
const registry = fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8");
const photoMode = Object.fromEntries([...registry.matchAll(/slug: "([^"]+)",[\s\S]*?photo: "(always|optional|none)"/g)].map((m) => [m[1], m[2]]));
const handWritten = new Set(["professional", "modern", "minimal"]);

const long = (size) => {
  const resume = longResume(photo);
  resume.design.pageSize = size;
  return { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [resume] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "long", zoom: "fit" }) };
};
const empty = { schemaVersion: 2, id: "empty", name: "Empty", createdAt: 1, updatedAt: 2, profile: {}, sections: [], design: { templateId: "professional", pageSize: "a4" } };
const datasets = [
  ["long", "letter", long("letter")],
  ["long", "a4", long("a4")],
  ["fixture", "letter", { "folio.resumes": fixture.resumes, "folio.editor-settings": fixture.settings }],
  ["empty", "a4", { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [empty] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "empty", zoom: "fit" }) }],
];
// Includes bold titles, dates and words with "fi" ligatures, the text Firefox used to lose.
const expectedText = {
  long: ["zz-end-marker", "seniorplatformengineer8", "m.s.computerscience3", "skill23", "cka", "alexandra", "opensourcecli", "supercalifragilistic", "fifteen", "2010"],
  fixture: ["legacylenafixture", "seniordataengineer", "streamline", "python", "german", "streamingatscale"],
  empty: ["yourname"],
};
const pageSizes = { letter: { cm: [21.59, 27.94], pt: [612, 792] }, a4: { cm: [21, 29.7], pt: [595.28, 841.89] } };
const MIN_PAGE_GAP = 20; // points of clear space at the top and bottom of continuation pages

// ---- WebDriver
const port = 4400 + Math.floor(Math.random() * 500);
const driver = spawn("geckodriver", ["--port", String(port)], { stdio: "ignore" });
process.on("exit", () => driver.kill());
await sleep(2000);
const G = `http://127.0.0.1:${port}`;
async function wd(method, url, body) {
  const res = await fetch(G + url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const { value } = await res.json();
  if (value?.error) throw new Error(`${value.error}: ${value.message}`);
  return value;
}
const { sessionId } = await wd("POST", "/session", { capabilities: { alwaysMatch: { "moz:firefoxOptions": { args: ["-headless"] } } } });
const s = `/session/${sessionId}`;
const exec = (script, args = []) => wd("POST", `${s}/execute/sync`, { script, args });

// ---- Export
const files = [];
for (const [name, size, storage] of datasets) {
  await wd("POST", `${s}/url`, { url: `${BASE}/about` });
  await exec("localStorage.clear(); for (const [k, v] of Object.entries(arguments[0])) localStorage.setItem(k, v);", [storage]);
  await wd("POST", `${s}/url`, { url: `${BASE}/editor` });
  await sleep(2000);
  await exec("window.__printed = 0; window.print = () => window.__printed++;");
  const slugs = await exec('return [...document.querySelectorAll("select option")].map((o) => o.value)');
  for (const slug of slugs) {
    await exec('const s = document.querySelector("select"); s.value = arguments[0]; s.dispatchEvent(new Event("change", { bubbles: true }));', [slug]);
    await sleep(150);
    const before = await exec("return window.__printed");
    await exec('[...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click();');
    await sleep(80);
    await exec('[...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click();');
    for (let i = 0; i < 200 && (await exec("return window.__printed")) === before; i++) await sleep(50);
    const [width, height] = pageSizes[size].cm;
    const pdf = await wd("POST", `${s}/print`, { background: true, margin: { top: 0, bottom: 0, left: 0, right: 0 }, page: { width, height } });
    const file = path.join(dir, `${name}-${size}-${slug}.pdf`);
    fs.writeFileSync(file, Buffer.from(pdf, "base64"));
    await exec('window.dispatchEvent(new Event("afterprint"));');
    await sleep(100);
    files.push({ file, name, size, slug });
  }
}
await wd("DELETE", s);
driver.kill();
check("Exported a PDF for every template and dataset", files.length === 260, String(files.length));

// ---- Verify
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const problems = [];
let leastFilled = 1;
for (const { file, name, size, slug } of files) {
  const label = `${name}-${size}-${slug}`;
  const info = run("pdfinfo", [file]);
  const pages = Number(info.match(/Pages:\s+(\d+)/)[1]);
  const [w, h] = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/).slice(1).map(Number);
  const [ew, eh] = pageSizes[size].pt;
  if (Math.abs(w - ew) > 1.5 || Math.abs(h - eh) > 1.5) problems.push(`${label}: page size ${w}x${h}`);
  if (name !== "long" && pages !== 1) problems.push(`${label}: expected one page, got ${pages}`);

  const raw = run("pdftotext", [file, "-"]);
  if (raw.includes("�")) problems.push(`${label}: unmapped characters in the text layer`);
  // Firefox maps some fonts' hyphens to U+2010.
  const text = raw.toLowerCase().replace(/\s+/g, "").replace(/\u2010/g, "-");
  for (const expected of expectedText[name]) if (!text.includes(expected)) problems.push(`${label}: missing text "${expected}"`);

  const fonts = run("pdffonts", [file]).split("\n").slice(2).filter((l) => l.trim());
  if (fonts.some((l) => /\sno\s+(no|yes)\s+(no|yes)\s+\d+\s+\d+\s*$/.test(l))) problems.push(`${label}: font not embedded`);
  if (name === "long" && !fonts.some((l) => /(Bold|SemiBold|Semibold|Medium|Black)/.test(l))) problems.push(`${label}: no bold font embedded`);

  const bbox = run("pdftotext", ["-bbox", file, "-"]);
  [...bbox.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)].forEach((m, index) => {
    const [pw, ph] = [Number(m[1]), Number(m[2])];
    const words = [...m[3].matchAll(/xMin="([-\d.]+)" yMin="([-\d.]+)" xMax="([-\d.]+)" yMax="([-\d.]+)"/g)].map((x) => x.slice(1).map(Number));
    if (!words.length) return problems.push(`${label}: page ${index + 1} is blank`);
    if (words.some(([x0, y0, x1, y1]) => x0 < -0.5 || y0 < -0.5 || x1 > pw + 0.5 || y1 > ph + 0.5)) problems.push(`${label}: text outside page ${index + 1}`);
    if (index > 0 && Math.min(...words.map((x) => x[1])) < MIN_PAGE_GAP) problems.push(`${label}: page ${index + 1} starts at the top edge`);
    if (pages > 1 && Math.max(...words.map((x) => x[3])) > ph - MIN_PAGE_GAP) problems.push(`${label}: page ${index + 1} runs into the bottom edge`);
    if (name === "long" && index < pages - 1) leastFilled = Math.min(leastFilled, Math.max(...words.map((x) => x[3])) / ph);
  });

  const images = run("pdfimages", ["-list", file]).split("\n").slice(2).filter((l) => l.trim()).length;
  const showsPhoto = name !== "empty" && photoMode[slug] !== "none" && !handWritten.has(slug);
  if (showsPhoto && images < 1) problems.push(`${label}: expected the photo, found no images`);
  if (!showsPhoto && images !== 0) problems.push(`${label}: unexpected images (${images})`);
}
fs.writeFileSync(path.join(dir, "problems.txt"), problems.join("\n"));
check("All PDFs pass size, text, font, bounds, spacing and image checks", problems.length === 0, `${problems.length}: ${problems.slice(0, 6).join(" | ")}`);
// Lower than Chrome's bar: Firefox ignores break-after: avoid, so entries and short sections stay whole.
check("Non-final pages are well filled", leastFilled >= 0.55, `${Math.round(leastFilled * 100)}% minimum`);

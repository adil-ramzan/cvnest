// Exports every template as a PDF through the editor's Download PDF button and
// checks the files with poppler-utils (pdfinfo, pdftotext, pdfimages): page
// size, selectable text, no blank pages, text inside the page, photos only
// where the template shows one. Skips itself if poppler isn't installed.
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

const empty = { schemaVersion: 2, id: "empty", name: "Empty", createdAt: 1, updatedAt: 2, profile: {}, sections: [], design: { templateId: "professional", pageSize: "a4" } };
const datasets = [
  ["long", "letter", { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [longResume(photo)] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "long", zoom: "fit" }) }],
  ["long", "a4", null],
  ["fixture", "letter", { "folio.resumes": fixture.resumes, "folio.editor-settings": fixture.settings }],
  ["empty", "a4", { "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [empty] }), "folio.editor-settings": JSON.stringify({ activeResumeId: "empty", zoom: "fit" }) }],
];
const expectedText = {
  long: ["zz-end-marker", "seniorplatformengineer8", "m.s.computerscience3", "skill23", "cka", "alexandra", "opensourcecli", "supercalifragilistic", "2010"],
  fixture: ["legacylenafixture", "seniordataengineer", "streamline", "python", "german", "streamingatscale"],
  empty: ["yourname"],
};
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
      [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click();
    });
    await page.waitForFunction((b) => (window.__printed || 0) > b, {}, before);
    const file = path.join(dir, `${name}-${size}-${slug}.pdf`);
    await page.pdf({ path: file, preferCSSPageSize: true });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await page.waitForFunction(() => !document.querySelector(".print-root"));
    files.push({ file, name, size, slug });
  }
}
await browser.close();
check("Exported a PDF for every template and dataset", files.length === 480, String(files.length));
check("No page errors during export", errors.length === 0, errors.slice(0, 2).join(" | "));
check("No resume content in network requests", leaks.length === 0, leaks.join(", "));

// ---- Verify
const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const problems = [];
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

  const images = run("pdfimages", ["-list", file]).split("\n").slice(2).filter((l) => l.trim()).length;
  const showsPhoto = name !== "empty" && photoMode[slug] !== "none" && !handWritten.has(slug);
  if (showsPhoto && images !== 1) problems.push(`${label}: expected the photo, found ${images} images`);
  if (!showsPhoto && images !== 0) problems.push(`${label}: unexpected images (${images})`);
}
check("All PDFs pass size, text, bounds, blank-page and image checks", problems.length === 0, problems.slice(0, 5).join(" | "));
check("Non-final pages are well filled (no premature page breaks)", leastFilled >= 0.75, `${Math.round(leastFilled * 100)}% minimum`);

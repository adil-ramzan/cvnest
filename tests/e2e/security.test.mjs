// Security boundaries: response headers, the Content Security Policy in real use (no
// violations across pages, editing, photo upload and PDF export), and malformed or
// oversized data from browser storage and backup files.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

const check = createChecks("Security: headers, CSP in use, malformed and oversized data");

// ---- Response headers
const EXPECTED_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'none'",
  "frame-ancestors 'none'",
];
const headersOf = async (route) => {
  const res = await fetch(BASE + route);
  return { status: res.status, h: Object.fromEntries(res.headers), body: await res.text() };
};
const home = await headersOf("/");
const scriptPath = home.body.match(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/)?.[1];
const htmlRoutes = ["/", "/templates", "/templates/kinetic", "/editor", "/privacy", "/does-not-exist"];
const missing = [];
for (const route of htmlRoutes) {
  const { status, h } = await headersOf(route);
  const csp = (h["content-security-policy"] ?? "").split(";").map((part) => part.trim());
  for (const directive of EXPECTED_CSP) if (!csp.includes(directive)) missing.push(`${route}: CSP ${directive}`);
  if (csp.some((part) => part.includes("unsafe-eval"))) missing.push(`${route}: unsafe-eval in production`);
  const expect = {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "cross-origin-opener-policy": "same-origin",
  };
  for (const [name, value] of Object.entries(expect)) if (h[name] !== value) missing.push(`${route}: ${name}=${h[name]}`);
  if (!h["permissions-policy"]?.includes("camera=()")) missing.push(`${route}: permissions-policy`);
  if (h["x-powered-by"]) missing.push(`${route}: x-powered-by ${h["x-powered-by"]}`);
  if (route === "/does-not-exist" && status !== 404) missing.push(`${route}: status ${status}`);
}
check("Every page sends the full CSP and security headers", missing.length === 0, missing.slice(0, 5).join("; "));

const staticProblems = [];
for (const route of [scriptPath, "/fonts/print/inter-400.woff", "/sitemap.xml", "/robots.txt"].filter(Boolean)) {
  const { status, h } = await headersOf(route);
  if (status !== 200) staticProblems.push(`${route}: ${status}`);
  if (h["x-content-type-options"] !== "nosniff") staticProblems.push(`${route}: nosniff`);
  if (h["x-powered-by"]) staticProblems.push(`${route}: x-powered-by`);
}
check("Static files are nosniff and don't name the framework", !!scriptPath && staticProblems.length === 0, staticProblems.join("; ") || (scriptPath ? "" : "no script found"));

// ---- CSP in real use: record every violation the browser reports
const browser = await launch();
const errors = [];
const violations = [];
async function newPage(width = 1440) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => /Content Security Policy|Refused to/i.test(msg.text()) && violations.push(`console: ${msg.text().slice(0, 160)}`));
  await page.evaluateOnNewDocument(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      (window.__csp ||= []).push(`${e.violatedDirective} ${e.blockedURI}`);
    });
    window.print = () => { window.__printed = (window.__printed || 0) + 1; };
  });
  return page;
}
const collect = async (page, label) => {
  for (const v of await page.evaluate(() => window.__csp || [])) violations.push(`${label}: ${v}`);
};

let page = await newPage();
for (const route of ["/", "/templates", "/templates/kinetic", "/free", "/privacy", "/terms", "/contact"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle0" });
  if (route === "/templates") {
    for (let y = 0; y < 15; y++) { await page.evaluate(() => window.scrollBy(0, 1500)); await sleep(80); }
    await sleep(500);
  }
  await collect(page, route);
}
check("No CSP violations on public pages, including lazy gallery thumbnails", violations.length === 0, violations.slice(0, 3).join(" | "));

// Editor: sample data, photo upload, custom color and font, then the PDF print copy.
const before = violations.length;
await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/editor?template=portrait`, { waitUntil: "networkidle0" });
const clickButton = (text) => page.evaluate((t) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === t && b.offsetParent)?.click(), text);
await clickButton("Load sample data");
await waitFor(() => page.evaluate(() => document.body.innerText.includes("Sample")), 5000);
await clickButton("Edit");
await page.waitForSelector("input[type=file][accept^='image/']");
await (await page.$("input[type=file][accept^='image/']")).uploadFile(path.join(FIXTURES, "photo.png"));
const photoShown = await waitFor(() => page.evaluate(() => [...document.querySelectorAll("img")].some((img) => img.src.startsWith("blob:") && img.naturalWidth > 0)), 8000);
check("Uploaded photo displays from a blob: URL", photoShown);
await page.evaluate(() => document.getElementById("editor-tab-customize")?.click());
await waitFor(() => page.evaluate(() => !!document.querySelector("[aria-label='Plum']")), 5000);
await page.click("[aria-label='Plum']");
await clickButton("Lora");
await sleep(400);
await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF"))?.click());
await sleep(150);
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click());
const printed = await waitFor(() => page.evaluate(() => (window.__printed || 0) > 0), 30000);
check("PDF export reaches the print step under the CSP", printed);
const pdfFile = path.join(OUT, "security-editor.pdf");
if (printed) await page.pdf({ path: pdfFile, preferCSSPageSize: true, timeout: 120000 });
await collect(page, "editor");
check("No CSP violations while editing, uploading a photo, restyling and exporting", violations.length === before, violations.slice(before, before + 3).join(" | "));

const havePoppler = !spawnSync("pdfimages", ["-v"]).error;
if (havePoppler && printed) {
  const images = spawnSync("pdfimages", ["-list", pdfFile], { encoding: "utf8" }).stdout.trim().split("\n").length - 2;
  check("Exported PDF includes the uploaded photo", images >= 1, `${images} images`);
} else {
  console.log("SKIP  photo-in-PDF check needs poppler-utils");
}
await page.close();

// ---- Malformed and oversized data in browser storage
const long = "Long paragraph text. ".repeat(900);
const stored = {
  schemaVersion: 2,
  resumes: [
    null,
    "not a resume",
    42,
    {
      schemaVersion: 2,
      id: "m1",
      name: { not: "a string" },
      createdAt: "yesterday",
      updatedAt: NaN,
      profile: { fullName: "Malformed Person", email: ["x"], linkedin: "javascript:alert(1)", website: "example.org/portfolio", photo: { id: 5 } },
      sections: [
        "junk",
        { type: "summary", content: long },
        { type: "experience", entries: [null, { role: "Kept Role", company: 7, highlights: ["Kept bullet", {}, null] }] },
        { type: "skills", entries: "SQL, Excel" },
        { type: "made-up" },
      ],
      design: { templateId: "no-such-template", pageSize: "tabloid", accentColor: "url(javascript:x)", fontFamily: "Comic Sans", fontScale: 99 },
    },
  ],
};
page = await newPage();
await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
await page.evaluate((value) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", value); }, JSON.stringify(stored));
const errorsBefore = errors.length;
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
const loaded = await waitFor(() => page.evaluate(() => !!document.querySelector("[aria-label='Resume preview'] .resume-page")), 10000);
check("Editor opens malformed stored data without crashing", loaded && errors.length === errorsBefore, errors.slice(errorsBefore).join(" | "));
const panelText = await page.$eval("[role=tabpanel]", (el) => el.innerText);
check("Unreadable items are reported, and a copy of the original is kept", panelText.includes("Part of your saved data couldn’t be read") && panelText.includes("The unreadable part is kept, untouched") && (await page.evaluate(() => localStorage.getItem("folio.resumes.v2.unreadable-backup") !== null)));
const previewText = await page.$eval("[aria-label='Resume preview']", (el) => el.innerText);
check("The readable content is shown, including the long paragraph in full", previewText.includes("Malformed Person") && previewText.includes("Kept Role") && previewText.includes("Kept bullet") && previewText.replace(/\s+/g, " ").includes(long.trim().slice(-200)));
const links = await page.$$eval("[aria-label='Resume preview'] a", (els) => els.map((a) => a.getAttribute("href")));
check("No javascript: link is rendered; a bare domain becomes https", !links.some((href) => /^\s*javascript:/i.test(href ?? "")) && links.includes("https://example.org/portfolio"), links.join(", "));
const styleProblems = await page.$eval("[aria-label='Resume preview'] .resume-paper", (el) => {
  const css = el.getAttribute("style") ?? "";
  return /NaN|undefined|javascript|Comic/i.test(css) ? css.slice(0, 160) : "";
});
check("Invalid style values never reach the page", styleProblems === "", styleProblems);
await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF"))?.click());
await sleep(150);
await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click());
const malformedPrinted = await waitFor(() => page.evaluate(() => (window.__printed || 0) > 0), 30000);
const malformedPdf = path.join(OUT, "security-malformed.pdf");
if (malformedPrinted) await page.pdf({ path: malformedPdf, preferCSSPageSize: true, timeout: 120000 });
if (malformedPrinted && !spawnSync("pdftotext", ["-v"]).error) {
  const text = spawnSync("pdftotext", [malformedPdf, "-"], { encoding: "utf8" }).stdout;
  check("Malformed data still exports a PDF with the readable content", text.includes("Malformed Person") && text.includes("Kept Role"));
} else {
  check("Malformed data still reaches the print step", malformedPrinted);
}
await collect(page, "malformed");

// ---- Malformed, oversized and unreadable backup files
const restoreFile = async (file) => {
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), { timeout: 10000 });
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  return page.$eval("dialog[open]", (el) => el.innerText);
};
const closeDialog = () => page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => /Close|Cancel/.test(b.textContent))?.click());
// Storage may still hold the raw malformed data until the app's next save, so compare what the app holds.
const savedNames = () => page.evaluate(() => (JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes ?? []).map((r) => r?.name));

const mixed = path.join(OUT, "security-mixed-backup.json");
fs.writeFileSync(mixed, JSON.stringify({ kind: "resume-backup", schemaVersion: 2, resumes: [null, "x", { schemaVersion: 2, id: "ok", name: "Readable", profile: { fullName: "Readable Person" } }] }));
check("A backup with unreadable items says how many will be skipped", (await restoreFile(mixed)).includes("2 couldn't be read and will be skipped"));
await closeDialog();

const oversized = path.join(OUT, "security-oversized.json");
const fd = fs.openSync(oversized, "w");
fs.writeSync(fd, Buffer.alloc(26 * 1024 * 1024, 32));
fs.closeSync(fd);
check("A file over 25 MB is refused before it's read", (await restoreFile(oversized)).includes("too large"));
await closeDialog();
fs.rmSync(oversized);

await page.evaluate(() => { File.prototype.text = () => Promise.reject(new DOMException("gone", "NotReadableError")); });
check("A file that can't be read shows an error instead of failing silently", (await restoreFile(mixed)).includes("couldn't be read"));
await closeDialog();
// Wait past the autosave delay (400 ms) so any change the files caused would be in storage.
await sleep(800);
const names = await savedNames();
const stillThere = (await page.$eval("[aria-label='Resume preview']", (el) => el.innerText)).includes("Malformed Person");
check("Refused and unreadable files add or replace nothing", !names.includes("Readable") && stillThere, names.join(", "));
await page.close();

check("No CSP violations with malformed data", !violations.some((v) => v.startsWith("malformed")), violations.filter((v) => v.startsWith("malformed")).slice(0, 3).join(" | "));
check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

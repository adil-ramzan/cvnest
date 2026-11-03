// Shared by the pagination tests. Builds resumes of a chosen length, exports real
// PDFs through the editor's Download PDF path, and measures each printed page from
// the PDF itself: text positions with pdftotext, colors and rules with pdftoppm.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { sleep } from "./helpers.mjs";

export const PAGE_PX = { letter: [816, 1056], a4: [793.7, 1122.5] };
export const FIRST_TITLES = ["Profile", "Experience", "Education", "Skills", "Languages", "Certifications", "Final Section"];

const bullet = (e, b) => `E${e}B${b}Z led a cross functional programme that reduced cost across several regions and improved reliability for every customer group involved over the year`;

/** A resume whose experience section holds exactly `bullets` bullets, four to an entry. Tokens let a PDF be matched back to the content. */
export function buildResume({ slug, size, bullets, finalSection = false, longEntry = false, longParagraph = false, links = 0, longSide = false, id = "pagination" }) {
  const entries = [];
  for (let b = 0; b < bullets; b++) {
    const e = Math.floor(b / 4);
    (entries[e] ??= { id: `e${e}`, role: `Role R${e}R Lead`, company: "Company Name", location: "Remote", startDate: "2019", endDate: "2023", highlights: [] }).highlights.push(bullet(e, b));
  }
  const skillNames = longSide ? Array.from({ length: 420 }, (_, i) => `Skill S${i}S`) : ["Planning", "Budgeting", "Reporting", "Leadership", "Analysis", "Negotiation"];
  if (longEntry) entries.push({ id: "elong", role: "Role R999R Lead", company: "Company Name", location: "Remote", startDate: "2019", endDate: "2023", highlights: Array.from({ length: 70 }, (_, b) => bullet(999, b)) });
  const sections = [
    { id: "s1", type: "summary", title: "Profile", visible: true, content: "Experienced lead with a record of delivering reliable programmes for demanding customers across several industries." },
    { id: "s4", type: "skills", title: "Skills", visible: true, entries: skillNames.map((name, i) => ({ id: `sk${i}`, name })) },
    { id: "s5", type: "languages", title: "Languages", visible: true, entries: [{ id: "l1", name: "English", proficiency: "Native" }] },
    { id: "s6", type: "certifications", title: "Certifications", visible: true, entries: [{ id: "c1", name: "PMP", issuer: "PMI", date: "2021" }] },
    { id: "s3", type: "education", title: "Education", visible: true, entries: [{ id: "ed", degree: "B.S. Economics", school: "State University", startDate: "2009", endDate: "2013" }] },
    { id: "s2", type: "experience", title: "Experience", visible: true, entries },
  ];
  if (longParagraph) sections.push({ id: "s7", type: "custom", title: "Long Statement", visible: true, entries: [{ id: "lp", title: "Statement T1T", description: Array.from({ length: 170 }, (_, i) => `P${i}Q this sentence is one of many in a statement that runs past the end of a full page.`).join(" ") }] });
  if (links) sections.push({ id: "s9", type: "projects", title: "Projects", visible: true, entries: Array.from({ length: links }, (_, i) => ({ id: `pr${i}`, name: `Project PR${i}PR`, link: `https://example.org/link-${i}`, description: "A short description of the project and what it delivered for its users over two years of work." })) });
  if (finalSection) sections.push({ id: "s8", type: "custom", title: "Final Section", visible: true, entries: [{ id: "f", title: "FINALMARK", description: "One short closing line." }] });
  return {
    schemaVersion: 2, id, name: "Pagination", createdAt: 1, updatedAt: 2,
    profile: { fullName: "Jordan Rivera Testcase", jobTitle: "Programme Lead", email: "jordan@example.com", phone: "+1 555 0100", location: "Seattle, WA", linkedin: "linkedin.com/in/jordan", github: "", website: "jordan.example.com" },
    sections, design: { templateId: slug, pageSize: size },
  };
}

export const storageFor = (resume) => ({ "folio.resumes.v2": JSON.stringify({ schemaVersion: 2, resumes: [resume] }), "folio.editor-settings": JSON.stringify({ activeResumeId: resume.id }) });

/** Chrome: one page reused for every export. */
export async function chromeExporter(browser, base) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await page.goto(`${base}/about`, { waitUntil: "domcontentloaded" });
  return async (resume, file, { printCss } = {}) => {
    // From a page without the editor, whose save on leaving would overwrite this.
    await page.goto(`${base}/about`, { waitUntil: "domcontentloaded" });
    await page.evaluate((storage) => { localStorage.clear(); for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v); }, storageFor(resume));
    await page.goto(`${base}/editor`, { waitUntil: "load" });
    await page.waitForFunction(() => [...document.querySelectorAll("header button")].some((b) => b.textContent.includes("PDF")) && document.querySelector(".resume-page"));
    await sleep(550);
    const previewPages = await page.evaluate(() => Number(document.body.innerText.match(/about (\d+) pages?/)?.[1]));
    await page.evaluate(async () => {
      [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click();
      await new Promise((r) => setTimeout(r, 60));
      [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click();
    });
    await page.waitForFunction(() => (window.__printed || 0) > 0, { timeout: 60000 });
    if (printCss) await page.addStyleTag({ content: printCss });
    await page.pdf({ path: file, preferCSSPageSize: true, timeout: 120000 });
    return previewPages;
  };
}

/** Firefox through WebDriver print, which uses its PDF output but not the dialog. */
export async function firefoxExporter(base, port) {
  const driver = spawn("geckodriver", ["--port", String(port)], { stdio: "ignore" });
  process.on("exit", () => driver.kill());
  await sleep(2500);
  const G = `http://127.0.0.1:${port}`;
  const wd = async (method, url, body) => {
    const res = await fetch(G + url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const { value } = await res.json();
    if (value?.error) throw new Error(`${value.error}: ${value.message}`);
    return value;
  };
  const { sessionId } = await wd("POST", "/session", { capabilities: { alwaysMatch: { "moz:firefoxOptions": { args: ["-headless"] } } } });
  const s = `/session/${sessionId}`;
  const exec = (script, args = []) => wd("POST", `${s}/execute/sync`, { script, args });
  await wd("POST", `${s}/url`, { url: `${base}/about` });
  const size = { letter: [21.59, 27.94], a4: [21, 29.7] };
  const run = async (resume, file) => {
    await wd("POST", `${s}/url`, { url: `${base}/about` });
    await exec("localStorage.clear(); for (const [k, v] of Object.entries(arguments[0])) localStorage.setItem(k, v);", [storageFor(resume)]);
    await wd("POST", `${s}/url`, { url: `${base}/editor` });
    for (let i = 0; i < 200 && !(await exec('return !!document.querySelector(".resume-page")')); i++) await sleep(50);
    await sleep(900);
    const previewPages = await exec("return Number(document.body.innerText.match(/about (\\d+) pages?/)?.[1])");
    await exec("window.__printed = 0; window.print = () => window.__printed++;");
    await exec('[...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click();');
    await sleep(80);
    await exec('[...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click();');
    for (let i = 0; i < 300 && (await exec("return window.__printed")) === 0; i++) await sleep(50);
    const [width, height] = size[resume.design.pageSize];
    const pdf = await wd("POST", `${s}/print`, { background: true, margin: { top: 0, bottom: 0, left: 0, right: 0 }, page: { width, height } });
    fs.writeFileSync(file, Buffer.from(pdf, "base64"));
    await exec('window.dispatchEvent(new Event("afterprint"));');
    return previewPages;
  };
  run.close = async () => { await wd("DELETE", s).catch(() => {}); driver.kill(); };
  return run;
}

const run = (cmd, args) => execFileSync(cmd, args, { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Every text line in a PDF: pages[n] = { width, height, lines: [{ x0, x1, y0, y1, text }] } in CSS pixels. */
export function readLines(file) {
  const xml = run("pdftotext", ["-bbox-layout", file, "-"]).toString();
  const toPx = 96 / 72;
  return xml.split("<page ").slice(1).map((chunk) => {
    const [, width, height] = chunk.match(/width="([\d.]+)" height="([\d.]+)"/);
    const lines = [...chunk.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/line>/g)].map((m) => ({
      x0: m[1] * toPx, y0: m[2] * toPx, x1: m[3] * toPx, y1: m[4] * toPx,
      text: unescape([...m[5].matchAll(/<word[^>]*>([\s\S]*?)<\/word>/g)].map((w) => w[1]).join(" ")),
    }));
    return { width: width * toPx, height: height * toPx, lines };
  });
}

/** One page as RGB rows at `dpi`. */
function rasterPage(file, page, dpi) {
  const ppm = run("pdftoppm", ["-r", String(dpi), "-f", String(page), "-l", String(page), "-singlefile", file]);
  let offset = 0;
  const fields = [];
  while (fields.length < 4) {
    let end = offset;
    while (ppm[end] > 32) end++;
    fields.push(ppm.subarray(offset, end).toString());
    offset = end + 1;
  }
  const [, w, h] = fields.map(Number);
  return { w, h, at: (x, y) => { const i = offset + (y * w + x) * 3; return [ppm[i], ppm[i + 1], ppm[i + 2]]; } };
}

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
/** A thin gray column divider can fall in a lane. It isn't a background. */
const isDivider = (color) => color.slice(1, 3) === color.slice(3, 5) && color.slice(3, 5) === color.slice(5, 7) && color !== "#ffffff";
const near = (a, b, tolerance = 10) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);

function dominant(values) {
  const counts = new Map();
  for (const value of values) { const key = hex(value); counts.set(key, (counts.get(key) ?? 0) + 1); }
  const [color, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return { color, share: n / values.length };
}

/**
 * Background of a page, column by column. `lanes` holds the dominant color and its
 * share for vertical strips across the page. A sidebar with a gap shows up as a
 * lower share; a missing one as a different color.
 */
function pageSurface(raster) {
  const { w, h, at } = raster;
  const lanes = [0.01, 0.06, 0.15, 0.28, 0.5, 0.72, 0.85, 0.94, 0.99].map((f) => {
    const x = Math.min(w - 1, Math.round(w * f));
    const values = [];
    for (let y = 0; y < h; y++) values.push(at(x, y));
    const white = ([r, g, b]) => r > 250 && g > 250 && b > 250;
    let top = 0, bottom = 0;
    while (top < h && white(values[top])) top++;
    while (bottom < h && white(values[h - 1 - bottom])) bottom++;
    return { ...dominant(values), edgeWhite: Math.max(top, bottom) / h };
  });
  return lanes;
}

/**
 * Rows below the last text that hold a long horizontal run differing from the rows
 * around them: a divider left behind. Comparing each pixel with its own column means
 * sidebars and bands, which run the full height, never count.
 */
function strayRule(raster, lastTextPx, pageHeightPx) {
  const { w, h, at } = raster;
  const scale = h / pageHeightPx;
  const start = Math.round((lastTextPx + 3) * scale);
  const end = Math.round(h * 0.965);
  for (let y = Math.max(start, 3); y < end; y++) {
    let run = 0, best = 0;
    for (let x = Math.round(w * 0.03); x < w * 0.97; x++) {
      const differs = !near(at(x, y), at(x, Math.max(0, y - 3)), 5) && !near(at(x, y), at(x, Math.min(h - 1, y + 3)), 5);
      run = differs ? run + 1 : 0;
      best = Math.max(best, run);
    }
    if (best > w * 0.14) return { yPx: y / scale, widthShare: best / w };
  }
  return null;
}

/** First row with a long horizontal run of ink, rule or text: where the page's content really begins. */
function contentTop(raster, pageHeightPx) {
  const { w, h, at } = raster;
  const scale = h / pageHeightPx;
  for (let y = Math.round(h * 0.015); y < h * 0.3; y++) {
    let run = 0;
    for (let x = Math.round(w * 0.03); x < w * 0.97; x++) {
      run = near(at(x, y), at(x, y - 2), 5) ? 0 : run + 1;
      if (run > w * 0.05) return y / scale;
    }
  }
  return null;
}

/** First row of ink under a text line's box, which is steadier across fonts than the box itself. */
function inkTop(raster, line, pageHeightPx) {
  const { w, h, at } = raster;
  const scale = h / pageHeightPx;
  const x0 = Math.max(0, Math.round(line.x0 * scale)), x1 = Math.min(w - 1, Math.round(line.x1 * scale));
  const y0 = Math.max(1, Math.round((line.y0 - 4) * scale)), y1 = Math.min(h - 1, Math.round((line.y1 + 2) * scale));
  const bg = at(x0, Math.max(0, y0 - 1));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!near(at(x, y), bg, 40)) return y / scale;
  return line.y0;
}

const headingLine = (text) => FIRST_TITLES.some((t) => text.trim().toLowerCase() === t.toLowerCase());
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1;

/** Everything measured from one exported PDF. */
export function analyze(file, { expected = [], size, dpi = 72, bands = false } = {}) {
  const pages = readLines(file);
  const out = { pages: pages.length, perPage: [], problems: [] };
  const entryLines = new Map(); // "E3B9" etc. grouped by entry: entry -> Map(page -> line count)
  const paragraphLines = new Map();

  pages.forEach((page, index) => {
    const n = index + 1;
    const lines = [...page.lines].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    const raster = rasterPage(file, n, dpi);
    const surface = pageSurface(raster);
    if (!lines.length) {
      out.perPage.push({ n, blank: true, surface });
      out.problems.push({ kind: "blank-page", page: n });
      return;
    }
    const top = inkTop(raster, lines[0], page.height);
    const bottom = Math.max(...lines.map((l) => l.y1));
    const heightPx = page.height;

    // Last line of each column: a heading with nothing under it is orphaned.
    const orphans = lines.filter((line) => headingLine(line.text) && !lines.some((other) => other !== line && (
      (other.y0 > line.y0 + 2 && overlaps(line, other)) || // content below it
      (other.x0 > line.x1 && Math.abs(other.y0 - line.y0) < 14 && !headingLine(other.text)) // or beside it, in label layouts
    )));
    for (const line of orphans) if (line.y1 > heightPx * 0.4 && n < pages.length) out.problems.push({ kind: "orphan-heading", page: n, text: line.text });

    const rule = n < pages.length && !bands ? strayRule(raster, bottom, heightPx) : null;
    if (rule) out.problems.push({ kind: "orphan-rule", page: n, y: Math.round(rule.yPx) });

    // Attribute each line to the entry whose token it follows, in the same column.
    let current = null;
    for (const line of lines) {
      const token = line.text.match(/E(\d+)B\d+Z/) ?? line.text.match(/R(\d+)R/);
      const para = line.text.match(/P\d+Q/);
      if (token) current = { key: token[1], line };
      else if (line.text.match(/T1T/) || para) current = { key: "para", line };
      else if (current && !overlaps(line, current.line)) continue;
      else if (headingLine(line.text)) { current = null; continue; }
      if (!current) continue;
      const map = current.key === "para" ? paragraphLines : entryLines;
      if (!map.has(current.key)) map.set(current.key, new Map());
      const perPage = map.get(current.key);
      perPage.set(n, (perPage.get(n) ?? 0) + 1);
      current.line = line;
    }
    out.perPage.push({ n, top: Math.round(top * 10) / 10, contentTop: Math.round((contentTop(raster, page.height) ?? top) * 10) / 10, bottom: Math.round(bottom * 10) / 10, bottomGap: Math.round((heightPx - bottom) * 10) / 10, surface });
  });

  for (const [key, perPage] of [...entryLines, ...paragraphLines]) {
    const counts = [...perPage];
    if (counts.length < 2) continue;
    const [firstPage, first] = counts[0];
    const [lastPage, last] = counts.at(-1);
    if (first < 2) out.problems.push({ kind: "split-one-line", page: firstPage, entry: key, side: "start" });
    if (last < 2) out.problems.push({ kind: "split-one-line", page: lastPage, entry: key, side: "end" });
  }

  // Backgrounds: every page after the first must match every other, with no gaps.
  const sheets = out.perPage.filter((p) => !p.blank);
  const conts = sheets.slice(1);
  if (conts.length) {
    const ref = conts[0].surface;
    // Bands and cards belong to sections, not pages, so pages rightly differ.
    const lanes = bands ? [] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (const page of conts) {
      page.surface.forEach((lane, i) => {
        if (lanes.includes(i) && lane.color !== ref[i].color && !isDivider(lane.color) && !isDivider(ref[i].color)) out.problems.push({ kind: "surface-differs", page: page.n, lane: i, got: lane.color, want: ref[i].color });
      });
    }
    // A colored lane with white in it on any continuation page is a strip.
    for (const page of conts) {
      page.surface.forEach((lane, i) => {
        if (lanes.includes(i) && lane.color !== "#ffffff" && !isDivider(lane.color) && lane.edgeWhite > 0.006) out.problems.push({ kind: "surface-gap", page: page.n, lane: i, color: lane.color, strip: Math.round(lane.edgeWhite * 1000) / 1000 });
      });
    }
    // The sidebar on page 1 must carry on to the continuation pages.
    sheets[0].surface.forEach((lane, i) => {
      if (lanes.includes(i) && lane.color !== "#ffffff" && !isDivider(lane.color) && lane.share > 0.55 && ref[i].color === "#ffffff") out.problems.push({ kind: "surface-lost", page: 2, lane: i, color: lane.color });
    });
    const tops = conts.map((p) => p.top);
    out.contTop = { min: Math.min(...tops), max: Math.max(...tops) };
    const contents = conts.map((p) => p.contentTop);
    out.contContent = { min: Math.min(...contents), max: Math.max(...contents) };
    const multi = conts.slice(0, -1).map((p) => p.bottomGap);
    if (multi.length) out.contBottom = { min: Math.min(...multi), max: Math.max(...multi) };
  }
  out.firstTop = sheets[0]?.top;

  const last = sheets.at(-1);
  if (last) {
    const area = (size ? PAGE_PX[size][1] : pages[0].height) - (out.contTop?.min ?? 48) * 2;
    out.lastFill = Math.round(Math.max(0, (last.bottom - (sheets.length > 1 ? last.top : 0)) / area) * 100);
    out.lastLines = pages[last.n - 1].lines.length;
  }

  // Reading order: bullets come out of the PDF in the order they were written.
  const raw = run("pdftotext", [file, "-"]).toString();
  const order = [...raw.matchAll(/E\d+B(\d+)Z/g)].map((m) => Number(m[1]));
  if (order.some((value, i) => i > 0 && value < order[i - 1] && value !== 0)) out.problems.push({ kind: "text-order" });

  const text = pages.flatMap((p) => p.lines.map((l) => l.text)).join("\n");
  const missing = expected.filter((token) => !text.includes(token));
  if (missing.length) out.problems.push({ kind: "lost-text", count: missing.length, first: missing[0] });
  return out;
}

/** Tokens a resume must keep. */
export function expectedTokens(resume) {
  const tokens = [];
  const exp = resume.sections.find((s) => s.type === "experience");
  for (const entry of exp.entries) {
    tokens.push(entry.role.match(/R\d+R/)[0]);
    for (const line of entry.highlights) tokens.push(line.match(/E\d+B\d+Z/)[0]);
  }
  for (const skill of resume.sections.find((s) => s.type === "skills").entries) {
    const token = skill.name.match(/S\d+S/)?.[0];
    if (token) tokens.push(token);
  }
  return tokens;
}

/** Bullet index that begins each page of a very long export: the cut points for a target page count. */
export function pageStarts(file) {
  return readLines(file).map((page) => {
    const hits = page.lines.flatMap((l) => [...l.text.matchAll(/E\d+B(\d+)Z/g)].map((m) => Number(m[1])));
    return hits.length ? Math.min(...hits) : null;
  });
}

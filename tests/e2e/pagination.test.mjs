// Page breaks for every template, from the exported PDF and the preview. All 120
// templates run one three-page case in Letter or A4, and every eighth also runs the
// remaining cases. Firefox takes longer, so it covers one template per layout. The
// whole matrix (every template, size and case) is pagination-matrix.mjs, run by hand.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch, sleep } from "./helpers.mjs";
import { analyze, buildResume, chromeExporter, expectedTokens, firefoxExporter, pageStarts, readLines, storageFor } from "./pagination-lib.mjs";

if (spawnSync("pdftotext", ["-v"]).error || spawnSync("pdftoppm", ["-v"]).error) {
  console.log("\nPagination\nSKIP  poppler-utils not installed");
  process.exit(0);
}

const check = createChecks("Pagination: margins, breaks, colors, text and links on every page");
const dir = path.join(OUT, "pagination");
fs.mkdirSync(dir, { recursive: true });
const registry = fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8");
const slugs = [...registry.matchAll(/^    slug: "([^"]+)"/gm)].map((m) => m[1]);
const blocks = registry.split(/\n    slug: /).slice(1);
const sectional = new Set(blocks.filter((b) => /section(Bands|Cards): true/.test(b)).map((b) => b.match(/"([^"]+)"/)[1]));
const inset = (slug) => {
  const block = blocks.find((b) => b.startsWith(`"${slug}"`));
  const density = block.match(/density: "(\w+)"/)?.[1];
  return density ? { relaxed: 56, normal: 48, compact: 36 }[density] : slug === "minimal" ? 56 : 48;
};

const browser = await launch();
const run = await chromeExporter(browser, BASE);
const file = path.join(dir, "out.pdf");
const starts = new Map();
const startsFor = async (slug, size) => {
  const key = `${slug}|${size}`;
  if (!starts.has(key)) {
    await run(buildResume({ slug, size, bullets: 180 }), file);
    starts.set(key, pageStarts(file));
  }
  return starts.get(key);
};

const failures = new Map();
const note = (kind, label) => failures.set(kind, [...(failures.get(kind) ?? []), label]);

function inspect(result, label, slug, target) {
  for (const problem of result.problems) note(problem.kind, `${label} p${problem.page ?? "?"}`);
  if (target && result.pages !== target) note("page-count", `${label}: ${result.pages} pages, expected ${target}`);
  // Measured at the first line's ink: a run of ink across the page skips plain text and finds the first rule instead.
  // Anything drawn above that line is the margin-ink check's.
  if (result.contTop) {
    if (result.contTop.max - result.contTop.min > 16) note("uneven-margin", `${label}: ${result.contTop.min}-${result.contTop.max}`);
    if (Math.abs(result.contTop.min - inset(slug)) > 30) note("wrong-margin", `${label}: ${result.contTop.min}`);
  }
}

const exportCase = async (exporter, slug, size, options, label, target) => {
  const resume = buildResume({ slug, size, ...options });
  const previewPages = await exporter(resume, file);
  const result = analyze(file, { expected: expectedTokens(resume), size, bands: sectional.has(slug), margin: inset(slug) });
  inspect(result, label, slug, target);
  return { result, previewPages };
};

// ---- Chrome: every template
let mismatched = 0, compared = 0;
for (const [i, slug] of slugs.entries()) {
  const size = i % 2 ? "a4" : "letter";
  const at = await startsFor(slug, size);
  const mid = (page) => Math.round((at[page - 1] + at[page]) / 2);
  const cases = [["p3", { bullets: mid(3) }, 3]];
  if (i % 8 === 0) {
    cases.push(
      ["p1", { bullets: Math.max(2, Math.round(at[1] / 2)) }, 1],
      ["p2", { bullets: mid(2) }, 2],
      ["p5", { bullets: mid(5) }, 5],
      ["line", { bullets: at[1] + 1 }, undefined],
      ["section", { bullets: at[1], finalSection: true }, undefined],
      ["long", { bullets: 6, longEntry: true }, undefined],
      ["para", { bullets: 6, longParagraph: true }, undefined],
    );
  }
  for (const [name, options, target] of cases) {
    const { result, previewPages } = await exportCase(run, slug, size, options, `${slug} ${size} ${name}`, target);
    compared++;
    if (previewPages !== result.pages) mismatched++;
  }
}
for (const [kind, label] of [
  ["blank-page", "No blank pages"],
  ["orphan-heading", "No heading alone at the bottom of a page"],
  ["orphan-rule", "No divider rule left at the bottom of a page"],
  ["split-one-line", "No entry split with one line on a side"],
  ["surface-gap", "No white strips across sidebars or page colors"],
  ["surface-differs", "Page colors match on every continuation page"],
  ["surface-lost", "Sidebars carry on past page 1"],
  ["lost-text", "No text lost"],
  ["text-order", "Text extracts in reading order"],
  ["uneven-margin", "Top margin matches across continuation pages"],
  ["wrong-margin", "Top margin matches the template's page padding"],
  ["margin-ink", "Nothing but repeated decorations in the top margin"],
  ["page-count", "Page counts stay as expected"],
]) check(`Chrome: ${label}`, !failures.has(kind), (failures.get(kind) ?? []).slice(0, 6).join("; "));
check("Chrome: Preview page count matches the PDF in at least 97% of cases", mismatched / compared <= 0.03, `${mismatched} of ${compared} differ`);

// ---- Links survive on every page
{
  const resume = buildResume({ slug: "professional", size: "letter", bullets: 60, links: 12 });
  await run(resume, file);
  const urls = execFileSync("pdfinfo", ["-url", file], { encoding: "utf8" });
  check("Link annotations survive past page 1", Array.from({ length: 12 }, (_, i) => `https://example.org/link-${i}`).every((url) => urls.includes(url)));
}

// ---- Page 5 matches page 2
{
  const at = await startsFor("minimal", "a4");
  await run(buildResume({ slug: "minimal", size: "a4", bullets: Math.round((at[4] + at[5]) / 2) }), file);
  const { perPage } = analyze(file, { size: "a4" });
  check("Page 5's top margin equals page 2's", Math.abs(perPage[1].contentTop - perPage[4].contentTop) <= 2, `${perPage[1].contentTop} and ${perPage[4].contentTop}`);
}

// ---- Page 1 matches the rest. The name takes the exact type of a bullet or an entry title
// while printing, so it starts at the same height as one that opens a page only if the
// margins are equal. Which of the two opens a page depends on the page size.
const nameAs = (size, weight, lineHeight) => `.print-root h1 { font-size: ${size}px !important; line-height: ${lineHeight} !important; font-weight: ${weight} !important; letter-spacing: 0 !important; }`;
const LEADS = [{ css: nameAs(12, 400, 1.625), line: /^E\d+B\d+Z/ }, { css: nameAs(14, 600, "20px"), line: /^Role R\d+R/ }];
for (const slug of ["professional", "minimal"]) for (const size of ["letter", "a4"]) {
  let tops = [];
  for (const { css, line } of LEADS) {
    if (tops.length >= 2) break;
    await run(buildResume({ slug, size, bullets: 56 }), file, { printCss: css });
    const firsts = readLines(file).map((p) => [...p.lines].sort((a, b) => a.y0 - b.y0)[0]);
    tops = firsts.filter((first, i) => (i === 0 ? /Jordan/ : line).test(first.text)).map((first) => first.y0);
  }
  check(`${slug} ${size}: page 1's top margin equals later pages'`, tops.length >= 2 && Math.max(...tops) - Math.min(...tops) <= 1, tops.map((t) => t.toFixed(2)).join(", "));
}

// ---- Preview
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const open = async (resume) => {
  // The exporter's tab may have been used last, and a tab in the background stops painting.
  await page.bringToFront();
  await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  await page.evaluate((storage) => { localStorage.clear(); for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v); }, storageFor(resume));
  await page.goto(`${BASE}/editor`, { waitUntil: "load" });
  await page.waitForSelector(".resume-page");
  await sleep(1200);
};
const dismissals = () => page.$$eval("button[aria-label^='Dismiss']", (els) => els.map((el) => el.getAttribute("aria-label")));
const at = await startsFor("minimal", "letter");
// A one-line closing section spilling onto page 2. A page start from a longer resume can fit on
// page 1 of a shorter one, so the bullets grow until it spills.
for (let bullets = Math.max(1, at[1] - 4); bullets < at[2]; bullets++) {
  await open(buildResume({ slug: "minimal", size: "letter", bullets, finalSection: true }));
  if ((await page.evaluate(() => document.body.innerText.match(/about (\d+) pages?/)?.[1])) === "2") break;
}
check("Few-lines hint shows on a nearly empty last page", (await dismissals()).some((d) => d.includes("only a few lines")));
await page.evaluate(() => document.querySelector("button[aria-label*='only a few lines']")?.click());
await sleep(100);
check("Hints can be dismissed", !(await dismissals()).some((d) => d.includes("only a few lines")));

await open(buildResume({ slug: "modern", size: "letter", bullets: 90 }));
const preview = await page.evaluate(() => {
  const sheet = document.querySelector("[aria-label='Resume preview'] .resume-paper").getBoundingClientRect();
  const gaps = [...document.querySelectorAll(".page-gap")].map((g) => { const b = g.getBoundingClientRect(); return { top: b.top - sheet.top, bottom: b.bottom - sheet.top, label: g.textContent }; });
  const lines = [...document.querySelectorAll("[aria-label='Resume preview'] .resume-paper :is(h2, h3, li)")].flatMap((el) => [...el.getClientRects()].map((r) => ({ top: r.top - sheet.top, bottom: r.bottom - sheet.top })));
  return {
    gaps,
    hidden: lines.filter((l) => gaps.some((g) => l.bottom > g.top + 1 && l.top < g.bottom - 1)).length,
    after: gaps.map((g) => Math.min(...lines.map((l) => l.top).filter((t) => t >= g.bottom)) - g.bottom),
    label: Number(document.body.innerText.match(/about (\d+) pages?/)?.[1]),
  };
});
check("A gap between every pair of pages", preview.gaps.length === preview.label - 1 && preview.gaps.length >= 4, `${preview.gaps.length} gaps, ${preview.label} pages`);
check("Gaps are labelled in order", preview.gaps.every((g, i) => g.label === `Page ${i + 2}`));
check("No content sits under a gap", preview.hidden === 0, String(preview.hidden));
check("Every preview page starts at the same margin", Math.max(...preview.after) - Math.min(...preview.after) <= 2, preview.after.map(Math.round).join(","));
check("Many-pages hint shows", (await dismissals()).some((d) => d.includes(`runs to ${preview.label} pages`)));
await browser.close();

// ---- Firefox: one template per layout
if (spawnSync("firefox", ["--version"]).error || spawnSync("geckodriver", ["--version"]).error) {
  console.log("SKIP  Firefox pagination: needs firefox and geckodriver");
} else {
  failures.clear();
  const firefox = await firefoxExporter(BASE, 4800 + Math.floor(Math.random() * 90));
  for (const slug of ["professional", "minimal", "modern", "atlas", "marquee", "terrazzo", "almanac"]) {
    const size = "a4";
    await exportCase(firefox, slug, size, { bullets: 60 }, `Firefox ${slug}`);
    await exportCase(firefox, slug, size, { bullets: 6, longParagraph: true }, `Firefox ${slug} para`);
  }
  // A short section starts on the page it reaches, rather than moving whole, once its heading and first entry fit.
  const split = buildResume({ slug: "minimal", size: "letter", bullets: 20 });
  split.sections.push({ id: "two", type: "experience", title: "Later Work", visible: true, entries: ["SPLITA", "SPLITB"].map((name, i) => ({ id: `two${i}`, role: name, company: "Other Co", location: "Remote", startDate: "2015", endDate: "2019", highlights: ["Delivered measurable outcomes for clients across a broad range of projects and markets", "Mentored staff", "Improved tooling"] })) });
  await firefox(split, file);
  const pages = readLines(file);
  const onPage = (text) => pages.findIndex((p) => p.lines.some((line) => line.text.includes(text)));
  // Before, it moved whole to a new page and left a third of the last one empty.
  check("Firefox: a section starts on the page the one before it ends", onPage("SPLITA") >= 0 && onPage("SPLITA") === onPage("E4B19Z"), `last bullet on page ${onPage("E4B19Z") + 1}, SPLITA on page ${onPage("SPLITA") + 1}`);
  await firefox.close();
  check("Firefox: no pagination problems on any layout", failures.size === 0, [...failures].map(([k, v]) => `${k}: ${v.slice(0, 3).join(", ")}`).join(" | ").slice(0, 300));
}
process.exit(0);

// Stripes and frames tied to the page's edges (DesignEdges) must print on every page,
// in Chrome and, when it's installed, Firefox. Content never reaches the outer 24px of a
// page, so that band holds only the page color and these decorations: it must be the same
// on every page, and page 1's must show the decoration rather than just the page color.
// Templates come from the registry: every design whose stripe or frame DesignEdges draws.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch } from "./helpers.mjs";
import { buildResume, chromeExporter, firefoxExporter } from "./pagination-lib.mjs";

if (spawnSync("pdftoppm", ["-v"]).error) {
  console.log("\nPDF page edges\nSKIP  poppler-utils not installed");
  process.exit(0);
}

const check = createChecks("PDF page edges: stripes and frames on every page, Letter and A4");
const dir = path.join(OUT, "pdf-edges");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

// The stripes DesignEdges draws, read from its source, and the templates whose design uses one or a frame.
const engine = fs.readFileSync(path.join(process.cwd(), "src/components/resume/engine/DesignTemplate.tsx"), "utf8");
const edges = engine.slice(engine.indexOf("export function DesignEdges"), engine.indexOf("export function DesignTemplate"));
const stripes = new Set([...edges.matchAll(/design\.stripe === "(\w+)"/g)].map((m) => m[1]));
const framed = edges.includes("design.frame");
const registry = fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8");
const templates = registry.split(/\n    slug: /).slice(1).flatMap((block) => {
  const slug = block.match(/^"([^"]+)"/)[1];
  const stripe = block.match(/stripe: "(\w+)"/)?.[1];
  const frame = framed && /frame: "\w+"/.test(block);
  if (!frame && !stripes.has(stripe)) return [];
  return [{ slug, paper: block.match(/paper: "(#[0-9a-fA-F]{6})"/)?.[1] ?? "#ffffff" }];
});
check("Found templates with page-edge decorations", templates.length > 0 && stripes.size > 0, `${templates.length} templates, stripes: ${[...stripes].join(", ")}`);

const BAND = 24; // CSS px
const DPI = 72;
const lengths = [["one-page", 4, (n) => n === 1], ["long", 40, (n) => n >= 3]];

/** Every page's outer band as RGB, in CSS-pixel order, read at `DPI`. */
function bands(file) {
  const pages = Number(execFileSync("pdfinfo", [file], { encoding: "utf8" }).match(/Pages:\s+(\d+)/)[1]);
  return Array.from({ length: pages }, (_, i) => {
    const ppm = execFileSync("pdftoppm", ["-r", String(DPI), "-f", String(i + 1), "-l", String(i + 1), "-singlefile", file], { maxBuffer: 1 << 26 });
    let offset = 0;
    const fields = [];
    while (fields.length < 4) {
      let end = offset;
      while (ppm[end] > 32) end++;
      fields.push(ppm.subarray(offset, end).toString());
      offset = end + 1;
    }
    const [, w, h] = fields.map(Number);
    const edge = Math.round((BAND * DPI) / 96);
    const pixels = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (x >= edge && x < w - edge && y >= edge && y < h - edge) continue;
      const i = offset + (y * w + x) * 3;
      pixels.push([ppm[i], ppm[i + 1], ppm[i + 2]]);
    }
    return pixels;
  });
}

const differs = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 32);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const uneven = [];
const missing = [];
const wrongLength = [];
async function exportAll(engineName, run) {
  for (const { slug, paper } of templates) for (const size of ["letter", "a4"]) for (const [name, bullets, expected] of lengths) {
    const label = `${engineName} ${slug} ${size} ${name}`;
    const file = path.join(dir, `${engineName}-${slug}-${size}-${name}.pdf`);
    await run(buildResume({ slug, size, bullets }), file);
    const pages = bands(file);
    if (!expected(pages.length)) wrongLength.push(`${label}: ${pages.length} pages`);
    // A few pixels of anti-aliasing may differ; a missing stripe or frame differs by hundreds.
    pages.slice(1).forEach((band, i) => {
      const changed = band.filter((px, j) => differs(px, pages[0][j])).length;
      if (changed > 20) uneven.push(`${label} p${i + 2}: ${changed} px`);
    });
    const background = rgb(paper);
    const drawn = pages[0].filter((px) => differs(px, background)).length;
    if (drawn < 100) missing.push(`${label}: ${drawn} px`);
  }
}

const browser = await launch();
const chrome = await chromeExporter(browser, BASE);
await exportAll("Chrome", chrome);
await browser.close();

const hasFirefox = !spawnSync("firefox", ["--version"]).error && !spawnSync("geckodriver", ["--version"]).error;
if (hasFirefox) {
  const firefox = await firefoxExporter(BASE, 4200 + Math.floor(Math.random() * 90));
  await exportAll("Firefox", firefox);
  await firefox.close();
} else console.log("SKIP  Firefox page edges: needs firefox and geckodriver");

fs.writeFileSync(path.join(dir, "problems.txt"), [...wrongLength, ...uneven.map((p) => `uneven: ${p}`), ...missing.map((p) => `missing: ${p}`)].join("\n"));
check("Each resume has the intended length", wrongLength.length === 0, wrongLength.slice(0, 6).join("; "));
check("The edge band is the same on every page", uneven.length === 0, uneven.slice(0, 6).join("; "));
check("Page 1 shows the stripe or frame", missing.length === 0, missing.slice(0, 6).join("; "));
process.exit(0);

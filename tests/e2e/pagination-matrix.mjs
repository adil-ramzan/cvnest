// The full pagination matrix, run by hand: every template, Letter and A4, every case.
// BASE_URL=http://localhost:3000 node tests/e2e/pagination-matrix.mjs <chrome|firefox> <output dir> [workers]
// pagination.test.mjs runs a smaller subset of this on every test run.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./helpers.mjs";
import { analyze, buildResume, chromeExporter, expectedTokens, firefoxExporter, pageStarts } from "./pagination-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [engine = "chrome", out = ".e2e-output/pagination", workersArg = "6", shardArg] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const only = process.env.ONLY_SLUGS?.split(",");
const registry = fs.readFileSync(path.join(here, "../../src/data/templates.ts"), "utf8");
const slugs = [...registry.matchAll(/^    slug: "([^"]+)"/gm)].map((m) => m[1]).filter((s) => !only || only.includes(s));
const sizes = (process.env.SIZES ?? "letter,a4").split(",");
const caseNames = process.env.CASES?.split(",");
const banded = new Set([...registry.matchAll(/slug: "([^"]+)"[\s\S]*?(?=\n    slug: |$)/g)].filter((m) => /section(Bands|Cards): true/.test(m[0])).map((m) => m[1]));
const workers = Number(workersArg);
fs.mkdirSync(out, { recursive: true });
const calibration = path.join(out, "calibration.json");

const allCases = (starts) => {
  const start = (page) => starts[page - 1];
  const mid = (page) => Math.round((start(page) + start(page + 1)) / 2);
  return {
    p1: { bullets: Math.max(2, Math.round(start(2) / 2)) },
    p2: { bullets: mid(2) },
    p3: { bullets: mid(3) },
    p4: { bullets: mid(4) },
    p5: { bullets: mid(5) },
    p6: { bullets: mid(6) },
    p12: { bullets: mid(12) },
    line2: { bullets: start(2) + 1 },
    line3: { bullets: start(3) + 1 },
    line5: { bullets: start(5) + 1 },
    section: { bullets: start(2), finalSection: true },
    long: { bullets: 6, longEntry: true },
    para: { bullets: 6, longParagraph: true },
    side: { bullets: 6, longSide: true },
  };
};

let restarts = 0;
async function exporter(shard) {
  // A new port each time, as a driver being replaced may still hold the last one.
  if (engine === "firefox") return firefoxExporter(base, 4600 + shard + 10 * restarts++);
  const browser = await launch();
  const run = await chromeExporter(browser, base);
  run.close = () => browser.close();
  return run;
}

if (shardArg === undefined) {
  // Calibrate in Chrome: one long export shows which bullet begins each page.
  let table = fs.existsSync(calibration) ? JSON.parse(fs.readFileSync(calibration, "utf8")) : null;
  if (!table) {
    const run = await chromeExporterFor();
    table = {};
    for (const slug of slugs) for (const size of sizes) {
      const file = path.join(out, "calibrate.pdf");
      await run(buildResume({ slug, size, bullets: 520 }), file);
      table[`${slug}|${size}`] = pageStarts(file);
    }
    await run.close();
    fs.writeFileSync(calibration, JSON.stringify(table));
    console.log("calibrated", Object.keys(table).length);
  }
  const started = Date.now();
  await Promise.all(Array.from({ length: workers }, (_, shard) => new Promise((resolve) => {
    spawn(process.execPath, [fileURLToPath(import.meta.url), engine, out, String(workers), String(shard)], { stdio: "inherit" }).on("exit", resolve);
  })));
  console.log(`done in ${Math.round((Date.now() - started) / 1000)}s`);
  process.exit(0);
}

async function chromeExporterFor() {
  const browser = await launch();
  const run = await chromeExporter(browser, base);
  run.close = () => browser.close();
  return run;
}

const shard = Number(shardArg);
const table = JSON.parse(fs.readFileSync(calibration, "utf8"));
let run = await exporter(shard);
const log = fs.createWriteStream(path.join(out, `results-${engine}-${shard}.jsonl`));
const jobs = [];
for (const slug of slugs) for (const size of sizes) {
  const cases = allCases(table[`${slug}|${size}`]);
  for (const [name, options] of Object.entries(cases)) if (!caseNames || caseNames.includes(name)) jobs.push({ slug, size, name, options });
}
const pdfDir = path.join(out, `pdf-${engine}-${shard}`);
fs.mkdirSync(pdfDir, { recursive: true });
for (const [i, job] of jobs.entries()) {
  if (i % workers !== shard) continue;
  const resume = buildResume({ slug: job.slug, size: job.size, ...job.options });
  const file = path.join(pdfDir, "out.pdf");
  let result;
  // A browser that dies mid-run would fail every job after it, so restart it and retry this one.
  for (let attempt = 0; attempt < 3 && !result; attempt++) {
    try {
      const previewPages = await run(resume, file);
      result = analyze(file, { expected: expectedTokens(resume), size: job.size, bands: banded.has(job.slug) });
      for (const page of result.perPage) delete page.surface;
      result.previewPages = previewPages;
    } catch (error) {
      if (attempt === 2) result = { error: String(error).slice(0, 200) };
      await Promise.resolve(run.close()).catch(() => {});
      run = await exporter(shard);
    }
  }
  log.write(`${JSON.stringify({ slug: job.slug, size: job.size, case: job.name, ...result })}\n`);
}
await new Promise((resolve) => log.end(resolve));
await run.close();
process.exit(0);

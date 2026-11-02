// Run by hand: resumes near the browser's storage limit, about 1,500 pages.
// BASE_URL=http://localhost:3000 node tests/e2e/pagination-max.mjs <output dir>
import path from "node:path";
import { launch } from "./helpers.mjs";
import { analyze, buildResume, chromeExporter, expectedTokens } from "./pagination-lib.mjs";

const out = process.argv[2];
const browser = await launch();
const run = await chromeExporter(browser, process.env.BASE_URL ?? "http://localhost:3000");
for (const [slug, size] of [["professional", "letter"], ["minimal", "a4"], ["modern", "letter"]]) {
  const resume = buildResume({ slug, size, bullets: 24000 });
  const file = path.join(out, `max-${slug}.pdf`);
  const start = Date.now();
  const previewPages = await run(resume, file);
  const exported = Math.round((Date.now() - start) / 1000);
  const result = analyze(file, { expected: expectedTokens(resume), size });
  const kinds = {};
  for (const problem of result.problems) kinds[problem.kind] = (kinds[problem.kind] ?? 0) + 1;
  console.log(slug, size, { chars: JSON.stringify(resume).length, pages: result.pages, previewPages, exportSeconds: exported, contTop: result.contContent, contBottom: result.contBottom, problems: kinds });
}
await browser.close();
process.exit(0);

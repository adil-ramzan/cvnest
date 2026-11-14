// Exports every template in real Firefox and checks the files with poppler-utils.
// Firefox has its own print engine and export path (see usePdfExport), so on top
// of the Chrome suite's checks this confirms bold text stays in the text layer,
// digits and ligatures survive, and continuation pages keep their spacing.
// Printing goes through WebDriver's print command, which uses Firefox's PDF
// output but not its print dialog. Skips itself without Firefox or geckodriver.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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
    await exec('[...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Save as PDF anyway")?.click();');
    await sleep(80);
    await exec('[...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Continue")?.click();');
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
check("Exported a PDF for every template and dataset", files.length === 480, String(files.length));

// ---- Image detection
// Counts the images a PDF's pages draw. `pdfimages` only sees images drawn directly,
// and since Firefox 159 (Skia's PDF output) photos are painted through a tiling
// pattern, so this follows each page's resources into patterns, form XObjects, soft
// masks and Type 3 fonts, reading compressed object streams, and counts inline images
// in the content streams. Anything it can't read (encryption, unknown filters,
// missing objects) throws, so the PDF fails instead of passing as image-free.
const PDF_SPACE = "\0\t\n\f\r ";
const PDF_DELIMS = PDF_SPACE + "()<>[]{}/%";
function pdfSkip(s, i) {
  for (;;) {
    while (i < s.length && PDF_SPACE.includes(s[i])) i++;
    if (s[i] !== "%") return i;
    while (i < s.length && s[i] !== "\n" && s[i] !== "\r") i++;
  }
}
const pdfWordEnd = (s, i) => {
  while (i < s.length && !PDF_DELIMS.includes(s[i])) i++;
  return i;
};
/** Parses one PDF object at `i`: [value, end]. Dicts are { dict }, refs { ref }, names { name }, operators { op }. */
function pdfValue(s, i) {
  i = pdfSkip(s, i);
  if (i >= s.length) throw new Error("unexpected end of data");
  if (s.startsWith("<<", i)) {
    const dict = {};
    for (i += 2; ; ) {
      i = pdfSkip(s, i);
      if (s.startsWith(">>", i)) return [{ dict }, i + 2];
      const [key, j] = pdfValue(s, i);
      if (!key?.name) throw new Error(`bad dictionary key at ${i}`);
      [dict[key.name], i] = pdfValue(s, j);
    }
  }
  if (s[i] === "[") {
    const array = [];
    for (i++; ; ) {
      i = pdfSkip(s, i);
      if (s[i] === "]") return [array, i + 1];
      let item;
      [item, i] = pdfValue(s, i);
      array.push(item);
    }
  }
  if (s[i] === "(") {
    for (let depth = 0; i < s.length; i++) {
      if (s[i] === "\\") i++;
      else if (s[i] === "(") depth++;
      else if (s[i] === ")" && --depth === 0) return [{ string: true }, i + 1];
    }
    throw new Error("unterminated string");
  }
  if (s[i] === "<") {
    const end = s.indexOf(">", i);
    if (end < 0) throw new Error("unterminated hex string");
    return [{ string: true }, end + 1];
  }
  if (s[i] === "/") {
    const end = pdfWordEnd(s, i + 1);
    return [{ name: s.slice(i + 1, end).replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) }, end];
  }
  const end = pdfWordEnd(s, i);
  if (end === i) throw new Error(`unexpected "${s[i]}" at ${i}`);
  const word = s.slice(i, end);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return [{ op: word }, end];
  const ref = /^\d+$/.test(word) && /[\0\t\n\f\r ]+(\d+)[\0\t\n\f\r ]+R(?![^\0\t\n\f\r ()<>[\]{}/%])/y;
  if (ref) {
    ref.lastIndex = end;
    if (ref.exec(s)) return [{ ref: Number(word) }, ref.lastIndex];
  }
  return [Number(word), end];
}

function pdfImageCount(file, pageCount) {
  const buf = fs.readFileSync(file);
  const s = buf.toString("latin1");
  if (/\/Encrypt[\0\t\n\f\r /<[\d]/.test(s)) throw new Error("encrypted PDF");
  const objects = new Map();
  const get = (v) => {
    if (!v?.ref) return v;
    if (!objects.has(v.ref)) throw new Error(`missing object ${v.ref}`);
    return objects.get(v.ref).value;
  };
  const decode = ({ value: { dict }, data }) => {
    const filters = [dict.Filter ?? []].flat();
    if (filters.some((f) => f.name !== "FlateDecode")) throw new Error(`unsupported filter ${filters.map((f) => f.name).join(", ")}`);
    if ([dict.DecodeParms ?? []].flat().some((p) => p?.dict?.Predictor > 1)) throw new Error("unsupported predictor");
    return (filters.length ? zlib.inflateSync(data) : data).toString("latin1");
  };

  // Top-level objects, stepping over stream data by its /Length.
  const header = /(\d+)[\0\t\n\f\r ]+\d+[\0\t\n\f\r ]+obj(?![^\0\t\n\f\r ()<>[\]{}/%])/g;
  const endsStream = (end) => /^[\0\t\n\f\r ]*endstream/.test(s.slice(end, end + 32));
  const deferred = [];
  for (let m; (m = header.exec(s)); ) {
    let [value, i] = pdfValue(s, m.index + m[0].length);
    i = pdfSkip(s, i);
    const object = { value };
    if (s.startsWith("stream", i)) {
      let start = i + 6;
      if (s[start] === "\r") start++;
      if (s[start] === "\n") start++;
      let length = value.dict?.Length;
      if (length?.ref) length = Number(new RegExp(`(?:^|[^\\d])${length.ref}[\\0\\t\\n\\f\\r ]+\\d+[\\0\\t\\n\\f\\r ]+obj[\\0\\t\\n\\f\\r ]*(\\d+)[\\0\\t\\n\\f\\r ]*endobj`).exec(s)?.[1]);
      if (Number.isInteger(length) && endsStream(start + length)) {
        object.data = buf.subarray(start, start + length);
        i = start + length;
      } else if (value.dict?.Length?.ref) {
        // The length is inside an object stream: step to "endstream" now, check the length once it's readable.
        i = s.indexOf("endstream", start);
        if (i < 0) throw new Error(`can't find the end of stream ${m[1]}`);
        deferred.push({ object, start, end: i, id: m[1] });
      } else throw new Error(`can't find the end of stream ${m[1]}`);
    }
    objects.set(Number(m[1]), object);
    header.lastIndex = i;
  }
  // Objects packed in compressed object streams.
  for (const stream of [...objects.values()].filter((o) => o.value.dict?.Type?.name === "ObjStm")) {
    if (!stream.data) throw new Error("object stream with an unreadable length");
    const text = decode(stream);
    const { N, First } = stream.value.dict;
    const index = text.slice(0, First).trim().split(/[\0\t\n\f\r ]+/).map(Number);
    if (!Number.isInteger(N) || index.length !== 2 * N || index.some(Number.isNaN)) throw new Error("malformed object stream");
    for (let k = 0; k < N; k++) {
      if (objects.has(index[2 * k])) throw new Error(`object ${index[2 * k]} is defined twice`);
      objects.set(index[2 * k], { value: pdfValue(text, First + index[2 * k + 1])[0] });
    }
  }
  for (const { object, start, end, id } of deferred) {
    const length = get(object.value.dict.Length);
    if (!Number.isInteger(length) || start + length > end || !endsStream(start + length)) throw new Error(`stream ${id} doesn't match its length`);
    object.data = buf.subarray(start, start + length);
  }

  const pages = [...objects.values()].filter((o) => o.value.dict?.Type?.name === "Page").map((o) => o.value.dict);
  if (pages.length !== pageCount) throw new Error(`found ${pages.length} of ${pageCount} pages`);
  const images = new Set();
  const visited = new Set();
  let inline = 0;
  const countInline = (stream) => {
    if (!stream?.data) throw new Error("expected a content stream");
    const text = decode(stream);
    for (let i = pdfSkip(text, 0); i < text.length; i = pdfSkip(text, i)) {
      let token;
      [token, i] = pdfValue(text, i);
      if (token?.op !== "BI") continue;
      inline++;
      const id = /[\0\t\n\f\r ]ID[\0\t\n\f\r ]/g;
      id.lastIndex = i;
      if (!id.exec(text)) throw new Error("inline image without data");
      const ei = /[\0\t\n\f\r ]EI(?![^\0\t\n\f\r ])/g;
      ei.lastIndex = id.lastIndex;
      if (!ei.exec(text)) throw new Error("unterminated inline image");
      i = ei.lastIndex;
    }
  };
  const draw = (ref) => {
    const value = get(ref)?.dict;
    // Shading patterns can be direct dictionaries and draw no images.
    if (value?.PatternType === 2) return;
    if (!ref?.ref || !value) throw new Error("expected an indirect XObject or pattern");
    if (value.Subtype?.name === "Image") return images.add(ref.ref);
    if (visited.has(ref.ref)) return;
    visited.add(ref.ref);
    if (value.Subtype?.name !== "Form" && value.PatternType !== 1) return;
    walk(value.Resources);
    countInline(objects.get(ref.ref));
  };
  const walk = (resources) => {
    const res = get(resources)?.dict;
    if (!res) return;
    for (const x of Object.values(get(res.XObject)?.dict ?? {})) draw(x);
    for (const p of Object.values(get(res.Pattern)?.dict ?? {})) draw(p);
    for (const gs of Object.values(get(res.ExtGState)?.dict ?? {})) {
      const mask = get(get(gs)?.dict?.SMask);
      if (mask?.dict) draw(mask.dict.G);
    }
    for (const ref of Object.values(get(res.Font)?.dict ?? {})) {
      const font = get(ref)?.dict;
      if (font?.Subtype?.name !== "Type3") continue;
      walk(font.Resources);
      for (const proc of Object.values(get(font.CharProcs)?.dict ?? {})) countInline(objects.get(proc.ref));
    }
  };
  for (const page of pages) {
    // Resources can be inherited from the page tree.
    let node = page;
    while (node && !node.Resources && node.Parent) node = get(node.Parent)?.dict;
    walk(node?.Resources);
    const contents = objects.get(page.Contents?.ref)?.data ? [page.Contents] : [get(page.Contents) ?? []].flat();
    for (const ref of contents) countInline(objects.get(ref.ref));
  }
  return images.size + inline;
}

// ---- Verify
const run =(cmd, args) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
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

  let images;
  try {
    images = pdfImageCount(file, pages);
  } catch (error) {
    problems.push(`${label}: couldn't inspect images (${error.message})`);
    continue;
  }
  // Cross-check against pdfimages, which lists every use and soft mask, so only its absence of images is comparable.
  const listed = run("pdfimages", ["-list", file]).split("\n").slice(2).filter((l) => l.trim()).length;
  if (listed > 0 && images === 0) problems.push(`${label}: image detection found none, pdfimages lists ${listed}`);
  const showsPhoto = name !== "empty" && photoMode[slug] !== "none" && !handWritten.has(slug);
  if (showsPhoto && images < 1) problems.push(`${label}: expected the photo, found no images`);
  if (!showsPhoto && images !== 0) problems.push(`${label}: unexpected images (${images})`);
}
fs.writeFileSync(path.join(dir, "problems.txt"), problems.join("\n"));
check("All PDFs pass size, text, font, bounds, spacing and image checks", problems.length === 0, `${problems.length}: ${problems.slice(0, 6).join(" | ")}`);
// Lower than Chrome's bar: Firefox ignores break-after: avoid, so entries and short sections stay whole.
check("Non-final pages are well filled", leastFilled >= 0.55, `${Math.round(leastFilled * 100)}% minimum`);

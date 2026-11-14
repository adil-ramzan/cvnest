// Browser printing outside Save as PDF: site pages print their own content, Ctrl/Cmd+P in
// the editor runs the Save as PDF flow (without the notice before it), and the browser's Print
// menu prints the resume, or a note saying to use Save as PDF if its fonts or photo aren't ready. Skips without poppler.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, OUT, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

if (spawnSync("pdftotext", ["-v"]).error) {
  console.log("\nBrowser printing\nSKIP  poppler-utils (pdftotext) not installed");
  process.exit(0);
}

const check = createChecks("Browser printing: site pages, Ctrl/Cmd+P, the browser's Print menu");
const dir = path.join(OUT, "print");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8").trim();
const browser = await launch();
const errors = [];

const resume = (extra = {}) => ({
  schemaVersion: 2, id: "p1", name: "Print test", createdAt: 1, updatedAt: 2,
  profile: { fullName: "Priya Printwell", jobTitle: "Quality Lead", email: "priya@example.com", phone: "", location: "Leeds" },
  sections: [{ id: "s1", type: "summary", title: "Profile", visible: true, content: "Keeps printed pages honest." }],
  design: { templateId: "professional", pageSize: "a4" }, ...extra,
});

async function newPage() {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    window.print = () => {
      window.__printed = (window.__printed || 0) + 1;
    };
  });
  return page;
}
async function editorWith(page, data) {
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((d) => {
    localStorage.clear();
    localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [d] }));
    localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: d.id, zoom: "fit" }));
  }, data);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(1200);
}
const pdfText = async (page, name) => {
  const file = path.join(dir, `${name}.pdf`);
  await page.pdf({ path: file, preferCSSPageSize: true });
  return execFileSync("pdftotext", [file, "-"], { encoding: "utf8" });
};
const pressPrintShortcut = async (page, modifier = "Control") => {
  await page.keyboard.down(modifier);
  await page.keyboard.press("p");
  await page.keyboard.up(modifier);
  await sleep(300);
};
const printed = (page) => page.evaluate(() => window.__printed || 0);
const finishPrint = (page) => page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
const printState = (page) =>
  page.evaluate(() => ({
    root: !!document.querySelector(".print-root"),
    note: !!document.querySelector(".print-root .print-note"),
    attribute: document.documentElement.hasAttribute("data-printing"),
    title: document.title,
  }));

// ---- Site pages print their own content
{
  const page = await newPage();
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  const about = await pdfText(page, "about");
  check("/about prints its own text", about.includes("About CVNest") && about.includes("free online resume builder"), about.slice(0, 80).replace(/\s+/g, " "));
  await page.goto(`${BASE}/templates/kinetic`, { waitUntil: "networkidle0" });
  check("A template page prints its own text", (await pdfText(page, "template-page")).includes("Kinetic"));
  await page.close();
}

// ---- Ctrl/Cmd+P in the editor runs the Save as PDF flow
{
  const page = await newPage();
  await editorWith(page, resume());
  const before = await printed(page);
  await pressPrintShortcut(page, "Control");
  check("Ctrl+P opens the print window through Save as PDF", await waitFor(async () => (await printed(page)) === before + 1, 5000));
  check("Ctrl+P doesn't show the Save as PDF notice", (await page.$$("dialog[open]")).length === 0);
  const during = await printState(page);
  check("Ctrl+P: the resume's print copy is mounted and the page marked as printing", during.root && !during.note && during.attribute, JSON.stringify(during));
  check("Ctrl+P: the PDF file name is suggested", during.title === "Print test", during.title);
  const text = await pdfText(page, "ctrl-p");
  check("Ctrl+P: the printout is the resume, not the editor", text.includes("Priya Printwell") && !text.includes("Saved locally") && !text.includes("Customize"));
  await finishPrint(page);
  await waitFor(() => page.evaluate(() => !document.querySelector(".print-root")), 3000);
  check("Ctrl+P: afterwards the print copy and the printing mark are gone", !(await printState(page)).root && !(await printState(page)).attribute);

  await pressPrintShortcut(page, "Meta");
  check("Cmd+P does the same", await waitFor(async () => (await printed(page)) === before + 2, 5000));
  await finishPrint(page);
  await sleep(300);

  const saveButton = await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF"))?.innerText.trim());
  check("The top bar button says Save as PDF", saveButton === "Save as PDF", saveButton);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForSelector("dialog[open]");
  const notice = await page.evaluate(() => document.querySelector("dialog[open]").innerText);
  check(
    "Save as PDF first says what to choose, and the file name",
    notice.includes("In the next window, choose “Save as PDF” as the destination. Your browser may suggest the name “Print test.pdf”."),
    notice.replace(/\s+/g, " "),
  );
  check("The notice says the resume stays in the browser", notice.includes("Your resume stays in your browser."));
  check("The notice offers Continue and Don't show this again", notice.includes("Continue") && notice.includes("Don't show this again"));
  check("Nothing prints until Continue", (await printed(page)) === before + 2);
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Continue").click());
  await waitFor(async () => (await printed(page)) === before + 3, 5000);
  const exported = await pdfText(page, "download-pdf");
  check("Save as PDF itself still prints the resume only", exported.includes("Priya Printwell") && !exported.includes("Saved locally"));
  await finishPrint(page);
  await sleep(300);

  // "Don't show this again" is remembered.
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForSelector("dialog[open]");
  await page.evaluate(() => document.querySelector("dialog[open] input[type=checkbox]").click());
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Continue").click());
  await waitFor(async () => (await printed(page)) === before + 4, 5000);
  await finishPrint(page);
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  check("After Don't show this again, Save as PDF opens the print window directly", await waitFor(async () => (await printed(page)) === before + 5, 5000));
  check("and shows no notice", (await page.$$("dialog[open]")).length === 0);
  await finishPrint(page);
  await page.close();
}

// ---- On a phone, the notice matches the system print screen
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  await editorWith(page, resume());
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForSelector("dialog[open]");
  const notice = await page.evaluate(() => document.querySelector("dialog[open]").innerText);
  check(
    "Phone: the notice uses the print screen's wording",
    notice.includes("On Android, choose “Save as PDF” as the printer. On iPhone or iPad, tap Share, then Save to Files. Your browser may suggest the name “Print test.pdf”.") && notice.includes("Your resume stays in your browser."),
    notice.replace(/\s+/g, " "),
  );
  await page.close();
}

// ---- Ctrl+P keeps the empty and sample checks
{
  const page = await newPage();
  await editorWith(page, resume({ profile: { fullName: "", jobTitle: "", email: "", phone: "", location: "" }, sections: [] }));
  await pressPrintShortcut(page);
  check("Ctrl+P on an empty resume asks first, like Save as PDF", (await page.evaluate(() => document.querySelector("dialog[open]")?.innerText ?? "")).includes("Your resume is empty"));
  check("Ctrl+P on an empty resume doesn't print yet", (await printed(page)) === 0);
  await pressPrintShortcut(page);
  check("Ctrl+P while a dialog is open does nothing more", (await page.$$("dialog[open]")).length === 1 && (await printed(page)) === 0);
  await page.close();

  const sample = await newPage();
  await editorWith(sample, resume({ profile: { ...resume().profile, sampleFields: ["fullName"] } }));
  await pressPrintShortcut(sample);
  check("Ctrl+P with sample content asks to review it, like Save as PDF", (await sample.evaluate(() => document.querySelector("dialog[open]")?.innerText ?? "")).includes("still contains sample content"));
  await sample.close();
}

// ---- The browser's Print menu
{
  const page = await newPage();
  await editorWith(page, resume());
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  const ready = await printState(page);
  check("Print menu: the resume is printed when everything is ready", ready.root && !ready.note && ready.attribute, JSON.stringify(ready));
  const text = await pdfText(page, "menu-ready");
  check("Print menu: the printout is the resume, not the editor", text.includes("Priya Printwell") && text.includes("Keeps printed pages honest") && !text.includes("Saved locally"));
  await finishPrint(page);
  await sleep(300);
  const after = await printState(page);
  check("Print menu: afterwards everything is put back (copy, mark and title)", !after.root && !after.attribute && after.title !== "Print test", JSON.stringify(after));
  check("Print menu: the editor didn't open its own print window", (await printed(page)) === 0);

  // Fonts still loading: a note instead of a page that could come out wrong.
  await page.evaluate(() => Object.defineProperty(document.fonts, "status", { configurable: true, get: () => "loading" }));
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  const notReady = await printState(page);
  check("Print menu, fonts not ready: a note is printed instead of the resume", notReady.root && notReady.note, JSON.stringify(notReady));
  const note = await pdfText(page, "menu-not-ready");
  check("Print menu, fonts not ready: the note says to use Save as PDF", note.includes("Use Save as PDF") && note.includes("as the destination") && !note.includes("Keeps printed pages honest"), note.slice(0, 120).replace(/\s+/g, " "));
  await finishPrint(page);
  await page.close();
}

// ---- The Print menu with a photo that has loaded
{
  const page = await newPage();
  await editorWith(page, resume({ profile: { ...resume().profile, photo: { id: "ph", mimeType: "image/jpeg", width: 400, height: 400, byteSize: 1, updatedAt: 1, inlineData: photo } }, design: { templateId: "portrait", pageSize: "a4" } }));
  await waitFor(() => page.$eval("[aria-label='Resume preview'] .resume-paper img", (img) => img.complete && img.naturalWidth > 0), 5000);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  const state = await printState(page);
  check("Print menu with a loaded photo: the resume is printed, not the note", state.root && !state.note, JSON.stringify(state));
  const file = path.join(dir, "menu-photo.pdf");
  await page.pdf({ path: file, preferCSSPageSize: true });
  const images = execFileSync("pdfimages", ["-list", file], { encoding: "utf8" }).split("\n").slice(2).filter((l) => l.trim()).length;
  check("Print menu with a loaded photo: the photo is in the printout", images === 1, `${images} images`);
  await finishPrint(page);
  await page.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

// UI quick wins: focus returns to the menu after its dialogs, dialogs open on the intended
// button, clearer restore and sample wording, restore progress, the template page's main
// action on phones, the undo toast clear of content, a no-JavaScript message, a sample prompt
// on phones, and the resume name readable on phones.
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch, sleep, waitFor } from "./helpers.mjs";

const check = createChecks("UI quick wins");
const browser = await launch();
const errors = [];

const resume = (id, name, extra = {}) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: "Jordan Avery", jobTitle: "Designer", email: "", phone: "", location: "" },
  sections: [{ id: `${id}s`, type: "summary", title: "Profile", visible: true, content: "Hello" }],
  design: { templateId: "professional", pageSize: "letter" }, ...extra,
});
const empty = (id) => ({ ...resume(id, "Untitled resume"), profile: { fullName: "", jobTitle: "", email: "", phone: "", location: "" }, sections: [] });

async function editor(resumes, width = 1280) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width, height: 800 });
  await page.evaluateOnNewDocument(() => {
    window.print = () => {
      window.__printed = (window.__printed || 0) + 1;
    };
  });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  if (resumes) {
    await page.evaluate((list) => {
      localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: list }));
      localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: list[0].id, zoom: "fit" }));
    }, resumes);
  }
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("select");
  await sleep(700);
  return { context, page };
}
const focused = (page) => page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || document.activeElement?.tagName || "").trim().slice(0, 50));
const menuItem = async (page, name) => {
  await page.click("[aria-label='More actions']");
  await page.waitForSelector("[role=menu]");
  await page.evaluate((n) => [...document.querySelectorAll("[role=menu] button")].find((b) => b.textContent.trim() === n).click(), name);
  await page.waitForSelector("dialog[open]");
  await sleep(200);
};
const dialogButton = (page, name) => page.evaluate((n) => [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.trim() === n).click(), name);
const closed = (page) => waitFor(() => page.evaluate(() => !document.querySelector("dialog[open]")), 3000);

// ---- A11Y-02: focus returns to the menu trigger after Rename and Delete
{
  const { context, page } = await editor([resume("a", "First"), resume("b", "Second")]);
  for (const [item, how] of [["Rename", "Escape"], ["Rename", "Cancel"], ["Delete", "Escape"], ["Delete", "Cancel"]]) {
    await menuItem(page, item);
    if (how === "Escape") await page.keyboard.press("Escape");
    else await dialogButton(page, "Cancel");
    await closed(page);
    await sleep(200);
    const now = await focused(page);
    check(`${item}, closed with ${how}: focus returns to "More actions"`, now === "More actions", now);
  }
  await context.close();
}

// ---- VIS-03 and initial focus: dialogs open on their intended button, not the first focusable element
{
  const big = Array.from({ length: 6 }, (_, i) => resume(`r${i}`, `Backup ${i}`));
  const file = path.join(OUT, "quickwins-restore.json");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ kind: "resume-backup", schemaVersion: 2, exportedAt: "2026-11-12T00:00:00Z", resumes: big }));
  const { context, page } = await editor([resume("a", "Mine")], 375);
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  await sleep(300);
  const state = await page.evaluate(() => ({ active: document.activeElement.textContent.trim(), list: document.activeElement.tagName === "UL" }));
  check("Restore dialog opens with focus on Cancel, not the scrollable list (no dark ring around it)", state.active === "Cancel" && !state.list, JSON.stringify(state));
  await page.evaluate(() => [...document.querySelectorAll("dialog[open] input[name=restore-mode]")][1].click());
  await sleep(100);
  check("Replace option says it can be undone for 7 days", (await page.$eval("dialog[open]", (el) => el.innerText)).includes("Removes the 1 resume in this browser. You can put them back for 7 days."));
  await page.keyboard.press("Escape");
  await sleep(300);
  await context.close();
}
{
  const { context, page } = await editor([empty("e")]);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForSelector("dialog[open]");
  await sleep(200);
  check("Empty-resume dialog opens on \"Load sample data\"", (await focused(page)) === "Load sample data", await focused(page));
  await context.close();
}
{
  const { context, page } = await editor([resume("s", "Sample", { profile: { ...resume("s", "x").profile, sampleFields: ["fullName"] } })]);
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
  await page.waitForSelector("dialog[open]");
  await sleep(200);
  check("Sample dialog opens on \"Review\"", (await focused(page)) === "Review", await focused(page));
  const title = await page.$eval("dialog[open] h2", (el) => el.textContent);
  check("Sample dialog title has no full stop, like the other titles", title === "This resume still contains sample content", title);
  await context.close();
}

// ---- PERF-01: the restore button shows a spinner while it works
{
  const photo = "data:image/jpeg;base64," + "A".repeat(1_200_000);
  const resumes = Array.from({ length: 12 }, (_, i) => ({ ...resume(`p${i}`, `Photo ${i}`), profile: { ...resume("x", "x").profile, photo: { id: `qp${i}`, mimeType: "image/jpeg", width: 1, height: 1, byteSize: 1, updatedAt: 1, inlineData: photo } } }));
  const file = path.join(OUT, "quickwins-slow.json");
  fs.writeFileSync(file, JSON.stringify({ kind: "resume-backup", schemaVersion: 2, exportedAt: "2026-11-12T00:00:00Z", resumes }));
  const { context, page } = await editor([resume("a", "Mine")]);
  await (await page.$("[aria-label='Choose a backup file']")).uploadFile(file);
  await page.waitForSelector("dialog[open]");
  await sleep(200);
  await dialogButton(page, "Restore");
  await sleep(40);
  const busy = await page.evaluate(() => {
    const button = [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent.includes("Restoring"));
    return { text: button?.textContent.trim(), spinner: !!button?.querySelector("svg.animate-spin") };
  });
  check("Restoring shows a spinner next to \"Restoring…\"", busy.text === "Restoring…" && busy.spinner, JSON.stringify(busy));
  await closed(page);
  await context.close();
}

// ---- UX-05: the undo toast doesn't cover the last rows
{
  const { context, page } = await editor([resume("a", "First"), resume("b", "Second")], 375);
  await menuItem(page, "Delete");
  await dialogButton(page, "Delete resume");
  await sleep(500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(300);
  const overlap = await page.evaluate(() => {
    const toast = [...document.querySelectorAll("[role=status]")].find((el) => el.textContent.includes("Undo"))?.getBoundingClientRect();
    const add = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Add section")?.getBoundingClientRect();
    return { toastTop: Math.round(toast?.top ?? 0), addBottom: Math.round(add?.bottom ?? 0) };
  });
  check("Undo toast: scrolled to the bottom, \"Add section\" sits above the toast", overlap.toastTop > 0 && overlap.addBottom <= overlap.toastTop, JSON.stringify(overlap));
  await context.close();
}

// ---- UX-07: sample prompt on the phone's edit view; RESP-01: the name is readable on phones
{
  const { context, page } = await editor([empty("e")], 375);
  const visible = await page.evaluate(() => [...document.querySelectorAll("[role=tabpanel] button")].some((b) => b.textContent.trim() === "Load sample data" && b.offsetParent !== null));
  check("Phone, empty resume: \"Load sample data\" is on the edit view", visible);
  await page.evaluate(() => [...document.querySelectorAll("[role=tabpanel] button")].find((b) => b.textContent.trim() === "Load sample data").click());
  await sleep(500);
  check("Phone: loading the sample fills the resume and the prompt goes away", !(await page.evaluate(() => [...document.querySelectorAll("[role=tabpanel] p")].some((p) => p.textContent === "New here? See a finished example"))));
  await context.close();
}
{
  const { context, page } = await editor([empty("e")], 1280);
  check("Desktop: the phone-only sample prompt is hidden (the preview offers it)", !(await page.evaluate(() => [...document.querySelectorAll("[role=tabpanel] p")].some((p) => p.textContent === "New here? See a finished example" && p.offsetParent !== null))));
  await context.close();
}
{
  const { context, page } = await editor([resume("a", "Product Designer CV")], 375);
  const switcher = await page.evaluate(() => {
    const b = document.querySelector("header [aria-haspopup='menu']");
    const r = b.getBoundingClientRect();
    const label = b.querySelector(".truncate");
    return { w: Math.round(r.width), h: Math.round(r.height), full: label.scrollWidth <= label.clientWidth, text: label.textContent };
  });
  check("Phone: the resume name shows in full on its own row", switcher.full && switcher.text === "Product Designer CV" && switcher.h >= 40, JSON.stringify(switcher));
  check("Phone: no horizontal scroll", (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  await page.setViewport({ width: 1280, height: 800 });
  await sleep(300);
  check("Desktop: the top bar keeps its height (78px)", Math.round(await page.evaluate(() => document.querySelector("header").getBoundingClientRect().height)) === 78);
  await context.close();
}

// ---- UX-04: the template page's main action is on the first screen on phones
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width: 375, height: 800 });
  await page.goto(`${BASE}/templates/kinetic`, { waitUntil: "networkidle0" });
  const cta = await page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => a.textContent.trim() === "Use This Free Template" && a.offsetParent !== null).map((a) => ({ bottom: Math.round(a.getBoundingClientRect().bottom), href: a.getAttribute("href") })));
  check("Phone: one visible \"Use This Free Template\", within the first screen", cta.length === 1 && cta[0].bottom <= 800 && cta[0].href === "/editor?template=kinetic", JSON.stringify(cta));
  await page.setViewport({ width: 1280, height: 800 });
  await sleep(200);
  const desktop = await page.evaluate(() => [...document.querySelectorAll("a")].filter((a) => a.textContent.trim() === "Use This Free Template" && a.offsetParent !== null).length);
  check("Desktop: still exactly one visible \"Use This Free Template\" (in the side panel)", desktop === 1, String(desktop));
  await context.close();
}

// ---- UX-06: without JavaScript the editor explains itself
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setJavaScriptEnabled(false);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  const text = await page.evaluate(() => document.body.innerText);
  check("No JavaScript: says the editor needs it and saved resumes are still here", text.includes("The resume editor needs JavaScript") && text.includes("still here"));
  await context.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

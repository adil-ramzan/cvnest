// Save status and notices: problem states have distinct visible labels at every width, the
// explanation opens by tap or keyboard, and the backup reminder steps aside for warnings and
// is compact on phones.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Save status labels, detail popover and backup reminder");
const browser = await launch();
const errors = [];

const resume = (id, name, extra = {}) => ({
  schemaVersion: 2, id, name, createdAt: 1, updatedAt: 2,
  profile: { fullName: `${name} Person`, jobTitle: "Tester", email: "", phone: "", location: "" },
  sections: [{ id: `${id}s`, type: "summary", title: "Profile", visible: true, content: "Hello" }],
  design: { templateId: "professional", pageSize: "letter" }, ...extra,
});

const states = {
  saved: { stored: JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha")] }) },
  held: {
    stored: JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha"), "unreadable"] }),
    init: () => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "folio.resumes.v2.unreadable-backup") throw new DOMException("full", "QuotaExceededError");
        return set.call(this, k, v);
      };
    },
  },
  blocked: { stored: JSON.stringify({ schemaVersion: 3, resumes: [{ ...resume("n", "Newer"), schemaVersion: 3 }] }) },
  unavailable: {
    stored: JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha")] }),
    init: () => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "folio.probe") throw new DOMException("denied", "SecurityError");
        return set.call(this, k, v);
      };
    },
  },
  error: { stored: JSON.stringify({ schemaVersion: 2, resumes: [resume("a", "Alpha")] }), failSaves: true },
};
const expected = { held: "Paused", blocked: "Not saving", unavailable: "No storage", error: "Not saved" };

async function open(state, width) {
  const { stored, init, failSaves } = states[state];
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setViewport({ width, height: 900 });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((v) => {
    localStorage.clear();
    localStorage.setItem("folio.resumes.v2", v);
  }, stored);
  if (init) await page.evaluateOnNewDocument(init);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[aria-controls][aria-expanded] span[title]");
  await sleep(500);
  if (failSaves) {
    await page.evaluate(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "folio.resumes.v2") throw new DOMException("full", "QuotaExceededError");
        return set.call(this, k, v);
      };
    });
    await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Customize").click());
    await sleep(300);
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Large").click());
    await sleep(900);
    await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Content").click());
    await sleep(300);
  }
  return { context, page };
}

const indicator = (page) =>
  page.evaluate(() => {
    const button = document.querySelector("header [aria-controls][aria-expanded] span[title]")?.closest("button");
    const label = [...(button?.querySelectorAll("span[title] > span") ?? [])].find((s) => s.offsetParent !== null && getComputedStyle(s).position !== "absolute");
    const box = button?.getBoundingClientRect();
    return { visible: label?.innerText.trim() ?? "", name: button?.innerText.trim() ?? "", w: box?.width ?? 0, h: box?.height ?? 0 };
  });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const switcherWidth = (page) => page.evaluate(() => document.querySelector("header [aria-haspopup='menu']")?.getBoundingClientRect().width ?? 0);
const panel = (page) => page.$eval("[role=tabpanel]", (el) => el.innerText);

// ---- Labels at phone and desktop widths
for (const width of [375, 1280]) {
  const seen = {};
  for (const state of ["held", "blocked", "unavailable", "error"]) {
    const { context, page } = await open(state, width);
    const info = await indicator(page);
    seen[state] = info.visible;
    check(`${width}px ${state}: visible label "${expected[state]}"`, info.visible === expected[state], JSON.stringify(info));
    if (width === 375) {
      check(`${width}px ${state}: no horizontal scroll`, (await overflow(page)) <= 0, String(await overflow(page)));
      check(`${width}px ${state}: the indicator is at least 40px tall`, info.h >= 40, JSON.stringify(info));
      const sw = await switcherWidth(page);
      check(`${width}px ${state}: the resume switcher keeps at least 40px`, sw >= 40, `${Math.round(sw)}px`);
    }
    await context.close();
  }
  check(`${width}px: the four problem states have four different labels`, new Set(Object.values(seen)).size === 4, JSON.stringify(seen));
}

// ---- Saved stays icon-only on phones, but is named for screen readers
{
  const { context, page } = await open("saved", 375);
  const info = await indicator(page);
  check("375px saved: no visible label (icon only)", info.visible === "", JSON.stringify(info));
  check("375px saved: still named \"Saved locally\" for screen readers", info.name.includes("Saved locally"));
  await context.close();
}

// ---- Detail popover: tap, keyboard, Escape, tap outside
{
  const { context, page } = await open("blocked", 375);
  const detail = () => page.evaluate(() => {
    const button = document.querySelector("header [aria-controls][aria-expanded] span[title]").closest("button");
    const pop = document.getElementById(button.getAttribute("aria-controls"));
    return { expanded: button.getAttribute("aria-expanded"), shown: !pop.hidden && pop.getBoundingClientRect().height > 0, text: pop.innerText };
  });
  check("Popover: closed at first", (await detail()).expanded === "false" && !(await detail()).shown);
  await page.tap("header [aria-controls][aria-expanded]");
  await sleep(200);
  const opened = await detail();
  check("Popover: a tap opens the explanation", opened.expanded === "true" && opened.shown && opened.text.includes("newer version"), JSON.stringify(opened));
  await page.keyboard.press("Escape");
  await sleep(200);
  check("Popover: Escape closes it", (await detail()).expanded === "false" && !(await detail()).shown);
  await page.focus("header [aria-controls][aria-expanded]");
  await page.keyboard.press("Enter");
  await sleep(200);
  check("Popover: Enter opens it from the keyboard", (await detail()).shown);
  await page.mouse.click(10, 600);
  await sleep(200);
  check("Popover: a tap elsewhere closes it", !(await detail()).shown);
  await context.close();
}

// ---- Backup reminder: steps aside for warnings, compact on phones
{
  const { context, page } = await open("saved", 375);
  const reminder = () => page.evaluate(() => {
    const title = [...document.querySelectorAll("[role=tabpanel] p")].find((p) => p.textContent === "Back up your resume");
    const box = title?.closest(".rounded-2xl");
    // The innermost element holding the message (its containers hold the title and button too).
    const body = box ? [...box.querySelectorAll("div")].filter((d) => d.textContent.includes("It only lives in this browser")).pop() : null;
    return { shown: !!title, height: box?.getBoundingClientRect().height ?? 0, bodyShown: !!body && body.offsetParent !== null };
  });
  const phone = await reminder();
  check("Reminder shows when there is no warning", phone.shown);
  check("Reminder on a phone: title and button only, the message is hidden", phone.shown && !phone.bodyShown, JSON.stringify(phone));
  await page.setViewport({ width: 1280, height: 900 });
  await sleep(300);
  const desktop = await reminder();
  check("Reminder on desktop: the message shows", desktop.bodyShown);
  console.log(`Reminder height: ${Math.round(phone.height)}px at 375, ${Math.round(desktop.height)}px at 1280`);
  await context.close();
}
for (const state of ["held", "blocked", "error"]) {
  const { context, page } = await open(state, 1280);
  check(`Reminder is hidden while the ${state} warning shows`, !(await panel(page)).includes("Back up your resume"));
  await context.close();
}
{
  const { context, page } = await open("saved", 1280);
  await page.evaluate(() => localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [{ schemaVersion: 2, id: "a", name: "Alpha", createdAt: 1, updatedAt: 2, profile: { fullName: "Alpha Person", jobTitle: "", email: "", phone: "", location: "" }, sections: [], design: { templateId: "professional", pageSize: "letter" } }, "unreadable"] })));
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(600);
  check("Reminder is hidden while the recovered warning shows", (await panel(page)).includes("could not be read") && !(await panel(page)).includes("Back up your resume"));
  await context.close();
}

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

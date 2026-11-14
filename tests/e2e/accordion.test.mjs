// Section cards in the Content tab open and close over --accordion-duration (700ms):
// height, fade and chevron together, reversible mid-way, single-open, with closed content
// unreachable, typing kept, the preview still, scrolling only when a card would be cut off,
// and no layout problems at phone, tablet and desktop sizes.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Section cards: 700ms open and close, scrolling and layout");
/** --accordion-duration; waits below are relative to it, so they follow a change of duration. */
const D = 700;
const browser = await launch();
const errors = [];

const bullets = (e) => Array.from({ length: 6 }, (_, b) => `Led a cross-functional programme that reduced cost across several regions and improved reliability for every customer group T${e}x${b}`);
const resume = {
  schemaVersion: 2, id: "acc", name: "Accordion", createdAt: 1, updatedAt: 2,
  profile: { fullName: "Card Tester", jobTitle: "Engineer", email: "card@example.com", phone: "", location: "" },
  sections: [
    { id: "s", type: "summary", title: "Profile", visible: true, content: "Engineer with a long record of shipping reliable products." },
    { id: "x", type: "experience", title: "Experience", visible: true, entries: Array.from({ length: 9 }, (_, e) => ({ id: `x${e}`, role: `Role ${e} Lead`, company: `Company ${e}`, startDate: "2019", endDate: "2020", highlights: bullets(e) })) },
    { id: "p", type: "projects", title: "Projects", visible: true, entries: Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `Project ${i}`, description: "An open source tool used by thousands of developers to manage deployments." })) },
    { id: "e", type: "education", title: "Education", visible: true, entries: [{ id: "e0", degree: "B.S. Computer Science", school: "State University", startDate: "2004", endDate: "2008" }] },
    { id: "k", type: "skills", title: "Skills", visible: true, entries: Array.from({ length: 12 }, (_, i) => ({ id: `k${i}`, name: `Skill ${i}` })) },
    { id: "c", type: "certifications", title: "Certifications", visible: true, entries: Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, name: `Certification ${i}`, issuer: "Institute", date: "2021" })) },
  ],
  design: { templateId: "professional", pageSize: "letter" },
};

const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
async function open(viewport = { width: 1440, height: 900 }) {
  await page.setViewport(viewport);
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
  await page.evaluate((r) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [r] })); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: r.id, zoom: "fit" })); }, resume);
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await page.waitForSelector("h2 > button[aria-expanded]");
  await sleep(500);
}
const click = (name) => page.evaluate((n) => [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes(n)).click(), name);
const body = (name) => page.evaluate((n) => {
  const header = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes(n));
  const el = document.getElementById(header.getAttribute("aria-controls"));
  return { h: Math.round(el.getBoundingClientRect().height), full: el.firstElementChild.scrollHeight, inert: el.inert, visibility: getComputedStyle(el).visibility, expanded: header.getAttribute("aria-expanded") };
}, name);
const heights = async (name, times) => { const out = []; const t0 = Date.now(); for (const t of times) { await sleep(Math.max(0, t - (Date.now() - t0))); out.push((await body(name)).h); } return out; };

await open();
const duration = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accordion-duration").trim());
check("One variable sets the duration (700ms)", ["700ms", ".7s", "0.7s"].includes(duration), duration);

const closed = await body("Education");
check("A closed card has no height, is inert and hidden, aria-expanded false", closed.h === 0 && closed.inert && closed.visibility === "hidden" && closed.expanded === "false", JSON.stringify(closed));
await click("Education");
const growing = await heights("Education", [80, 250, D + 250]);
const opened = await body("Education");
check("Opening grows the card over the duration", growing[0] > 0 && growing[0] < growing[2] && growing[1] < growing[2] && opened.h === opened.full, `${growing.join(" → ")} (full ${opened.full})`);
check("An open card is visible, not inert, aria-expanded true", !opened.inert && opened.visibility === "visible" && opened.expanded === "true");
const turn = await page.evaluate(() => { const header = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes("Education")); const chevron = [...header.querySelectorAll("svg")].at(-1); const style = getComputedStyle(chevron); return { rotate: style.rotate, property: style.transitionProperty, duration: style.transitionDuration }; });
check("The chevron turns with the card, over the same duration", turn.rotate === "180deg" && turn.property.split(",")[0].trim() === "rotate" && parseFloat(turn.duration) === D / 1000, JSON.stringify(turn));

// Reversing mid-way turns around from the current height
await click("Education"); await sleep(D + 250);
await click("Projects"); await sleep(280);
await click("Projects");
const back = await heights("Projects", [30, 220, D + 300]);
const projectsFull = (await body("Projects")).full;
check("Reversing mid-open shrinks from the current height", back[0] > 0 && back[0] < projectsFull - 20 && back[1] < back[0] && back[2] === 0, `${back.join(" → ")} (full ${projectsFull})`);

// Rapid clicks never leave a card stuck half open
for (let i = 0; i < 7; i++) { await click("Skills"); await sleep(70); }
await sleep(D + 400);
const rapid = await body("Skills");
check("After rapid clicks the card ends fully open", rapid.expanded === "true" && rapid.h === rapid.full, JSON.stringify(rapid));

// Single open: both cards animate at once
await click("Education");
await sleep(120);
const during = [(await body("Skills")).h, (await body("Education")).h];
await sleep(D + 250);
check("Opening another card closes the first, both animating together", during[0] > 0 && during[1] > 0 && (await body("Skills")).h === 0, JSON.stringify(during));

// Closed content can't be reached; open content can be used straight away
const reached = await page.evaluate(() => {
  const header = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes("Skills"));
  const control = document.getElementById(header.getAttribute("aria-controls")).querySelector("input, button");
  control?.focus();
  return document.activeElement === control;
});
check("Controls in a closed card can't take focus", !reached);
await click("Profile");
await sleep(120);
const focused = await page.evaluate(() => { const field = document.querySelector("textarea"); field.focus(); return document.activeElement === field; });
await page.keyboard.type(" KEPTTEXT");
check("A field can be used while its card is still opening", focused);
await sleep(D + 150); await click("Profile"); await sleep(D + 250); await click("Profile"); await sleep(D + 250);
const kept = await page.evaluate(() => document.querySelector("textarea").value.includes("KEPTTEXT") && JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].sections[0].content.includes("KEPTTEXT"));
check("Typing survives closing and reopening, and is saved", kept);
await click("Profile"); await sleep(D + 250);

// The preview stays still while a card opens
const previewBox = () => page.evaluate(() => { const r = document.querySelector("[aria-label='Resume preview']").getBoundingClientRect(); return [r.top, r.left, r.width, r.height].map(Math.round).join(","); });
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await sleep(200);
const still = await previewBox();
await click("Certifications");
const moved = [];
for (let i = 0; i < 5; i++) { await sleep(100); moved.push(await previewBox()); }
check("The preview doesn't move or resize while a card opens", moved.every((box) => box === still), `${still} | ${moved.join(" | ")}`);
await click("Certifications"); await sleep(D + 250);

// Scrolling: none when the card is in view; with the card when it opens near the bottom
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await sleep(200);
await click("Profile"); await sleep(D + 250);
check("No scrolling when the opened card is already in view", (await page.evaluate(() => scrollY)) === 0);
await click("Profile"); await sleep(D + 250);
await page.evaluate(() => { const h = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes("Projects")); window.scrollTo({ top: h.getBoundingClientRect().top + scrollY - innerHeight + 90, behavior: "instant" }); });
await sleep(200);
const start = await page.evaluate(() => scrollY);
await click("Projects");
const ys = [];
for (let i = 0; i < 9; i++) { await sleep(100); ys.push(await page.evaluate(() => scrollY)); }
const jumps = ys.map((y, i) => y - (i ? ys[i - 1] : start));
const card = await page.evaluate(() => { const h = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes("Projects")); const r = h.closest("section").getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
check("A card opening near the bottom scrolls into view with the animation, not in one jump", ys.at(-1) > start && Math.max(...jumps) < (ys.at(-1) - start) * 0.8, `${start} → ${ys.join(", ")}`);
check("…and ends fully in view", card.bottom <= 900 + 1, JSON.stringify(card));

// Reduced motion: instant
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await click("Projects"); await sleep(60);
const instantClosed = (await body("Projects")).h;
await click("Education"); await sleep(60);
const instantOpen = await body("Education");
check("With reduced motion, cards open and close at once", instantClosed === 0 && instantOpen.h === instantOpen.full);
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

// Entries: staggered on first open only; a new entry slides in
await open();
await click("Experience"); await sleep(80);
const stagger = await page.evaluate(() => [...document.querySelector(".entry-list").children].slice(0, 7).map((li) => `${getComputedStyle(li).animationName}@${getComputedStyle(li).animationDelay}`));
check("On first open the first six entries fade in 60ms apart; the rest don't", stagger.slice(0, 6).every((s, i) => s.startsWith("entry-in@") && Math.abs(parseFloat(s.split("@")[1]) - i * 0.06) < 0.001) && stagger[6].startsWith("none"), stagger.join(" "));
await sleep(D + 250);
await click("Experience"); await sleep(D + 250); await click("Experience"); await sleep(80);
check("…and not when it opens again", (await page.evaluate(() => getComputedStyle(document.querySelector(".entry-list > li")).animationName)) === "none");
await sleep(D + 150);
await page.evaluate(() => document.querySelector("[aria-label='Add position']").click());
await sleep(40);
const entering = await page.evaluate(() => { const li = [...document.querySelector(".entry-list").children].at(-1); return `${getComputedStyle(li).animationName} ${getComputedStyle(li).animationDuration}`; });
check("Add entry slides the new entry in over 400ms", entering === "entry-in 0.4s", entering);
await sleep(600);
check("…and the slide-in is gone once it has played", (await page.evaluate(() => [...document.querySelector(".entry-list").children].at(-1).className.includes("entry-enter"))) === false);

// Layout at phone, tablet and desktop sizes, including short screens
for (const [width, height] of [[1920, 1080], [1024, 600], [768, 1024], [390, 844], [390, 600]]) {
  await open({ width, height });
  const before = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, page: document.documentElement.scrollHeight }));
  await click("Experience"); await sleep(D + 200);
  const expanded = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, small: [...document.querySelectorAll("h2 > button[aria-expanded], [aria-label^='Section options'], [aria-label^='Hide '], [aria-label^='Reorder ']")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 40 || r.height < 40); }).length }));
  await click("Experience"); await sleep(D + 200);
  await click("Certifications"); await sleep(D + 200);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })); await sleep(200);
  const reach = await page.evaluate(() => {
    const cardBox = [...document.querySelectorAll("h2 > button[aria-expanded]")].find((x) => x.textContent.includes("Certifications")).closest("section").getBoundingClientRect();
    const bar = document.querySelector("[aria-label='Editor view']");
    const covered = bar && getComputedStyle(bar).display !== "none" && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().top : innerHeight;
    return { bottom: Math.round(cardBox.bottom), visible: Math.round(covered) };
  });
  await click("Certifications"); await sleep(D + 250);
  const after = await page.evaluate(() => document.documentElement.scrollHeight);
  const label = `${width}x${height}`;
  check(`${label}: no sideways overflow with a card open`, before.overflow <= 0 && expanded.overflow <= 0, `${before.overflow}/${expanded.overflow}`);
  check(`${label}: card buttons stay at least 40px`, expanded.small === 0, String(expanded.small));
  check(`${label}: the last card is fully reachable with room below`, reach.bottom <= reach.visible - 8, JSON.stringify(reach));
  check(`${label}: no blank space left after collapsing`, Math.abs(after - before.page) <= 2, `${before.page} → ${after}`);
}

check("No page errors", errors.length === 0, errors.join(" | "));
await browser.close();

// Public pages: controls read as interactive and their states are distinct. The current page
// in the header differs from a hovered link, FAQ questions and inline links respond to hover,
// buttons show a pointer (disabled ones don't), shared buttons show a press on touch, and
// keyboard focus in the horizontal scrollers lands on an item that is in view, ring and all, and the
// primary button and template cards lift, shadow and change colour on hover (the card overlay fades).
// Chrome runs with a mouse-like pointer, since headless Chrome otherwise reports no hover.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Public pages: hover, current, pressed and focus states");
const browser = await launch(["--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"]);
const errors = [];
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 900 });

const look = (el) => { const s = getComputedStyle(el); return [s.color, s.backgroundColor, s.borderTopColor, s.textDecorationLine, s.textDecorationColor, s.opacity].join("|"); };
const hoverChanges = async (selector) => {
  await page.mouse.move(1, 1);
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await sleep(250);
  const before = await page.$eval(selector, look);
  await page.hover(selector);
  await sleep(250);
  const after = await page.$eval(selector, look);
  await page.mouse.move(1, 1);
  return before !== after;
};

// ---- Header: current page vs hover
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
const nav = await page.evaluate((lookSource) => {
  const fn = new Function(`return ${lookSource}`)();
  const current = document.querySelector("nav[aria-label=Main] a[aria-current=page]");
  const other = [...document.querySelectorAll("nav[aria-label=Main] a")].find((a) => !a.hasAttribute("aria-current"));
  return { current: current && fn(current), other: other && fn(other), currentLabel: current?.textContent };
}, look.toString());
check("Header marks the current page", nav.currentLabel === "Templates", nav.currentLabel);
await page.hover("nav[aria-label=Main] a:not([aria-current])");
await sleep(250);
const hovered = await page.$eval("nav[aria-label=Main] a:not([aria-current])", look);
check("The current page looks different from a hovered link", nav.current !== hovered && nav.current !== nav.other, `${nav.current} / hover ${hovered}`);
await page.mouse.move(1, 1);

// ---- Pointer on buttons, not on disabled ones
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const cursors = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0 && !b.closest("[aria-hidden=true]"));
  return {
    enabled: buttons.filter((b) => !b.disabled).map((b) => getComputedStyle(b).cursor),
    disabled: buttons.filter((b) => b.disabled).map((b) => getComputedStyle(b).cursor),
  };
});
check("Buttons show a pointer", cursors.enabled.length > 5 && cursors.enabled.every((c) => c === "pointer"), [...new Set(cursors.enabled)].join(","));
check("Disabled buttons don't", cursors.disabled.every((c) => c !== "pointer"), [...new Set(cursors.disabled)].join(",") || "none disabled");

// ---- FAQ questions respond to hover
const faq = "section[aria-labelledby=faq-heading] h3 button[aria-expanded=false]";
check("FAQ questions change on hover", await hoverChanges(faq));

// ---- Shared buttons show a press on touch (active), the same look as hover
const pressed = await page.evaluate(() => {
  const button = [...document.querySelectorAll("a, button")].find((b) => /\bbg-ink\b/.test(b.className) && /active:bg-ink-soft/.test(b.className));
  return !!button;
});
check("Primary buttons have a pressed state for touch screens", pressed);

// ---- Inline links in running text
await page.goto(`${BASE}/contact`, { waitUntil: "networkidle0" });
check("Inline text links change on hover", await hoverChanges("main p a[href='/privacy']"));

// ---- Keyboard focus in horizontal scrollers lands in view
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const cardFocus = await page.evaluate(async () => {
  const track = document.querySelector("ul[aria-label='Template previews']");
  const link = [...track.querySelectorAll("li:not([hidden]) a")][3];
  link.focus({ focusVisible: true });
  await new Promise((r) => setTimeout(r, 400));
  const r = link.getBoundingClientRect();
  const t = track.getBoundingClientRect();
  const reach = parseFloat(getComputedStyle(link).outlineWidth) + parseFloat(getComputedStyle(link).outlineOffset);
  return { inside: r.left - reach >= t.left - 0.5 && r.right + reach <= t.right + 0.5 && r.top - reach >= t.top - 0.5 && r.bottom + reach <= t.bottom + 0.5, ring: getComputedStyle(link).outlineStyle };
});
check("A focused carousel card scrolls into view with its whole focus ring", cardFocus.inside && cardFocus.ring !== "none", JSON.stringify(cardFocus));
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
const chipFocus = await page.evaluate(async () => {
  const bar = document.querySelector("nav[aria-label='Template categories'] ul");
  const chip = [...bar.querySelectorAll("a")].at(-2);
  chip.focus({ focusVisible: true });
  await new Promise((r) => setTimeout(r, 400));
  const r = chip.getBoundingClientRect();
  const b = bar.getBoundingClientRect();
  const reach = parseFloat(getComputedStyle(chip).outlineWidth) + parseFloat(getComputedStyle(chip).outlineOffset);
  return { inside: r.left - reach >= b.left - 0.5 && r.right + reach <= b.right + 0.5, ring: getComputedStyle(chip).outlineStyle };
});
check("A focused category chip scrolls into view with its whole focus ring", chipFocus.inside && chipFocus.ring !== "none", JSON.stringify(chipFocus));

// ---- Hover motion: computed styles before and after hovering
const motion = (el) => { const s = getComputedStyle(el); return { transform: s.transform, translate: s.translate, shadow: s.boxShadow, bg: s.backgroundColor, opacity: s.opacity }; };
const hoverStyles = async (hoverSelector, readSelector = hoverSelector) => {
  await page.mouse.move(1, 1);
  await page.$eval(hoverSelector, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await sleep(400);
  const before = await page.$eval(readSelector, motion);
  await page.hover(hoverSelector);
  await sleep(400);
  const after = await page.$eval(readSelector, motion);
  await page.mouse.move(1, 1);
  return { before, after };
};
const lifted = (s) => s.transform !== "none" || (s.translate !== "none" && s.translate !== "0px");

await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const primary = await hoverStyles("main a.site-button--primary[href='/editor']");
check("Primary button lifts on hover", primary.before.transform === "none" && primary.after.transform.includes("-1)"), `${primary.before.transform} -> ${primary.after.transform}`);
check("Primary button gains a shadow on hover", primary.before.shadow !== primary.after.shadow && primary.after.shadow !== "none", primary.after.shadow);
check("Primary button changes colour on hover", primary.before.bg !== primary.after.bg, `${primary.before.bg} -> ${primary.after.bg}`);

const homeCard = "ul[aria-label='Template previews'] li:not([hidden]) a";
const home = await hoverStyles(homeCard, `${homeCard} > span > span`);
check("Home template card lifts with a deeper shadow on hover", !lifted(home.before) && lifted(home.after) && home.before.shadow !== home.after.shadow, `${home.before.translate} -> ${home.after.translate}`);

await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
const galleryCard = await hoverStyles("main article.group", "main article.group > div");
check("Gallery template card lifts with a deeper shadow on hover", !lifted(galleryCard.before) && lifted(galleryCard.after) && galleryCard.before.shadow !== galleryCard.after.shadow, `${galleryCard.before.translate} -> ${galleryCard.after.translate}`);
// The overlay fades rather than snapping: it has a real duration, and part-way through it is half visible.
await page.mouse.move(1, 1);
await sleep(400);
const overlay = "main article.group > div > div.pointer-events-none";
const fade = await page.$eval(overlay, (el) => getComputedStyle(el).transitionDuration);
await page.hover("main article.group");
const midway = await page.$eval(overlay, async (el) => { await new Promise((r) => setTimeout(r, 60)); return parseFloat(getComputedStyle(el).opacity); });
await sleep(400);
const settled = await page.$eval(overlay, (el) => parseFloat(getComputedStyle(el).opacity));
check("Template card overlay fades in smoothly", parseFloat(fade) >= 0.15 && midway > 0 && midway < 1 && settled === 1, `duration ${fade}, at 60ms ${midway}, settled ${settled}`);
// The overlay's Preview and Use Template buttons respond to hover themselves.
for (const label of ["Preview", "Use Template"]) {
  await page.hover("main article.group");
  await sleep(300);
  const button = await page.evaluateHandle((l) => [...document.querySelectorAll("main article.group div.pointer-events-auto > *")].find((e) => e.textContent.trim() === l), label);
  const before = await button.evaluate(motion);
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(400);
  const after = await button.evaluate(motion);
  check(`Overlay "${label}" button tints and lifts on hover`, before.bg !== after.bg && lifted(after), `${before.bg} -> ${after.bg}, ${after.translate}`);
}
// A real mouse click on Use Template (not the card's preview button under it) opens the editor.
await page.mouse.down();
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.mouse.up()]);
check("Clicking the overlay's Use Template opens the editor with that template", page.url().includes("/editor?template="), page.url());
await page.mouse.move(1, 1);

check("No page errors", errors.length === 0, errors.join(" | "));
await browser.close();

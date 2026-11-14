// Public pages: hovering a nav link, a primary button or a template card visibly changes it
// (background, color, transform, translate or shadow) and shows the pointer; the current nav link keeps
// its stronger pill; the buttons' lift and arrow slide go away with reduced motion while the
// color change stays. Chrome runs with a mouse-like pointer, since headless Chrome otherwise
// reports no hover and Tailwind only applies hover styles under (hover: hover).
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Public pages: hover feedback on nav, buttons and template cards");
const browser = await launch(["--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4"]);
const errors = [];
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
await page.setViewport({ width: 1440, height: 900 });

/** Look of an element and its descendants (cards change inside, not on the link itself). */
const look = (el) =>
  [el, ...el.querySelectorAll("*")].slice(0, 30).map((n) => {
    const s = getComputedStyle(n);
    return [s.color, s.backgroundColor, s.borderTopColor, s.boxShadow, s.transform, s.translate, s.opacity].join("|");
  }).join(";");

/** Hovers the nth match and reports whether its look changed, plus its cursor and own transform. */
const hover = async (selector, index = 0) => {
  await page.mouse.move(1, 1);
  await page.evaluate((sel, i) => document.querySelectorAll(sel)[i].scrollIntoView({ block: "center", behavior: "instant" }), selector, index);
  await sleep(300);
  const handle = (await page.$$(selector))[index];
  const before = await handle.evaluate(look);
  await handle.hover();
  await sleep(350);
  const after = await handle.evaluate(look);
  const own = await handle.evaluate((el) => {
    const s = getComputedStyle(el);
    const arrow = el.querySelector("svg:last-child");
    return { cursor: s.cursor, transform: s.transform, background: s.backgroundColor, arrow: arrow ? getComputedStyle(arrow).transform : null };
  });
  await page.mouse.move(1, 1);
  await sleep(300);
  return { changed: before !== after, ...own };
};

await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
check("Chrome reports a hover-capable pointer for this run", await page.evaluate(() => matchMedia("(hover: hover)").matches));

// ---- Nav links
const navLinks = await page.$$eval("nav[aria-label=Main] a", (links) => links.map((a) => ({ label: a.textContent, current: a.hasAttribute("aria-current") })));
const currentBg = await page.$eval("nav[aria-label=Main] a[aria-current=page]", (a) => getComputedStyle(a).backgroundColor);
for (const [index, link] of navLinks.entries()) {
  const result = await hover("nav[aria-label=Main] a", index);
  if (link.current) {
    check(`Current nav link "${link.label}" keeps its pill on hover`, result.background === currentBg && result.cursor === "pointer", result.background);
  } else {
    check(`Nav link "${link.label}" changes on hover and shows the pointer`, result.changed && result.cursor === "pointer" && result.background !== currentBg, `${result.background}, ${result.cursor}`);
  }
}

// ---- Primary buttons: lift, and the arrow slides
const buttons = [
  ["Create Resume", "header a[href='/editor']"],
  ["Start your resume", "section[aria-labelledby=hero-heading] a[href='/editor']"],
  ["Final call to action", "section[aria-labelledby=cta-heading] a[href='/editor']"],
];
for (const [name, selector] of buttons) {
  const result = await hover(selector);
  check(`${name} lifts on hover and shows the pointer`, result.changed && result.transform !== "none" && result.cursor === "pointer", `${result.transform}, ${result.cursor}`);
  if (result.arrow !== null) check(`${name}: the arrow slides on hover`, result.arrow !== "none", result.arrow);
}

// ---- Template cards: home carousel and the gallery
const homeCard = await hover("ul[aria-label='Template previews'] li:not([hidden]) a");
check("Home template card changes on hover and shows the pointer", homeCard.changed && homeCard.cursor === "pointer", homeCard.cursor);
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
const galleryCard = await hover("main article");
const galleryCursor = await page.$eval("main article .card-open", (el) => getComputedStyle(el).cursor);
check("Gallery template card changes on hover and shows the pointer", galleryCard.changed && galleryCursor === "pointer", galleryCursor);

// ---- Reduced motion: color still changes, nothing moves
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const calm = await hover("section[aria-labelledby=hero-heading] a[href='/editor']");
check("Reduced motion: Start your resume still changes color but doesn't lift", calm.changed && calm.transform === "none" && calm.arrow === "none", `${calm.transform}, arrow ${calm.arrow}`);
const cardSelector = "ul[aria-label='Template previews'] li:not([hidden]) a";
await page.$eval(cardSelector, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
await sleep(300);
const transforms = (el) => [el, ...el.querySelectorAll("*")].map((n) => `${getComputedStyle(n).transform} ${getComputedStyle(n).translate}`).join(";");
const still = await page.$eval(cardSelector, transforms);
await page.hover(cardSelector);
await sleep(350);
check("Reduced motion: a hovered template card doesn't move", (await page.$eval(cardSelector, transforms)) === still);
await page.mouse.move(1, 1);
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

check("No page errors", errors.length === 0, errors.join(" | "));
await browser.close();

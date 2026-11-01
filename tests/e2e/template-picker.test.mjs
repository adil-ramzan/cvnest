// The template list on computers and the native select on touch screens.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Template picker: mouse, keyboard, preview and phone");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const trigger = "button[aria-haspopup=listbox]";
const list = "[role=listbox]";
const name = () => page.$eval(trigger, (el) => el.textContent);
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].design.templateId);
const active = () => page.evaluate(() => document.getElementById(document.querySelector("[role=listbox]").getAttribute("aria-activedescendant")).textContent);
const focused = () => page.evaluate(() => document.activeElement.getAttribute("aria-haspopup"));

await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector(trigger);
await sleep(600);

// Mouse
await page.click(trigger);
await sleep(100);
check("Opens a list of all 120 templates", (await page.$$eval("[role=option]", (els) => els.length)) === 120);
check("Groups them into 10 categories", (await page.$$eval("[role=listbox] [role=group]", (els) => els.length)) === 10);
check("Shows the current template as selected", (await page.$$eval("[role=option][aria-selected=true]", (els) => els.map((el) => el.textContent))).length === 1);
const panel = await page.$eval(list, (el) => { const box = el.getBoundingClientRect(); return { right: box.right, bottom: box.bottom, top: document.elementFromPoint(box.x + 40, box.y + 40)?.closest("[role=listbox]") !== null }; });
check("Panel sits on top and inside the window", panel.right <= 1440 && panel.bottom <= 900 && panel.top, JSON.stringify(panel));
await page.click("[role=option]:nth-of-type(3)");
await sleep(700);
const first = await name();
check("Clicking an option closes the list", (await page.$(list)) === null);
check("Focus returns to the button", (await focused()) === "listbox");
check("The choice is saved", (await saved()) === (await page.$eval("select", (el) => el.value)));
await page.click(trigger);
await sleep(100);
await page.mouse.click(1000, 600);
await sleep(100);
check("Clicking elsewhere closes it without changing anything", (await page.$(list)) === null && (await name()) === first);

// Keyboard
const before = await page.$eval(".resume-page", (el) => el.innerHTML);
await page.focus(trigger);
await page.keyboard.press("ArrowDown");
await sleep(100);
check("Arrow key opens the list", (await page.$(list)) !== null);
check("Starts on the selected template", (await active()).includes(first));
await page.keyboard.press("Escape");
await sleep(100);
check("Escape closes and keeps the choice", (await page.$(list)) === null && (await name()) === first && (await focused()) === "listbox");
await page.keyboard.press("Enter");
await sleep(100);
await page.keyboard.press("End");
const last = await active();
await page.keyboard.press("Home");
check("Home and End move through the list", last !== (await active()));
await page.keyboard.type("kin");
check("Typing jumps to a name", (await active()).startsWith("Kinetic"), await active());
await page.keyboard.press("Enter");
await sleep(700);
check("Enter chooses it", (await name()) === "Kinetic" && (await saved()) === "kinetic");
check("The preview updates", (await page.$eval(".resume-page", (el) => el.innerHTML)) !== before);
await page.focus(trigger);
await page.keyboard.press("Enter");
await sleep(100);
await page.keyboard.press("Tab");
await sleep(100);
check("Tab closes the list", (await page.$(list)) === null);
await page.close();

// Phone
const phone = await browser.newPage();
await phone.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await phone.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await phone.waitForSelector("select");
await sleep(500);
await phone.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Preview").click());
await sleep(300);
const look = await phone.evaluate(() => ({
  select: document.querySelector("select").offsetParent !== null,
  button: document.querySelector("button[aria-haspopup=listbox]").offsetParent !== null,
  height: document.querySelector("select").getBoundingClientRect().height,
  wide: document.documentElement.scrollWidth - innerWidth,
}));
check("Phones get the native picker", look.select && !look.button, JSON.stringify(look));
check("It is a 40px target and fits the page", look.height >= 40 && look.wide <= 0, JSON.stringify(look));

check("No page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

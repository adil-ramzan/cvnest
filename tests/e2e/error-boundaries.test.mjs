// Forces real rendering errors and checks the recovery screens. Saved resumes must be untouched.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Error boundaries: editor and public pages");
const browser = await launch();

// ---- Editor: make date formatting throw, then open the Overview tab (which formats dates).
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
  await sleep(800);
  await page.evaluate(() => {
    const label = [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === "Full name");
    const input = document.getElementById(label.htmlFor);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "Boundary Tester");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await sleep(900);
  const before = await page.evaluate(() => localStorage.getItem("folio.resumes.v2"));

  page.on("pageerror", () => {});
  await page.evaluate(() => {
    Intl.DateTimeFormat = function () {
      throw new Error("Simulated rendering failure");
    };
    [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Overview").click();
  });
  await sleep(800);
  const screen = await page.evaluate(() => document.querySelector("[role=alert]")?.textContent ?? "");
  check("Editor crash shows the editor error screen", screen.includes("The editor ran into a problem"));
  check("Error screen reassures that resumes are saved", screen.includes("nothing has been deleted"));
  const actions = await page.$$eval("[role=alert] button, [role=alert] a", (els) => els.map((e) => e.textContent.trim()));
  check("Recovery actions offered", ["Try again", "Reload editor", "Home"].every((a) => actions.includes(a)), actions.join(", "));
  const after = await page.evaluate(() => localStorage.getItem("folio.resumes.v2"));
  check("Saved resumes unchanged by the crash", after === before && after.includes("Boundary Tester"));

  await page.evaluate(() => [...document.querySelectorAll("[role=alert] button")].find((b) => b.textContent.includes("Reload editor")).click());
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  await sleep(800);
  const restored = await page.evaluate(() => {
    const label = [...document.querySelectorAll("label")].find((l) => l.textContent.trim() === "Full name");
    return label && document.getElementById(label.htmlFor).value;
  });
  check("Reload editor recovers with the saved resume", restored === "Boundary Tester", String(restored));
  await page.close();
}

// ---- Public page: break the gallery's filter code before it runs.
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("pageerror", () => {});
  await page.evaluateOnNewDocument(() => {
    window.IntersectionObserver = class {
      constructor() {
        throw new Error("Simulated page failure");
      }
    };
  });
  await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
  await sleep(600);
  const text = await page.evaluate(() => document.querySelector("[role=alert]")?.textContent ?? "");
  check("Public page crash shows the site error screen", text.includes("This page didn't load") || text.includes("This page didn’t load"), text.slice(0, 80));
  check("Site header and footer stay available", !!(await page.$("header nav")) && !!(await page.$("footer")));
  const actions = await page.$$eval("[role=alert] button, [role=alert] a", (els) => els.map((e) => e.textContent.trim()));
  check("Try again and Back to Home offered", actions.includes("Try again") && actions.includes("Back to Home"), actions.join(", "));
  await page.close();
}

await browser.close();

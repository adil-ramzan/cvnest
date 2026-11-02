// Color, font and text size controls: live preview, saving, and the printed PDF.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Customization: live preview, saving and PDF");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.evaluateOnNewDocument(() => {
  window.print = () => {
    window.__printed = (window.__printed || 0) + 1;
  };
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

const preview = "[aria-label='Resume preview'] .resume-paper";
const design = () => page.evaluate(() => JSON.parse(localStorage.getItem("folio.resumes.v2")).resumes[0].design);
const clickTab = (name) => page.evaluate((n) => [...document.querySelectorAll("[role=tab]")].find((t) => t.textContent === n).click(), name);
const clickPressable = async (group, name) => {
  await page.evaluate((g, n) => {
    const scope = document.querySelector(`[aria-labelledby=${g}]`);
    [...scope.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent) === n).click();
  }, group, name);
  await sleep(150);
};
const pressed = (group) => page.$$eval(`[aria-labelledby=${group}] button[aria-pressed=true]`, (els) => els.map((b) => b.getAttribute("aria-label") ?? b.textContent));
const style = (selector, prop) => page.evaluate((s, p, root) => getComputedStyle(document.querySelector(`${root} ${s}`))[p], selector, prop, preview);
const setCustomColor = async (value) => {
  await page.$eval("input[type=color]", (input, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await sleep(150);
};
const selectTemplate = async (slug) => {
  await page.$eval(`input[name=template][value=${slug}]`, (input) => input.click());
  await sleep(200);
};
const clickChip = async (name) => {
  await page.evaluate((n) => [...document.querySelectorAll("[aria-label='Template category'] button")].find((b) => b.textContent === n).click(), name);
  await sleep(300);
};
const saved = async () => {
  await sleep(900);
  return design();
};

await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await sleep(800);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Load sample data").click());
await sleep(400);
await clickTab("Customize");
await sleep(400);

// Defaults
check("New resumes start on the template's own style", (await pressed("style-color"))[0] === "Template" && (await pressed("style-font"))[0] === "Template" && (await pressed("style-size"))[0] === "Medium");
check("Has 9 preset colors and a custom picker", (await page.$$eval("[aria-labelledby=style-color] button[aria-label]", (els) => els.length)) === 9 && !!(await page.$("[aria-labelledby=style-color] input[type=color]")));
check("Has 6 fonts", (await page.$$eval("[aria-labelledby=style-font] button", (els) => els.length)) === 7);
const untouched = await saved();
check("Nothing is saved until a choice is made", !("accentColor" in untouched) && !("fontFamily" in untouched) && !("fontScale" in untouched));
const baseSize = parseFloat(await style("h2", "fontSize"));

// Live preview on hand-written and design templates
await clickPressable("style-color", "Burgundy");
await clickChip("All");
for (const slug of ["professional", "modern", "minimal", "atlas", "tessera", "fathom", "monolith", "prism"]) {
  await selectTemplate(slug);
  const colors = await page.evaluate((root) => [...document.querySelectorAll(`${root} *`)].flatMap((el) => { const s = getComputedStyle(el); return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor]; }), preview);
  check(`Color reaches ${slug}`, colors.includes("rgb(136, 19, 55)"));
}
await selectTemplate("professional");
check("Color is saved on the resume", (await saved()).accentColor === "#881337");

await clickPressable("style-font", "Lora");
const fonts = await page.evaluate((root) => [...new Set([...document.querySelectorAll(`${root} h2, ${root} h3, ${root} p, ${root} li`)].map((el) => getComputedStyle(el).fontFamily))], preview);
check("One font across the resume", fonts.length === 1 && /lora/i.test(fonts[0]), fonts.join(" | ").slice(0, 120));

await clickPressable("style-size", "Large");
check("Large scales the text live", Math.abs(parseFloat(await style("h2", "fontSize")) / baseSize - 1.1) < 0.01);
await clickPressable("style-size", "Increase text size");
check("Fine control steps by 5%", (await page.$eval("[aria-labelledby=style-size] output", (el) => el.textContent)) === "115%");
check("A fine size clears the presets", (await pressed("style-size")).length === 0);
for (let i = 0; i < 5; i++) await page.$eval("[aria-label='Increase text size']", (b) => b.click());
await sleep(200);
check("Stops at the largest size", (await page.$eval("[aria-label='Increase text size']", (b) => b.disabled)) && (await saved()).fontScale === 1.2);
await clickPressable("style-size", "Large");

await setCustomColor("#ffee00");
check("A custom color saves", (await saved()).accentColor === "#ffee00");
const light = await style("h2", "borderBottomColor");
check("A very light color is darkened for the page", light !== "rgb(255, 238, 0)", light);
await setCustomColor("#0a7f5a");

// Saved with the resume
const before = await saved();
await page.reload({ waitUntil: "networkidle0" });
await sleep(800);
await clickTab("Customize");
await sleep(300);
const after = await design();
check("Settings survive a reload", after.accentColor === "#0a7f5a" && after.fontFamily === "lora" && after.fontScale === 1.1 && JSON.stringify(after) === JSON.stringify(before), JSON.stringify(after));
check("Controls show the saved settings", (await pressed("style-font"))[0] === "Lora" && (await pressed("style-size"))[0] === "Large" && (await page.$eval("input[type=color]", (el) => el.value)) === "#0a7f5a");
check("Preview shows the saved settings", (await style("h2", "borderBottomColor")) === "rgb(10, 127, 90)");
await page.screenshot({ path: path.join(OUT, "customize-editor.png") });

// PDF, through the real export path
await clickTab("Content");
await sleep(300);
await page.evaluate(async () => {
  [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click();
  await new Promise((resolve) => setTimeout(resolve, 60));
  [...document.querySelectorAll("dialog[open] button")].find((b) => b.textContent === "Download anyway")?.click();
});
await page.waitForFunction(() => (window.__printed || 0) > 0);
const printed = await page.evaluate(() => {
  const root = document.querySelector(".print-root");
  const h2 = root.querySelector("h2");
  return { color: getComputedStyle(h2).borderBottomColor, font: getComputedStyle(h2).fontFamily, scale: getComputedStyle(root.querySelector(".resume-paper")).getPropertyValue("--resume-font-scale") };
});
check("Print copy keeps color, font and size", printed.color === "rgb(10, 127, 90)" && /lora/i.test(printed.font) && printed.scale.trim() === "1.1", JSON.stringify(printed));
if (spawnSync("pdffonts", ["-v"]).error) {
  console.log("SKIP  poppler-utils not installed");
} else {
  const file = path.join(OUT, "customize.pdf");
  await page.pdf({ path: file, preferCSSPageSize: true });
  check("PDF embeds the chosen font only", spawnSync("pdffonts", [file]).stdout.toString().split("\n").slice(2).filter(Boolean).every((line) => /Lora/.test(line)));
  spawnSync("pdftoppm", ["-r", "60", "-singlefile", file, path.join(OUT, "customize-pdf")]);
  const ppm = fs.readFileSync(path.join(OUT, "customize-pdf.ppm"));
  let matches = 0;
  for (let i = ppm.length - 3; i > 20; i -= 3) if (Math.abs(ppm[i] - 10) < 12 && Math.abs(ppm[i + 1] - 127) < 12 && Math.abs(ppm[i + 2] - 90) < 12) matches++;
  check("PDF prints the chosen color", matches > 20, `${matches} pixels`);
}
await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
await page.waitForFunction(() => !document.querySelector(".print-root"));

// Reset
await clickTab("Customize");
await sleep(300);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "Reset to template style").click());
const reset = await saved();
check("Reset returns to the template's style", !("accentColor" in reset) && !("fontFamily" in reset) && !("fontScale" in reset) && (await style("h2", "borderBottomColor")) === "rgb(31, 42, 68)");
check("No page errors", errors.length === 0, errors.join(" | ").slice(0, 200));
await browser.close();

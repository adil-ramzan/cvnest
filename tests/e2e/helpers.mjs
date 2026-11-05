// Shared setup for the browser suites. Run them through `npm run test:e2e`,
// which starts the production server and sets BASE_URL.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = path.dirname(fileURLToPath(import.meta.url));

export const BASE = process.env.BASE_URL ?? "http://localhost:3100";
export const FIXTURES = path.join(here, "fixtures");
/** Screenshots and PDFs from the last run (git-ignored). */
export const OUT = process.env.E2E_OUTPUT ?? path.join(here, "..", "..", ".e2e-output");
fs.mkdirSync(OUT, { recursive: true });

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls `condition` (an async function run in Node) until it returns true or `timeout` ms pass.
 * Resolves to the last result, so the caller still asserts on it: a condition that never
 * holds fails the check as before, it just no longer depends on a guessed delay.
 * Only for waiting on something that should happen; to show something does NOT happen, keep a fixed wait.
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const deadline = Date.now() + timeout;
  for (;;) {
    let result = false;
    try {
      result = await condition();
    } catch {
      result = false;
    }
    if (result || Date.now() >= deadline) return Boolean(result);
    await sleep(interval);
  }
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

export function chromePath() {
  const found = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.");
  return found;
}

export async function launch(extraArgs = []) {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", ...extraArgs],
    protocolTimeout: 300_000,
  });
  // The unsaved changes guard asks before unloading; automated runs always continue.
  browser.on("targetcreated", async (target) => {
    (await target.page())?.on("dialog", (dialog) => dialog.accept());
  });
  return browser;
}

/** Collects PASS/FAIL lines, prints them at exit and fails the process if any check failed. */
export function createChecks(suite) {
  const results = [];
  let failed = 0;
  process.on("exit", () => {
    console.log(`\n${suite}\n${results.join("\n")}`);
    if (failed) process.exitCode = 1;
  });
  return function check(name, ok, extra = "") {
    if (!ok) failed++;
    results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
  };
}

/** Requests the app is expected to make that aren't failures (no favicon exists yet). */
export const isKnownMissingAsset = (url) => url.endsWith("/favicon.ico");

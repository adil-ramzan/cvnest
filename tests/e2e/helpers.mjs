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

export function launch(extraArgs = []) {
  return puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ["--no-sandbox", ...extraArgs],
    protocolTimeout: 300_000,
  });
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

// The same small-screen checks in real Firefox. Skips itself without geckodriver.
import { spawn, spawnSync } from "node:child_process";
import { BASE, createChecks, sleep } from "./helpers.mjs";
import { longResume } from "./long-resume.mjs";

if (spawnSync("firefox", ["--version"]).error || spawnSync("geckodriver", ["--version"]).error) {
  console.log("\nZoom in Firefox\nSKIP  needs firefox and geckodriver");
  process.exit(0);
}
const check = createChecks("Zoom and short screens in Firefox");
const port = 4950 + Math.floor(Math.random() * 40);
const driver = spawn("geckodriver", ["--port", String(port)], { stdio: "ignore" });
process.on("exit", () => driver.kill());
await sleep(2000);
const G = `http://127.0.0.1:${port}`;
const wd = async (method, url, body) => {
  const { value } = await (await fetch(G + url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })).json();
  if (value?.error) throw new Error(`${value.error}: ${value.message}`);
  return value;
};
const { sessionId } = await wd("POST", "/session", { capabilities: { alwaysMatch: { "moz:firefoxOptions": { args: ["-headless"] } } } });
const s = `/session/${sessionId}`;
const exec = (script, args = []) => wd("POST", `${s}/execute/sync`, { script, args });
await wd("POST", `${s}/url`, { url: `${BASE}/about` });
await exec('localStorage.clear(); localStorage.setItem("folio.resumes.v2", arguments[0]); localStorage.setItem("folio.editor-settings", arguments[1]);', [JSON.stringify({ schemaVersion: 2, resumes: [longResume("")] }), JSON.stringify({ activeResumeId: "long", zoom: "fit" })]);
for (const [label, width, height] of [["1440x900", 1440, 900], ["720x450", 720, 450], ["667 tall", 1180, 667]]) {
  await wd("POST", `${s}/window/rect`, { width, height });
  await wd("POST", `${s}/url`, { url: `${BASE}/editor` });
  await sleep(1500);
  const view = await exec('const h = document.querySelector("header"); return { w: innerWidth, h: innerHeight, over: document.documentElement.scrollWidth - innerWidth, sticky: getComputedStyle(h).position, doc: document.documentElement.scrollHeight };');
  console.log(`  ${label}: inner ${view.w}x${view.h}, header ${view.sticky}`);
  check(`${label}: no sideways scroll`, view.over <= 0, String(view.over));
  check(`${label}: page scrolls`, view.doc > view.h);
  check(`${label}: sticky only with enough height`, view.h >= 600 ? view.sticky === "sticky" : view.sticky !== "sticky", `${view.h}px ${view.sticky}`);
}
await wd("DELETE", s);
driver.kill();

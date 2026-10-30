// Starts the production build on a free port and runs each browser suite.
// Usage: npm run build && npm run test:e2e [-- suite-name ...]
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const suites = fs.readdirSync(here).filter((f) => f.endsWith(".test.mjs")).sort();
const only = process.argv.slice(2);
const selected = only.length ? suites.filter((s) => only.some((o) => s.includes(o))) : suites;

if (!fs.existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.error("No production build found. Run `npm run build` first.");
  process.exit(1);
}

const port = await new Promise((resolve) => {
  const server = net.createServer().listen(0, () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
const baseUrl = `http://localhost:${port}`;
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { cwd: root, stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);

for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(baseUrl)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

const failures = [];
for (const suite of selected) {
  const started = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, suite)], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, BASE_URL: baseUrl },
    });
    child.on("exit", resolve);
  });
  console.log(`${code === 0 ? "✓" : "✗"} ${suite} (${Math.round((Date.now() - started) / 1000)}s)`);
  if (code !== 0) failures.push(suite);
}

stop();
console.log(failures.length ? `\nFailed: ${failures.join(", ")}` : `\nAll ${selected.length} browser suites passed.`);
process.exit(failures.length ? 1 : 0);

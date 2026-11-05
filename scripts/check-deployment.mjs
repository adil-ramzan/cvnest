#!/usr/bin/env node
// Read-only checks of a deployed CVNest Worker, run after a deploy (or at any time).
// It only sends GET requests. It never deploys, needs no credentials and changes nothing.
//
// Usage:
//   node scripts/check-deployment.mjs <deployed-url> [--canonical <expected-site-url>] [--indexable]
//
//   <deployed-url>   The address to check, e.g. https://cvnest.emadilramzan.workers.dev
//   --canonical      The NEXT_PUBLIC_SITE_URL the build should carry. Defaults to <deployed-url>,
//                    so a build made for a different address is reported.
//   --indexable      Expect a build made with NEXT_PUBLIC_INDEXABLE=true. By default every
//                    page must say noindex, as both environments do until launch.
//
// Exits 1 if any check fails. Keep the expected headers in step with next.config.ts.

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const target = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--canonical");
if (!target) {
  console.error("Usage: node scripts/check-deployment.mjs <deployed-url> [--canonical <expected-site-url>] [--indexable]");
  process.exit(2);
}
const base = new URL(target).origin;
const canonical = new URL(option("--canonical") ?? base).origin;
const indexable = flag("--indexable");

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'none'",
  "frame-ancestors 'none'",
];
const EXACT_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  ...(base.startsWith("https://") ? { "strict-transport-security": "max-age=31536000" } : {}),
};
const PAGES = ["/", "/templates", "/editor", "/about", "/free", "/privacy", "/terms", "/contact", "/sign-in"];

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

async function get(pathname) {
  const response = await fetch(new URL(pathname, base), { redirect: "manual", headers: { "user-agent": "cvnest-deployment-check" } });
  return { response, body: await response.text() };
}

function checkHeaders(label, headers) {
  const csp = (headers.get("content-security-policy") ?? "").split(";").map((d) => d.trim()).filter(Boolean);
  const missing = CSP_DIRECTIVES.filter((d) => !csp.includes(d));
  check(`${label}: Content-Security-Policy has every directive`, missing.length === 0, missing.length ? `missing: ${missing.join(" | ")}` : "");
  for (const [name, value] of Object.entries(EXACT_HEADERS)) {
    const actual = headers.get(name);
    check(`${label}: ${name}`, actual === value, actual === value ? "" : `got ${JSON.stringify(actual)}`);
  }
  check(`${label}: no X-Powered-By`, !headers.has("x-powered-by"), headers.get("x-powered-by") ?? "");
  const robots = headers.get("x-robots-tag");
  check(`${label}: X-Robots-Tag ${indexable ? "absent" : "noindex, nofollow"}`, indexable ? robots === null : robots === "noindex, nofollow", `got ${JSON.stringify(robots)}`);
}

try {
  for (const pathname of PAGES) {
    const { response, body } = await get(pathname);
    check(`${pathname}: HTTP 200`, response.status === 200, `got ${response.status}`);
    if (response.status !== 200) continue;
    if (pathname === "/") checkHeaders("/", response.headers);
    else if (pathname === "/editor") checkHeaders("/editor", response.headers);
    const robotsMeta = body.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null;
    check(`${pathname}: robots meta ${indexable ? "allows indexing" : "is noindex, nofollow"}`, indexable ? !robotsMeta?.includes("noindex") : robotsMeta === "noindex, nofollow", `got ${JSON.stringify(robotsMeta)}`);
    const canonicalHref = body.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (canonicalHref !== undefined) {
      check(`${pathname}: canonical is on ${canonical}`, new URL(canonicalHref).origin === canonical, `got ${canonicalHref}`);
    }
  }

  const robots = await get("/robots.txt");
  check("/robots.txt: HTTP 200", robots.response.status === 200, `got ${robots.response.status}`);
  if (!indexable) check("/robots.txt: lists no sitemap while not indexable", !/^sitemap:/im.test(robots.body));

  const sitemap = await get("/sitemap.xml");
  check("/sitemap.xml: HTTP 200", sitemap.response.status === 200, `got ${sitemap.response.status}`);
  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(`/sitemap.xml: every URL is on ${canonical}`, locs.length > 0 && locs.every((l) => new URL(l).origin === canonical), locs.find((l) => new URL(l).origin !== canonical) ?? "");

  const missing = await get("/this-page-does-not-exist");
  check("Unknown page: HTTP 404", missing.response.status === 404, `got ${missing.response.status}`);

  const home = await get("/");
  const asset = home.body.match(/\/_next\/static\/[^"']+\.js/)?.[0];
  if (asset) {
    const { response } = await get(asset);
    check("Static script: HTTP 200 and immutable cache", response.status === 200 && (response.headers.get("cache-control") ?? "").includes("immutable"), `${response.status} ${response.headers.get("cache-control")}`);
  } else {
    check("Static script: found on the home page", false);
  }
} catch (error) {
  check("Requests completed", false, String(error));
}

console.log(`Deployment check: ${base} (expected site URL ${canonical}, ${indexable ? "indexable" : "not indexable"})\n`);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);

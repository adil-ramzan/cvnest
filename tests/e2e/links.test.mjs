// Contact and project links: real links in the preview and print copy, never unsafe.
import { BASE, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Links: safe schemes, no script execution, none inside thumbnails");
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && /hydrat|nested|descendant/i.test(m.text()) && errors.push(m.text()));

const resume = { schemaVersion: 2, id: "r", name: "L", createdAt: 1, updatedAt: 2, lastBackupAt: 9,
  profile: { fullName: "Link Tester", jobTitle: `<img src=x onerror="window.__x=1">`, email: "link@example.com", phone: "", location: "", linkedin: "linkedin.com/in/link", github: "javascript:window.__x=2", website: "data:text/html,<script>window.__x=3</script>" },
  sections: [{ id: "p", type: "projects", title: "Projects", visible: true, entries: [{ id: "a", name: "Good", link: "example.org/good" }, { id: "b", name: "Bad", link: "JaVaScRiPt:window.__x=4" }] }], design: { templateId: "classic", pageSize: "letter" } };
await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
await page.evaluate((v) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "r", zoom: "fit" })); }, JSON.stringify({ schemaVersion: 2, resumes: [resume] }));
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
await page.waitForSelector("select");
await sleep(500);
const unsafe = (root) => page.$eval(root, (el) => [...el.querySelectorAll("a")].map((a) => a.getAttribute("href")));
for (const slug of ["classic", "slate", "professional", "modern", "minimal"]) {
  await page.select("select", slug);
  await sleep(100);
  const hrefs = await unsafe("[aria-label='Resume preview'] .resume-paper");
  check(`${slug}: good links are real`, hrefs.includes("mailto:link@example.com") && hrefs.includes("https://linkedin.com/in/link") && hrefs.includes("https://example.org/good"), hrefs.join(" "));
  check(`${slug}: only safe schemes`, hrefs.every((h) => /^(https?:|mailto:)/.test(h)), hrefs.join(" "));
}
check("Links open safely", await page.$$eval(".resume-paper a", (as) => as.length > 0 && as.every((a) => a.target === "_blank" && a.rel.includes("noopener"))));
check("Script text stays inert", (await page.evaluate(() => window.__x)) === undefined && (await page.$("[aria-label='Resume preview'] img[src='x']")) === null);
await page.goto(`${BASE}/templates`, { waitUntil: "networkidle0" });
check("Gallery thumbnails contain no resume links", (await page.$$("article .resume-paper a")).length === 0);
await page.goto(BASE, { waitUntil: "networkidle0" });
check("Home thumbnails contain no nested links", (await page.$$(".resume-paper a")).length === 0);
check("No hydration or page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();

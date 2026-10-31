// Every template must show every field the user entered, in the live preview and
// in the print copy that becomes the PDF: Letter and A4, full and short resumes.
import fs from "node:fs";
import path from "node:path";
import { BASE, FIXTURES, createChecks, launch, sleep } from "./helpers.mjs";

const check = createChecks("Every field in every template: preview and print copy");
const registry = fs.readFileSync(path.join(process.cwd(), "src/data/templates.ts"), "utf8");
const photoMode = Object.fromEntries([...registry.matchAll(/slug: "([^"]+)",[\s\S]*?photo: "(always|optional|none)"/g)].map((m) => [m[1], m[2]]));
const handWritten = new Set(["professional", "modern", "minimal"]);
const photo = fs.readFileSync(`${FIXTURES}/photo-dataurl.txt`, "utf8");

const profile = { fullName: "Fieldy McTester", jobTitle: "Field Inspector", email: "fieldy@example.com", phone: "+1 555 0199", location: "Testville, TX", linkedin: "linkedin.com/in/fieldy", github: "github.com/fieldy", website: "fieldy.example.com",
  photo: { id: "ph", mimeType: "image/jpeg", width: 400, height: 400, byteSize: 9000, updatedAt: 1, inlineData: photo } };
const section = (id, type, title, extra) => ({ id, type, title, visible: true, ...extra });
const full = (pageSize) => ({ schemaVersion: 2, id: "r", name: "Full", createdAt: 1, updatedAt: 2, lastBackupAt: 9, profile, design: { templateId: "professional", pageSize }, sections: [
  section("a", "summary", "Heading Summary", { content: "Summary text here" }),
  section("b", "experience", "Heading Experience", { entries: [{ id: "b1", role: "Job Role One", company: "Employer One", location: "Jobtown", startDate: "Jan 2019", endDate: "Mar 2021", highlights: ["Bullet alpha", "Bullet beta"] }] }),
  section("c", "education", "Heading Education", { entries: [{ id: "c1", degree: "Degree Name", school: "School Name", startDate: "2011", endDate: "2015", details: "Education detail" }] }),
  section("d", "projects", "Heading Projects", { entries: [{ id: "d1", name: "Project Name", role: "Project Role", link: "github.com/fieldy/proj", startDate: "2022", endDate: "2023", description: "Project description" }] }),
  section("e", "skills", "Heading Skills", { entries: [{ id: "e1", name: "Skill Alpha" }, { id: "e2", name: "Skill Beta" }] }),
  section("f", "certifications", "Heading Certifications", { entries: [{ id: "f1", name: "Cert Name", issuer: "Cert Issuer", date: "2020" }] }),
  section("g", "languages", "Heading Languages", { entries: [{ id: "g1", name: "Klingon", proficiency: "Fluent" }] }),
  section("h", "awards", "Heading Awards", { entries: [{ id: "h1", title: "Award Name", issuer: "Award Issuer", date: "2018", description: "Award description" }] }),
  section("i", "volunteering", "Heading Volunteering", { entries: [{ id: "i1", role: "Volunteer Role", organization: "Volunteer Org", startDate: "2016", endDate: "2017", highlights: ["Helped out"] }] }),
  section("j", "custom", "Heading Custom", { entries: [{ id: "j1", title: "Custom Title", subtitle: "Custom Subtitle", date: "2014", description: "Custom description" }] }),
] });
const fullText = ["Fieldy McTester", "Field Inspector", "fieldy@example.com", "+1 555 0199", "Testville, TX", "linkedin.com/in/fieldy", "github.com/fieldy", "fieldy.example.com",
  "Summary text here", "Job Role One", "Employer One", "Jobtown", "Jan 2019", "Mar 2021", "Bullet alpha", "Bullet beta", "Degree Name", "School Name", "2011", "2015", "Education detail",
  "Project Name", "Project Role", "github.com/fieldy/proj", "Project description", "Skill Alpha", "Skill Beta", "Cert Name", "Cert Issuer", "Klingon", "Fluent", "Award Name", "Award Issuer", "2018", "Award description",
  "Volunteer Role", "Volunteer Org", "2016", "Helped out", "Custom Title", "Custom Subtitle", "2014", "Custom description",
  ...["Summary", "Experience", "Education", "Projects", "Skills", "Certifications", "Languages", "Awards", "Volunteering", "Custom"].map((t) => `Heading ${t}`)];
const short = (pageSize) => ({ schemaVersion: 2, id: "r", name: "Short", createdAt: 1, updatedAt: 2, lastBackupAt: 9, profile: { fullName: "Shorty Case", jobTitle: "", email: "s@example.com", phone: "", location: "" }, design: { templateId: "professional", pageSize }, sections: [
  section("b", "experience", "Experience", { entries: [{ id: "b1", role: "Only Role", company: "", startDate: "2020", endDate: "", highlights: [] }] }) ] });
const shortText = ["Shorty Case", "s@example.com", "Only Role", "2020", "Experience"];

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const problems = [];
let checked = 0;

for (const [name, make, expected, hasPhoto] of [["full", full, fullText, true], ["short", short, shortText, false]]) {
  for (const size of ["letter", "a4"]) {
    await page.goto(`${BASE}/about`, { waitUntil: "networkidle0" });
    await page.evaluate((v) => { localStorage.clear(); localStorage.setItem("folio.resumes.v2", v); localStorage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: "r", zoom: "fit" })); }, JSON.stringify({ schemaVersion: 2, resumes: [make(size)] }));
    await page.goto(`${BASE}/editor`, { waitUntil: "networkidle0" });
    await page.waitForSelector("select");
    await sleep(800);
    await page.evaluate(() => { window.__printed = 0; window.print = () => window.__printed++; });
    const slugs = await page.$$eval("select option", (os) => os.map((o) => o.value));
    for (const slug of slugs) {
      await page.select("select", slug);
      await sleep(40);
      const label = `${name}-${size}-${slug}`;
      const shows = hasPhoto && photoMode[slug] !== "none" && !handWritten.has(slug);
      const preview = await page.$eval("[aria-label='Resume preview'] .resume-paper", (el) => ({ text: el.textContent, img: !!el.querySelector("img") }));
      for (const item of expected) if (!preview.text.includes(item)) problems.push(`${label} preview: ${item}`);
      if (shows !== preview.img) problems.push(`${label} preview: photo ${preview.img}`);
      const before = await page.evaluate(() => window.__printed);
      await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.includes("PDF")).click());
      await page.waitForFunction((b) => window.__printed > b, {}, before);
      const print = await page.$eval(".print-root .resume-paper", (el) => ({ text: el.textContent, img: !!el.querySelector("img") }));
      for (const item of expected) if (!print.text.includes(item)) problems.push(`${label} print: ${item}`);
      if (shows !== print.img) problems.push(`${label} print: photo ${print.img}`);
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      await page.waitForFunction(() => !document.querySelector(".print-root"));
      checked++;
    }
  }
}
fs.writeFileSync(path.join(process.env.E2E_OUTPUT ?? ".", "fields-problems.txt"), problems.join("\n"));
check("Checked every template, both page sizes, both resumes", checked === 480, String(checked));
check("Every field appears everywhere", problems.length === 0, `${problems.length}: ${problems.slice(0, 8).join(" | ")}`);
await browser.close();

// Malformed, unexpected and oversized data at the two places untrusted resume data
// enters the app: browser storage (parseResumes) and backup files (readBackup).
// Nothing may throw, valid content must survive, and the render model must accept
// whatever the sanitizer returns.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareResume } from "@/components/resume/prepareResume";
import { FONT_SCALE, RESUME_SCHEMA_VERSION } from "@/data/resume";
import { BACKUP_KIND, readBackup } from "@/lib/backup";
import { type IdContext, sanitizeResume } from "@/lib/resume-schema";
import { parseResumes } from "@/lib/resume-storage";

let counter = 0;
const ctx = (): IdContext => ({ seen: new Set(), makeId: () => `gen-${++counter}` });
const envelope = (resumes: unknown[]) => JSON.stringify({ schemaVersion: RESUME_SCHEMA_VERSION, resumes });
const backup = (resumes: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ kind: BACKUP_KIND, schemaVersion: RESUME_SCHEMA_VERSION, exportedAt: "2026-01-01T00:00:00Z", resumes, ...extra });

const valid = (id: string, extra: Record<string, unknown> = {}) => ({
  schemaVersion: RESUME_SCHEMA_VERSION,
  id,
  name: `Resume ${id}`,
  createdAt: 1,
  updatedAt: 2,
  profile: { fullName: "Ada Example", jobTitle: "Engineer", email: "ada@example.com", phone: "", location: "" },
  sections: [{ id: `${id}-s`, type: "summary", title: "Profile", visible: true, content: "Keeps this text." }],
  design: { templateId: "classic", pageSize: "a4" },
  ...extra,
});

/** Values of every wrong type, for fields that expect something else. */
const junk: unknown[] = [null, undefined, true, 0, -1, NaN, Infinity, "", "text", [], [1, "a", null], {}, { nested: { deep: [1] } }];

describe("malformed storage data", () => {
  it("never throws on unparseable or wrongly shaped storage", () => {
    const inputs = ["", "{", "null", "42", '"text"', "[]", "{}", '{"resumes":5}', '{"resumes":{}}', '{"resumes":null}', "[null,1,\"x\",[]]"];
    for (const raw of inputs) {
      const result = parseResumes(raw);
      assert.ok(Array.isArray(result.resumes), raw);
      assert.equal(result.resumes.length, 0, raw);
    }
  });

  it("flags unparseable or wrongly shaped storage as recovered, so the original is backed up", () => {
    for (const raw of ["{", '"text"', '{"resumes":5}', "[null,1]"]) assert.equal(parseResumes(raw).recovered, true, raw);
    assert.equal(parseResumes(envelope([])).recovered, false);
  });

  it("keeps the readable resumes and skips only the unreadable items", () => {
    const result = parseResumes(envelope([valid("a"), null, 7, "x", [], valid("b")]));
    assert.deepEqual(result.resumes.map((r) => r.id), ["a", "b"]);
    assert.equal(result.recovered, true);
    assert.equal(result.resumes[0].sections[0].type === "summary" && result.resumes[0].sections[0].content, "Keeps this text.");
  });

  it("survives every wrong type in every top-level, profile and design field", () => {
    for (const value of junk) {
      const raw = valid("r", {
        name: value,
        createdAt: value,
        updatedAt: value,
        lastBackupAt: value,
        profile: { fullName: value, email: value, photo: value, sampleFields: value },
        sections: value,
        design: { templateId: value, pageSize: value, accentColor: value, fontFamily: value, fontScale: value },
      });
      const resume = sanitizeResume(raw, ctx());
      assert.ok(resume, String(value));
      assert.equal(typeof resume.name, "string");
      assert.ok(Number.isFinite(resume.createdAt) && resume.createdAt > 0);
      assert.ok(Number.isFinite(resume.updatedAt) && resume.updatedAt > 0);
      assert.equal(typeof resume.profile.fullName, "string");
      assert.ok(Array.isArray(resume.sections));
      assert.ok(resume.design.pageSize === "letter" || resume.design.pageSize === "a4");
      assert.doesNotThrow(() => prepareResume(resume), String(value));
    }
  });

  it("survives wrong types inside sections and entries, keeping the valid parts", () => {
    const raw = valid("r", {
      sections: [
        ...junk,
        { type: "experience", entries: junk },
        { type: "experience", entries: [{ role: "Kept role", company: ["no"], highlights: ["kept bullet", { no: 1 }, null, ["x"]] }] },
        { type: "skills", entries: [{ name: "SQL" }, "Excel", { name: { no: 1 } }] },
        { type: "summary", content: { html: "<b>no</b>" }, title: 42, visible: "no" },
        { type: "unknown-type", entries: [{ name: "x" }] },
      ],
    });
    const resume = sanitizeResume(raw, ctx())!;
    assert.deepEqual(resume.sections.map((s) => s.type), ["experience", "experience", "skills", "summary"]);
    const [empty, experience, skills, summary] = resume.sections;
    assert.ok(empty.type === "experience" && empty.entries.length === junk.filter((v) => typeof v === "object" && v !== null && !Array.isArray(v)).length);
    assert.ok(experience.type === "experience");
    assert.equal(experience.entries[0].role, "Kept role");
    assert.equal(experience.entries[0].company, "");
    assert.deepEqual(experience.entries[0].highlights, ["kept bullet"]);
    assert.ok(skills.type === "skills");
    assert.deepEqual(skills.entries.map((e) => e.name), ["SQL", ""]);
    assert.ok(summary.type === "summary");
    assert.equal(summary.content, "");
    assert.equal(summary.title, "Profile");
    // Anything other than false keeps a section visible.
    assert.equal(summary.visible, true);
    assert.doesNotThrow(() => prepareResume(resume));
  });

  it("only accepts real colors, known fonts and in-range text sizes", () => {
    const colors = ["red", "#fff", "#GGGGGG", "#12345", "#1234567", "rgb(0,0,0)", "javascript:alert(1)", "#0f766e;color:red", " #0f766e"];
    for (const accentColor of colors) {
      const { design } = sanitizeResume(valid("r", { design: { templateId: "classic", pageSize: "letter", accentColor } }), ctx())!;
      assert.equal(design.accentColor, undefined, accentColor);
    }
    assert.equal(sanitizeResume(valid("r", { design: { accentColor: "#0F766E" } }), ctx())!.design.accentColor, "#0f766e");

    for (const fontFamily of ["comic-sans", "INTER", "", "__proto__", "constructor"]) {
      assert.equal(sanitizeResume(valid("r", { design: { fontFamily } }), ctx())!.design.fontFamily, undefined, fontFamily);
    }
    for (const fontScale of [NaN, Infinity, -Infinity, 0, 0.5, FONT_SCALE.min - 0.01, FONT_SCALE.max + 0.01, 5, "1.1", null]) {
      assert.equal(sanitizeResume(valid("r", { design: { fontScale } }), ctx())!.design.fontScale, undefined, String(fontScale));
    }
    assert.equal(sanitizeResume(valid("r", { design: { fontScale: FONT_SCALE.large } }), ctx())!.design.fontScale, FONT_SCALE.large);
  });

  it("resolves unknown template ids to a real template when loading from storage", () => {
    for (const templateId of ["no-such-template", "../../etc/passwd", "<script>", "x".repeat(5000)]) {
      const [resume] = parseResumes(envelope([valid("r", { design: { templateId, pageSize: "letter" } })])).resumes;
      assert.equal(resume.design.templateId, "professional", templateId.slice(0, 20));
    }
  });

  it("isn't affected by __proto__ or constructor keys in stored JSON", () => {
    const raw = `{"schemaVersion":2,"resumes":[{"schemaVersion":2,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"id":"p","profile":{"__proto__":{"polluted":true},"fullName":"Kept"},"design":{"__proto__":{"accentColor":"#000000"}}}]}`;
    const { resumes } = parseResumes(raw);
    assert.equal(resumes.length, 1);
    assert.equal(resumes[0].profile.fullName, "Kept");
    assert.equal(resumes[0].design.accentColor, undefined);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"), false);
  });

  it("keeps oversized text and long lists in full", () => {
    const huge = "word ".repeat(50_000);
    const bullets = Array.from({ length: 500 }, (_, i) => `Bullet ${i}`);
    const [resume] = parseResumes(
      envelope([valid("r", { sections: [{ id: "s", type: "experience", entries: [{ id: "e", role: huge, highlights: bullets }] }] })]),
    ).resumes;
    assert.ok(resume.sections[0].type === "experience");
    assert.equal(resume.sections[0].entries[0].role.length, huge.length);
    assert.equal(resume.sections[0].entries[0].highlights.length, 500);
  });

  it("keeps control characters, right-to-left marks, emoji and lone surrogates as text", () => {
    const odd = "A\u0000B‮C​😀\ud800D";
    const [resume] = parseResumes(envelope([valid("r", { profile: { fullName: odd } })])).resumes;
    assert.equal(resume.profile.fullName, odd);
    assert.doesNotThrow(() => prepareResume(resume));
  });

  it("refuses to treat newer-version data as readable, so it is never overwritten", () => {
    assert.equal(parseResumes(JSON.stringify({ schemaVersion: 99, resumes: [] })).newerData, true);
    assert.equal(parseResumes(envelope([{ ...valid("r"), schemaVersion: 99 }])).newerData, true);
    assert.equal(parseResumes(envelope([valid("r")])).newerData, false);
  });
});

describe("malformed backup files", () => {
  it("rejects anything that isn't a backup, without throwing", () => {
    const inputs = ["", "not json", "null", "[]", "42", "{}", JSON.stringify({ kind: "other", resumes: [] }), JSON.stringify({ kind: BACKUP_KIND, resumes: "x" })];
    for (const text of inputs) {
      const result = readBackup(text);
      assert.equal(result.ok, false, text);
    }
  });

  it("rejects a backup with no readable resumes", () => {
    const result = readBackup(backup([null, 1, "x"]));
    assert.equal(result.ok, false);
  });

  it("restores the readable resumes and counts the skipped ones", () => {
    const result = readBackup(backup([valid("a"), null, "x", valid("b")]));
    assert.ok(result.ok);
    assert.equal(result.resumes.length, 2);
    assert.equal(result.skipped, 2);
  });

  it("refuses backups from a newer version, at the file or resume level", () => {
    assert.equal(readBackup(backup([valid("a")], { schemaVersion: 99 })).ok, false);
    assert.equal(readBackup(backup([{ ...valid("a"), schemaVersion: 99 }])).ok, false);
  });

  it("drops photo data that isn't a small JPEG, PNG or WebP image, but keeps the resume", () => {
    const bad = [
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      "data:text/html;base64,PGgxPjwvaDE+",
      "javascript:alert(1)",
      "data:image/png;base64,@@@",
      `data:image/png;base64,${"A".repeat(2_000_000)}`,
    ];
    for (const inlineData of bad) {
      const result = readBackup(backup([valid("a", { profile: { fullName: "Kept", photo: { inlineData } } })]));
      assert.ok(result.ok, inlineData.slice(0, 30));
      assert.equal(result.resumes[0].profile.fullName, "Kept");
      assert.equal(result.resumes[0].profile.photo, undefined, inlineData.slice(0, 30));
    }
    const good = readBackup(backup([valid("a", { profile: { fullName: "Kept", photo: { inlineData: "data:image/png;base64,iVBORw0KGgo=" } } })]));
    assert.ok(good.ok && good.resumes[0].profile.photo?.inlineData);
  });
});

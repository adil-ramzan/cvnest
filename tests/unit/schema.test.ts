import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESUME_SCHEMA_VERSION } from "@/data/resume";
import { type IdContext, sanitizeResume } from "@/lib/resume-schema";

let counter = 0;
const ctx = (): IdContext => ({ seen: new Set(), makeId: () => `gen-${++counter}` });

describe("sanitizeResume", () => {
  it("returns null for anything that isn't an object", () => {
    for (const value of [null, undefined, "x", 42, []]) assert.equal(sanitizeResume(value, ctx()), null);
  });

  it("fills in every missing field with a safe default", () => {
    const resume = sanitizeResume({}, ctx())!;
    assert.equal(resume.schemaVersion, RESUME_SCHEMA_VERSION);
    assert.ok(resume.id);
    assert.equal(resume.name, "Untitled resume");
    assert.deepEqual(resume.sections, []);
    assert.equal(resume.profile.fullName, "");
    assert.equal(resume.profile.email, "");
    assert.equal(resume.profile.photo, undefined);
    assert.deepEqual(resume.design, { templateId: "professional", pageSize: "letter" });
  });

  it("keeps valid sections, drops unknown types and defaults visibility and titles", () => {
    const resume = sanitizeResume(
      {
        id: "r1",
        sections: [
          { id: "s1", type: "experience", entries: [{ id: "e1", role: "Dev", highlights: ["a", 5, "b"] }] },
          { id: "s2", type: "not-a-section" },
          { id: "s3", type: "summary", title: "About me", visible: false, content: "Hello" },
        ],
      },
      ctx(),
    )!;
    assert.deepEqual(
      resume.sections.map((s) => s.type),
      ["experience", "summary"],
    );
    const [experience, summary] = resume.sections;
    assert.equal(experience.title, "Experience");
    assert.equal(experience.visible, true);
    assert.ok(experience.type === "experience");
    assert.deepEqual(experience.entries[0].highlights, ["a", "b"]);
    assert.equal(experience.entries[0].company, "");
    assert.ok(summary.type === "summary");
    assert.equal(summary.title, "About me");
    assert.equal(summary.visible, false);
  });

  it("replaces duplicate ids across everything loaded with one context", () => {
    const shared = ctx();
    const a = sanitizeResume({ id: "dup", sections: [{ id: "s", type: "skills", entries: [{ id: "k", name: "Go" }, { id: "k", name: "Rust" }] }] }, shared)!;
    const b = sanitizeResume({ id: "dup", sections: [{ id: "s", type: "skills", entries: [] }] }, shared)!;
    assert.equal(a.id, "dup");
    assert.notEqual(b.id, "dup");
    assert.notEqual(b.sections[0].id, "s");
    const skills = a.sections[0];
    assert.ok(skills.type === "skills");
    assert.equal(skills.entries[0].id, "k");
    assert.notEqual(skills.entries[1].id, "k");
  });

  it("regenerates every id in fresh-id mode", () => {
    const resume = sanitizeResume({ id: "keep", sections: [{ id: "s", type: "summary" }] }, { ...ctx(), freshIds: true })!;
    assert.notEqual(resume.id, "keep");
    assert.notEqual(resume.sections[0].id, "s");
  });

  it("accepts only small image data URLs as inline photos", () => {
    const ok = sanitizeResume({ profile: { photo: { id: "p", inlineData: "data:image/jpeg;base64,AAAA" } } }, ctx())!;
    assert.equal(ok.profile.photo?.inlineData, "data:image/jpeg;base64,AAAA");
    const script = sanitizeResume({ profile: { photo: { inlineData: "javascript:alert(1)" } } }, ctx())!;
    assert.equal(script.profile.photo, undefined);
    const svg = sanitizeResume({ profile: { photo: { id: "p", inlineData: "data:image/svg+xml;utf8,<svg/>" } } }, ctx())!;
    assert.equal(svg.profile.photo?.inlineData, undefined);
    assert.equal(svg.profile.photo?.id, "p");
  });

  it("caps very long text", () => {
    const resume = sanitizeResume({ profile: { fullName: "x".repeat(20_000) } }, ctx())!;
    assert.equal(resume.profile.fullName.length, 10_000);
  });

  it("keeps an unknown template id for the storage layer to resolve", () => {
    const resume = sanitizeResume({ design: { templateId: "retired-template", pageSize: "a4" } }, ctx())!;
    assert.deepEqual(resume.design, { templateId: "retired-template", pageSize: "a4" });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareResume } from "@/components/resume/prepareResume";
import { type ExperienceSection, RESUME_SCHEMA_VERSION } from "@/data/resume";
import { findOverLimits, LIMITS } from "@/lib/resume-limits";
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

  it("keeps very long text in full", () => {
    const resume = sanitizeResume({ profile: { fullName: "x".repeat(20_000) } }, ctx())!;
    assert.equal(resume.profile.fullName.length, 20_000);
  });

  it("keeps an unknown template id for the storage layer to resolve", () => {
    const resume = sanitizeResume({ design: { templateId: "retired-template", pageSize: "a4" } }, ctx())!;
    assert.deepEqual(resume.design, { templateId: "retired-template", pageSize: "a4" });
  });
});

describe("hidden entries", () => {
  const saved = (entry: Record<string, unknown>) => ({
    id: "r",
    name: "Saved",
    sections: [{ id: "s", type: "experience", title: "Experience", visible: true, entries: [{ id: "e", role: "Pilot", company: "Air", highlights: [], ...entry }] }],
  });

  it("loads entries saved before the field existed unchanged", () => {
    const resume = sanitizeResume(saved({}), ctx())!;
    const entry = (resume.sections[0] as ExperienceSection).entries[0];
    assert.equal("hidden" in entry, false);
    assert.equal(prepareResume(resume).sections.length, 1);
  });

  it("keeps hidden entries through a save and load", () => {
    const resume = sanitizeResume(saved({ hidden: true }), ctx())!;
    const reloaded = sanitizeResume(JSON.parse(JSON.stringify(resume)), ctx())!;
    assert.equal((reloaded.sections[0] as ExperienceSection).entries[0].hidden, true);
  });

  it("ignores anything other than true", () => {
    const resume = sanitizeResume(saved({ hidden: "yes" }), ctx())!;
    assert.equal("hidden" in (resume.sections[0] as ExperienceSection).entries[0], false);
  });

  it("leaves the schema version alone", () => {
    assert.equal(RESUME_SCHEMA_VERSION, 2);
  });

  it("skips hidden entries in what templates render, for every kind of list", () => {
    const resume = sanitizeResume(
      {
        id: "r",
        name: "Saved",
        sections: [
          { id: "a", type: "experience", title: "", visible: true, entries: [{ id: "a1", role: "Shown role", company: "", highlights: [] }, { id: "a2", role: "Secret role", company: "", highlights: [], hidden: true }] },
          { id: "b", type: "languages", title: "", visible: true, entries: [{ id: "b1", name: "Shown language" }, { id: "b2", name: "Secret language", hidden: true }] },
          { id: "c", type: "certifications", title: "", visible: true, entries: [{ id: "c1", name: "Only one", hidden: true }] },
        ],
      },
      ctx(),
    )!;
    const prepared = prepareResume(resume);
    const text = JSON.stringify(prepared.sections);
    assert.ok(text.includes("Shown role") && text.includes("Shown language"));
    assert.ok(!text.includes("Secret"));
    assert.equal(prepared.sections.some((section) => section.type === "certifications"), false);
  });
});

describe("editing limits", () => {
  const big = {
    id: "r",
    name: "Big",
    sections: [
      { id: "s", type: "summary", title: "Profile", visible: true, content: "x".repeat(LIMITS.text + 5000) },
      { id: "e", type: "experience", title: "Experience", visible: true, entries: Array.from({ length: LIMITS.entries + 50 }, (_, i) => ({ id: `j${i}`, role: "R", company: "", highlights: [] })) },
      ...Array.from({ length: LIMITS.sections + 10 }, (_, i) => ({ id: `c${i}`, type: "custom", title: "C", visible: true, entries: [] })),
    ],
  };

  it("loads content over the limits without cutting it", () => {
    const resume = sanitizeResume(big, ctx())!;
    assert.equal(resume.sections.length, LIMITS.sections + 12);
    assert.equal((resume.sections[0] as { content: string }).content.length, LIMITS.text + 5000);
    assert.equal((resume.sections[1] as ExperienceSection).entries.length, LIMITS.entries + 50);
  });

  it("reports what is over the limits", () => {
    const found = findOverLimits(sanitizeResume(big, ctx())!).join(" | ");
    assert.ok(found.includes("15,000 characters"));
    assert.ok(found.includes("250 entries"));
    assert.ok(found.includes("62 sections"));
  });

  it("reports nothing for ordinary resumes", () => {
    assert.deepEqual(findOverLimits(sanitizeResume({ id: "r", name: "Small" }, ctx())!), []);
  });
});

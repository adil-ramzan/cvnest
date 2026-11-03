import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareResume } from "@/components/resume/prepareResume";
import type { Resume, ResumeSection } from "@/data/resume";
import { templates } from "@/data/templates";
import { parseResumes } from "@/lib/resume-storage";
import { createResume, duplicateResume, isResumeEmpty } from "@/lib/resumes";
import { clearSampleContent, findSampleContent, hasSampleContent, markAsSample } from "@/lib/sample-content";

const loaded = () => {
  const { profile, sections } = markAsSample(duplicateResume(templates[0].sample, "Mine"));
  return { ...createResume(), profile, sections };
};
const entriesOf = (resume: Resume) => resume.sections.flatMap((section): { id: string; sample?: true }[] => ("entries" in section ? section.entries : []));
const roundTrip = (resume: Resume) => parseResumes(JSON.stringify({ schemaVersion: 2, resumes: [resume] })).resumes[0];

describe("sample content", () => {
  it("marks every entry, the summary and each filled profile field", () => {
    const resume = loaded();
    assert.ok(entriesOf(resume).length > 0);
    assert.ok(entriesOf(resume).every((entry) => entry.sample === true));
    const summary = resume.sections.find((s) => s.type === "summary");
    assert.equal(summary?.type === "summary" && summary.sample, true);
    assert.ok(resume.profile.sampleFields?.includes("fullName"));
    assert.ok(resume.profile.sampleFields?.every((field) => resume.profile[field]?.trim()));
  });

  it("survives a save and reload, and a duplicate", () => {
    const resume = loaded();
    for (const copy of [roundTrip(resume), duplicateResume(resume, "Copy")]) {
      assert.deepEqual(copy.profile.sampleFields, resume.profile.sampleFields);
      assert.equal(entriesOf(copy).filter((entry) => entry.sample).length, entriesOf(resume).length);
    }
  });

  it("is absent from resumes saved before it existed", () => {
    const old = createResume();
    old.profile.fullName = "Real Person";
    const saved = roundTrip(old);
    assert.equal("sampleFields" in saved.profile, false);
    assert.equal(JSON.stringify(saved).includes('"sample"'), false);
    assert.equal(hasSampleContent(saved), false);
    assert.equal(findSampleContent(saved), null);
  });

  it("drops malformed marks", () => {
    const raw = JSON.parse(JSON.stringify(loaded()));
    raw.profile.sampleFields = ["fullName", "photo", 3];
    raw.sections.find((s: { entries?: unknown[] }) => s.entries?.length).entries[0].sample = "yes";
    const saved = roundTrip(raw);
    assert.deepEqual(saved.profile.sampleFields, ["fullName"]);
    assert.equal(entriesOf(saved).filter((entry) => entry.sample).length, entriesOf(raw).length - 1);
  });

  it("never reaches a template", () => {
    const resume = loaded();
    const clean = JSON.parse(JSON.stringify(resume, (key, value) => (key === "sample" || key === "sampleFields" ? undefined : value)));
    assert.deepEqual(prepareResume(resume), prepareResume(clean));
  });

  it("clears only what is still marked", () => {
    const resume = loaded();
    resume.profile = { ...resume.profile, fullName: "Real Person", sampleFields: resume.profile.sampleFields?.filter((field) => field !== "fullName") };
    const skills = resume.sections.find((s) => s.type === "skills")!;
    if (skills.type === "skills") skills.entries.push({ id: "mine", name: "My skill" });
    const cleared = clearSampleContent(resume);
    assert.equal(cleared.profile.fullName, "Real Person");
    assert.equal(cleared.profile.email, "");
    assert.deepEqual(entriesOf(cleared).map((entry) => entry.id), ["mine"]);
    assert.equal(hasSampleContent(cleared), false);
    assert.equal(isResumeEmpty(clearSampleContent(loaded())), true);
  });

  it("warns only about what the PDF would show, but clears hidden content too", () => {
    const resume = loaded();
    resume.profile = { ...resume.profile, sampleFields: undefined };
    const shown = resume.sections.map((section): ResumeSection => ({ ...section, visible: false }));
    const hidden = { ...resume, sections: shown };
    assert.equal(findSampleContent(hidden), null);
    assert.equal(hasSampleContent(hidden), true);
    assert.equal(hasSampleContent(clearSampleContent(hidden)), false);
  });

  it("finds the first sample content in the resume's order", () => {
    const resume = loaded();
    assert.equal(findSampleContent(resume)?.sectionId, "personal");
    resume.profile = { ...resume.profile, sampleFields: undefined };
    assert.equal(findSampleContent(resume)?.sectionId, resume.sections[0].id);
  });
});

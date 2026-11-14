import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dateRange, prepareResume } from "@/components/resume/prepareResume";
import { getTemplate, templateCategories, templates } from "@/data/templates";
import { createResume, duplicateResume, isResumeEmpty, isTemplateSlug } from "@/lib/resumes";

describe("template registry", () => {
  it("has 120 templates with unique slugs", () => {
    assert.equal(templates.length, 120);
    assert.equal(new Set(templates.map((t) => t.slug)).size, 120);
  });

  it("has the planned number of templates in each category", () => {
    const counts = Object.fromEntries(templateCategories.map((c) => [c.id, templates.filter((t) => t.category === c.id).length]));
    assert.deepEqual(counts, { simple: 14, modern: 16, creative: 19, photo: 13, compact: 12, graduate: 12, executive: 10, technical: 9, academic: 7, business: 8 });
  });

  it("has no two designs with the same structure and type", () => {
    const signatures = templates.filter((t) => t.design).map(({ slug, design }) => {
      const d = design!;
      return { slug, key: [d.layout, d.header, d.heading, d.bullets, d.skills, d.dates, d.fonts.heading, d.fonts.body].join("|") };
    });
    const seen = new Map<string, string>();
    for (const { slug, key } of signatures) {
      assert.equal(seen.get(key), undefined, `${slug} repeats ${seen.get(key)}`);
      seen.set(key, slug);
    }
  });

  it("gives every template a unique name and description for search engines", () => {
    assert.equal(new Set(templates.map((t) => t.name)).size, templates.length);
    assert.equal(new Set(templates.map((t) => t.description)).size, templates.length);
  });

  it("gives every template a sample resume with content", () => {
    for (const t of templates) {
      assert.ok(t.sample.profile.fullName, `${t.slug} sample has a name`);
      assert.ok(t.sample.sections.length > 0, `${t.slug} sample has sections`);
    }
  });

  it("recognises known template ids only", () => {
    assert.equal(isTemplateSlug("kinetic"), true);
    assert.equal(isTemplateSlug("nope"), false);
    assert.equal(getTemplate("modern")?.name, "Modern");
  });
});

describe("prepareResume", () => {
  it("drops hidden sections and empty entries, and falls back to default titles", () => {
    const resume = createResume();
    resume.profile.fullName = "  Ada Lovelace ";
    for (const section of resume.sections) {
      if (section.type === "experience") section.entries = [{ id: "e", role: "", company: "", highlights: [] }];
      if (section.type === "skills") {
        section.title = "  ";
        section.entries = [{ id: "s", name: "Math" }];
      }
      if (section.type === "summary") {
        section.content = "Hidden text";
        section.visible = false;
      }
    }
    const prepared = prepareResume(resume);
    assert.equal(prepared.name, "Ada Lovelace");
    assert.equal(prepared.initials, "AL");
    assert.deepEqual(prepared.sections.map((s) => s.type), ["skills"]);
    assert.equal(prepared.sections[0].title, "Skills");
  });

  it("uses a placeholder name for empty resumes", () => {
    assert.equal(prepareResume(createResume()).name, "Your Name");
  });

  it("formats date ranges", () => {
    assert.equal(dateRange("2020", "2022"), "2020 – 2022");
    assert.equal(dateRange("2019", "2019"), "2019");
    assert.equal(dateRange(undefined, undefined), "");
  });

  it("shows no bare \"Present\" when there's no start date (audit T-09)", () => {
    for (const ongoing of ["Present", "present", " Current ", "Now", "Ongoing", "Today"]) assert.equal(dateRange("", ongoing), "");
    assert.equal(dateRange(undefined, "Present"), "");
    assert.equal(dateRange("", "2020"), "2020");
    assert.equal(dateRange("2020", "Present"), "2020 – Present");
    assert.equal(dateRange("2020", ""), "2020");
  });
});

describe("resume helpers", () => {
  it("detects empty resumes", () => {
    const resume = createResume();
    assert.equal(isResumeEmpty(resume), true);
    resume.profile.email = "a@b.c";
    assert.equal(isResumeEmpty(resume), false);
  });

  it("duplicates with completely fresh ids", () => {
    const source = createResume("classic");
    const copy = duplicateResume(source, "Copy");
    assert.equal(copy.name, "Copy");
    assert.equal(copy.design.templateId, "classic");
    assert.notEqual(copy.id, source.id);
    const ids = (r: typeof source) => r.sections.map((s) => s.id);
    assert.ok(ids(copy).every((id) => !ids(source).includes(id)));
  });
});

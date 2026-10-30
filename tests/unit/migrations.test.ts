import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateResume, schemaVersionOf } from "@/lib/migrations";

const v1 = {
  id: "res-1",
  name: "My CV",
  template: "modern",
  pageSize: "a4",
  createdAt: 100,
  updatedAt: 200,
  data: {
    name: "Lena Fixture",
    title: "Data Engineer",
    photo: "data:image/jpeg;base64,AAAA",
    contact: { email: "lena@example.com", phone: "1", location: "Berlin", linkedin: "linkedin.com/in/lena" },
    summary: "Builds pipelines.",
    experience: [{ id: "exp-a", role: "Engineer", company: "Streamline", location: "Remote", start: "2020", end: "Now", highlights: ["Built things"] }],
    education: [{ degree: "B.S.", school: "TU", start: "2015", end: "2019", detail: "Honors" }],
    skills: ["Python", "SQL"],
    projects: [{ id: "p-a", name: "Tool", subtitle: "Rust", link: "x.dev", description: "Fast" }],
    certifications: ["CKA"],
    languages: ["German — Fluent", "English"],
    customSections: [{ id: "c-a", title: "Publications", items: [{ id: "i-a", title: "Paper", date: "2021" }] }],
  },
};

describe("schemaVersionOf", () => {
  it("treats data without a version as schema 1", () => {
    assert.equal(schemaVersionOf({ data: {} }), 1);
    assert.equal(schemaVersionOf({ schemaVersion: 2 }), 2);
  });
});

describe("migrateResume v1 → v2", () => {
  const result = migrateResume(v1)!;
  const r = result.value as Record<string, any>;
  const section = (type: string) => r.sections.find((s: { type: string }) => s.type === type);

  it("reports the source version and produces schema 2", () => {
    assert.equal(result.fromVersion, 1);
    assert.equal(r.schemaVersion, 2);
  });

  it("preserves the resume id, name, timestamps, template and page size", () => {
    assert.equal(r.id, "res-1");
    assert.equal(r.name, "My CV");
    assert.equal(r.createdAt, 100);
    assert.equal(r.updatedAt, 200);
    assert.deepEqual(r.design, { templateId: "modern", pageSize: "a4" });
  });

  it("maps contact details into the profile and keeps the photo inline for later IndexedDB storage", () => {
    assert.equal(r.profile.fullName, "Lena Fixture");
    assert.equal(r.profile.jobTitle, "Data Engineer");
    assert.equal(r.profile.linkedin, "linkedin.com/in/lena");
    assert.equal(r.profile.photo.inlineData, "data:image/jpeg;base64,AAAA");
    assert.equal(r.profile.photo.id, "res-1:photo");
  });

  it("orders sections the way v1 templates rendered them", () => {
    assert.deepEqual(
      r.sections.map((s: { type: string }) => s.type),
      ["summary", "experience", "projects", "education", "skills", "certifications", "languages", "custom"],
    );
  });

  it("keeps existing entry ids and derives the missing ones from the resume id", () => {
    assert.equal(section("experience").entries[0].id, "exp-a");
    assert.equal(section("education").entries[0].id, "res-1:education-0");
    assert.equal(section("skills").entries[1].id, "res-1:skill-1");
    assert.equal(section("custom").id, "c-a");
    assert.equal(section("custom").entries[0].id, "i-a");
  });

  it("renames fields and splits languages into name and proficiency", () => {
    assert.equal(section("experience").entries[0].startDate, "2020");
    assert.equal(section("education").entries[0].details, "Honors");
    assert.equal(section("projects").entries[0].role, "Rust");
    assert.deepEqual(section("languages").entries.map((e: { name: string; proficiency: string }) => [e.name, e.proficiency]), [
      ["German", "Fluent"],
      ["English", ""],
    ]);
  });

  it("is deterministic, so two tabs migrating at once agree", () => {
    assert.deepEqual(migrateResume(v1)!.value, migrateResume(v1)!.value);
  });

  it("tolerates missing and malformed v1 fields", () => {
    const partial = migrateResume({ id: "p", data: { skills: "not-an-array", experience: [null, { role: 5 }] } })!;
    const value = partial.value as Record<string, any>;
    assert.equal(value.profile.fullName, "");
    assert.deepEqual(value.sections.find((s: { type: string }) => s.type === "skills").entries, []);
  });
});

describe("migrateResume edge cases", () => {
  it("passes current-version data through unchanged", () => {
    const current = { schemaVersion: 2, id: "x", sections: [] };
    assert.deepEqual(migrateResume(current), { value: current, fromVersion: 2 });
  });

  it("refuses data from a newer app version instead of downgrading it", () => {
    assert.equal(migrateResume({ schemaVersion: 99, id: "future" }), null);
  });

  it("returns null for non-objects", () => {
    assert.equal(migrateResume("text"), null);
    assert.equal(migrateResume(null), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TemplateRenderer } from "@/components/resume/ResumePreview";
import type { Resume } from "@/data/resume";
import { templates } from "@/data/templates";
import { createResume } from "@/lib/resumes";

// Audit T-09: every template formats dates through the shared dateRange(), so an entry with
// "Present" and no start date shows no date in any of them, while full ranges still show.
const resume = (slug: string): Resume => ({
  ...createResume(),
  profile: { fullName: "Pat Doe", jobTitle: "", email: "", phone: "", location: "" },
  design: { templateId: slug, pageSize: "letter" },
  sections: [
    { id: "x", type: "experience", title: "Experience", visible: true, entries: [
      { id: "a", role: "Undated Role", company: "Co", startDate: "", endDate: "Present", highlights: ["Did things."] },
      { id: "b", role: "Dated Role", company: "Co", startDate: "2019", endDate: "2021", highlights: ["Did more."] },
    ] },
    { id: "v", type: "volunteering", title: "Volunteering", visible: true, entries: [{ id: "c", role: "Mentor", organization: "Club", startDate: "", endDate: "present", highlights: [] }] },
  ],
});

describe("dates in every template", () => {
  for (const t of templates) {
    it(`${t.slug}: no bare "Present", full ranges intact`, () => {
      const html = renderToStaticMarkup(createElement(TemplateRenderer, { template: t, resume: resume(t.slug) }));
      assert.ok(!/present/i.test(html), "no Present without a start date");
      assert.ok(/2019\s*(–|&#x2013;|&ndash;)\s*2021/.test(html), "full range shown");
    });
  }
});

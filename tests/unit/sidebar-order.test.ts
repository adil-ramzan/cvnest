import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TemplateRenderer } from "@/components/resume/ResumePreview";
import type { Resume } from "@/data/resume";
import { templates } from "@/data/templates";
import { createResume } from "@/lib/resumes";

// Audit T-02: text order (screen readers, copy and paste, text extraction that follows the
// document) must be main content first, then the sidebar, whichever side it's drawn on.

const resume = (slug: string): Resume => ({
  ...createResume(),
  profile: { fullName: "Pat Doe", jobTitle: "", email: "pat@example.com", phone: "", location: "" },
  design: { templateId: slug, pageSize: "letter" },
  sections: [
    { id: "x", type: "experience", title: "Experience", visible: true, entries: [{ id: "e", role: "Role", company: "Co", highlights: ["MAINMARK bullet"] }] },
    // Every sidebar design holds Languages, and none shows it in a full-width top band.
    { id: "k", type: "languages", title: "Languages", visible: true, entries: [{ id: "l", name: "SIDEMARK", proficiency: "Native" }] },
  ],
});

const split = templates.filter((t) => t.design && (t.design.layout === "sidebar" || t.design.layout === "columns"));
const render = (slug: string, asideFirst?: boolean) =>
  renderToStaticMarkup(createElement(TemplateRenderer, { template: templates.find((t) => t.slug === slug)!, resume: resume(slug), printCopy: asideFirst, asideFirst }));

describe("sidebar and two-column templates", () => {
  it("covers every sidebar and two-column design", () => {
    assert.equal(split.length, 47);
  });

  for (const t of split) {
    it(`${t.slug}: main content comes before the sidebar in the document`, () => {
      const html = render(t.slug);
      assert.ok(html.indexOf("MAINMARK") >= 0 && html.indexOf("SIDEMARK") >= 0, "both marks render");
      assert.ok(html.indexOf("MAINMARK") < html.indexOf("SIDEMARK"), "main before sidebar");
    });
  }

  it("keeps the sidebar first in Firefox's print copy, which floats it from the top", () => {
    for (const t of split) {
      const html = render(t.slug, true);
      assert.ok(html.indexOf("SIDEMARK") < html.indexOf("MAINMARK"), `${t.slug}: sidebar first when asideFirst`);
    }
  });

  it("places each column on the side it's drawn on", () => {
    for (const t of split) {
      const html = render(t.slug);
      const left = (t.design!.side?.position ?? (t.design!.layout === "sidebar" ? "left" : "right")) === "left";
      const aside = html.match(/<aside[^>]*style="([^"]*)"/)?.[1] ?? "";
      assert.ok(aside.includes(`grid-column:${left ? 1 : 2}`), `${t.slug}: sidebar in column ${left ? 1 : 2} (${aside})`);
    }
  });
});

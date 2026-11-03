import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prepareResume, textBlocks } from "@/components/resume/prepareResume";
import { TemplateRenderer } from "@/components/resume/ResumePreview";
import type { Resume } from "@/data/resume";
import { templates } from "@/data/templates";
import { createResume } from "@/lib/resumes";

const pasted = "- ALPHA first\n• BRAVO second\n* CHARLIE third";

function resumeWith(slug: string): Resume {
  const entry = { id: "e", hidden: undefined };
  return {
    ...createResume(),
    profile: { fullName: "Pat Doe", jobTitle: "", email: "", phone: "", location: "" },
    design: { templateId: slug, pageSize: "letter" },
    sections: [
      { id: "s1", type: "summary", title: "Profile", visible: true, content: "- SUMMARY line" },
      { id: "s2", type: "projects", title: "Projects", visible: true, entries: [{ ...entry, id: "p", name: "Project", description: pasted }, { ...entry, id: "p2", name: "Second", description: "- DELTA single" }] },
      { id: "s3", type: "education", title: "Education", visible: true, entries: [{ ...entry, id: "ed", degree: "Degree", school: "School", details: "- ECHO note" }] },
      { id: "s4", type: "custom", title: "Other", visible: true, entries: [{ ...entry, id: "c", title: "Item", description: pasted.replaceAll("ALPHA", "FOXTROT") }] },
      { id: "s5", type: "awards", title: "Awards", visible: true, entries: [{ ...entry, id: "a", title: "Award", description: "• GOLF note" }] },
    ],
  };
}

describe("free text", () => {
  it("leaves plain text alone", () => {
    assert.deepEqual(textBlocks("  One line\nTwo lines\n\nThird  "), [{ kind: "text", text: "One line\nTwo lines\n\nThird" }]);
    assert.deepEqual(textBlocks(""), []);
    assert.deepEqual(textBlocks(undefined), []);
  });

  it("does not mistake other text for a bullet", () => {
    for (const line of ["-5% churn", "*Note: new", "Well-known - really", "2019 - 2021"]) assert.deepEqual(textBlocks(line), [{ kind: "text", text: line }]);
  });

  it("turns marked lines into bullets, in the order written", () => {
    assert.deepEqual(textBlocks("Intro\n- a\n• b\n*  c\nOutro\n- d"), [
      { kind: "text", text: "Intro" },
      { kind: "bullets", items: ["a", "b", "c"] },
      { kind: "text", text: "Outro" },
      { kind: "bullets", items: ["d"] },
    ]);
  });

  it("ignores a marker with nothing after it", () => {
    assert.deepEqual(textBlocks("-\n•\n* "), []);
    const resume = resumeWith("professional");
    resume.sections = [{ id: "s", type: "custom", title: "Other", visible: true, entries: [{ id: "c", title: "", description: "-" }] }];
    assert.equal(prepareResume(resume).sections.length, 0);
  });

  it("gives templates without a block a one-line form with no markers", () => {
    const section = prepareResume(resumeWith("professional")).sections.find((s) => s.type === "education");
    assert.equal(section?.kind === "entries" && section.entries[0].text, "ECHO note");
  });
});

describe("every template", () => {
  for (const template of templates) {
    it(`${template.slug} shows no pasted markers and makes real bullets`, () => {
      const html = renderToStaticMarkup(createElement(TemplateRenderer, { template, resume: resumeWith(template.slug) }));
      const text = html.replace(/<[^>]+>/g, "\n");
      assert.doesNotMatch(text, /^\s*[-•*]\s*(?:ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|SUMMARY)/m);
      assert.doesNotMatch(html, /[-•*] (?:ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|SUMMARY)/);
      for (const word of ["ALPHA first", "BRAVO second", "CHARLIE third", "DELTA single", "ECHO note", "FOXTROT first", "GOLF note", "SUMMARY line"]) assert.ok(html.includes(word), word);
      for (const word of ["ALPHA first", "CHARLIE third", "FOXTROT first", "SUMMARY line"]) assert.match(html, new RegExp(`<li[^>]*>(?:<span[^>]*>(?:<span[^>]*></span>|<span[^>]*>[^<]*</span>)?</span>)?${word}</li>`), word);
    });
  }
});

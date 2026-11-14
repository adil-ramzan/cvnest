import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StyleControls } from "@/components/editor/StyleControls";
import { customizeDesign } from "@/components/resume/engine/customize";
import { designVars } from "@/components/resume/engine/DesignTemplate";
import { TemplateRenderer } from "@/components/resume/ResumePreview";
import { NO_ACCENT_NOTE, templateStructure, usesAccentColor } from "@/data/template-tags";
import { templates } from "@/data/templates";

describe("template structure label (audit T-03)", () => {
  const lowerSingles = ["monolith", "mural", "cameo", "telegraph", "fineprint", "campus", "capstone", "ambassador", "stackline"];

  it("labels single-column designs with a grid below as not plain single column", () => {
    for (const slug of lowerSingles) assert.equal(templateStructure(templates.find((t) => t.slug === slug)!), "Single column + grid", slug);
  });

  it("calls a template single column only if it follows the user's section order", () => {
    // Plain single column: no sidebar, no columns, nothing moved into a grid below.
    for (const t of templates) {
      const plain = t.slug !== "modern" && (!t.design || (t.design.layout !== "sidebar" && t.design.layout !== "columns" && !t.design.lower?.length));
      assert.equal(templateStructure(t) === "Single column", plain, t.slug);
    }
  });

  it("keeps sidebar and two-column labels", () => {
    assert.equal(templateStructure(templates.find((t) => t.slug === "modern")!), "Sidebar");
    assert.equal(templates.filter((t) => templateStructure(t) === "Sidebar").length, 24);
    assert.equal(templates.filter((t) => templateStructure(t) === "Two column").length, 24);
  });
});

describe("accent color availability (audit T-04)", () => {
  /** True when an accent color changes the rendered page: different markup, or a changed color variable that something uses. */
  const accentShows = (slug: string) => {
    const t = templates.find((x) => x.slug === slug)!;
    if (!t.design) return true; // hand-written templates read --r-accent directly
    const accent = { accentColor: "#881337" };
    const inner = (html: string) => html.replace(/^<article[^>]*>/, "");
    const plain = inner(renderToStaticMarkup(createElement(TemplateRenderer, { template: t, resume: t.sample, customization: {} })));
    const tinted = inner(renderToStaticMarkup(createElement(TemplateRenderer, { template: t, resume: t.sample, customization: accent })));
    const before = designVars(t.design) as Record<string, string>;
    const after = designVars(customizeDesign(t.design, accent)) as Record<string, string>;
    const used = Object.keys(after).filter((key) => after[key] !== before[key] && plain.includes(`var(${key})`));
    return plain !== tinted || used.length > 0;
  };

  it("matches the renderer for every template", () => {
    const mismatched = templates.filter((t) => usesAccentColor(t) !== accentShows(t.slug)).map((t) => t.slug);
    assert.deepEqual(mismatched, []);
  });

  it("disables the color choices, with a note, where the accent does nothing", () => {
    const html = renderToStaticMarkup(createElement(StyleControls, { customization: {}, onChange: () => {}, accentAvailable: false, noAccentNote: NO_ACCENT_NOTE }));
    const colorGroup = html.slice(html.indexOf('aria-labelledby="style-color"'), html.indexOf('aria-labelledby="style-font"'));
    assert.equal((colorGroup.match(/<button[^>]*disabled=""/g) ?? []).length, 10, "Template chip and 9 swatches disabled");
    assert.match(colorGroup, /<input[^>]*type="color"[^>]*disabled=""/);
    assert.ok(colorGroup.includes(NO_ACCENT_NOTE.replaceAll("'", "&#x27;")), "note shown");
    const fontGroup = html.slice(html.indexOf('aria-labelledby="style-font"'));
    assert.ok(!/disabled=""/.test(fontGroup.split('aria-label="Decrease text size"')[0]), "font choices stay enabled");
  });

  it("leaves the color choices enabled elsewhere", () => {
    const html = renderToStaticMarkup(createElement(StyleControls, { customization: {}, onChange: () => {} }));
    const colorGroup = html.slice(html.indexOf('aria-labelledby="style-color"'), html.indexOf('aria-labelledby="style-font"'));
    assert.ok(!colorGroup.includes('disabled=""'));
    assert.ok(!colorGroup.includes(NO_ACCENT_NOTE.replaceAll("'", "&#x27;")));
  });
});

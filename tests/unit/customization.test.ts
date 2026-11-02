import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrast, customizationVars, customizeDesign, readableOn } from "@/components/resume/engine/customize";
import { FONT_SCALE, RESUME_FONTS } from "@/data/resume";
import { templates } from "@/data/templates";
import { createId, type IdContext, sanitizeResume } from "@/lib/resume-schema";
import { createResume, duplicateResume } from "@/lib/resumes";

const ctx = (): IdContext => ({ seen: new Set(), makeId: createId });
const load = (design: Record<string, unknown>) => sanitizeResume({ id: "r", name: "R", sections: [], design: { templateId: "modern", pageSize: "a4", ...design } }, ctx())!.design;

describe("saved customization", () => {
  it("leaves resumes without it exactly as they were", () => {
    assert.deepEqual(load({}), { templateId: "modern", pageSize: "a4" });
  });

  it("survives a save and reload", () => {
    const saved = { accentColor: "#1d4ed8", fontFamily: "lora", fontScale: 1.1 };
    assert.deepEqual(load(JSON.parse(JSON.stringify(load(saved)))), { templateId: "modern", pageSize: "a4", ...saved });
  });

  it("is kept on a duplicate", () => {
    const resume = createResume("modern");
    const copy = duplicateResume({ ...resume, design: { ...resume.design, accentColor: "#123456", fontFamily: "garamond", fontScale: 0.9 } }, "Copy");
    assert.equal(copy.design.accentColor, "#123456");
    assert.equal(copy.design.fontFamily, "garamond");
    assert.equal(copy.design.fontScale, 0.9);
  });

  it("drops anything that isn't a safe value", () => {
    for (const bad of [
      { accentColor: "red" },
      { accentColor: "#123;}body{display:none" },
      { fontFamily: "comic-sans" },
      { fontFamily: "plexMono" },
      { fontScale: FONT_SCALE.max + 0.01 },
      { fontScale: FONT_SCALE.min - 0.01 },
      { fontScale: "1.1" },
      { fontScale: 1 },
    ]) {
      assert.deepEqual(load(bad), { templateId: "modern", pageSize: "a4" }, JSON.stringify(bad));
    }
  });
});

describe("customizeDesign", () => {
  const designed = templates.filter((template) => template.design);

  it("returns each design untouched when no color is chosen", () => {
    for (const { design } of designed) assert.equal(customizeDesign(design!, {}), design);
  });

  it("keeps text readable on every template, for dark and very light colors", () => {
    for (const accentColor of ["#000000", "#1f3a5f", "#ffee00", "#ffffff"]) {
      for (const { slug, design } of designed) {
        const { colors, side } = customizeDesign(design!, { accentColor });
        const label = `${slug} ${accentColor}`;
        assert.ok(contrast(colors.accent, colors.paper ?? "#ffffff") >= 4.5, `${label} accent`);
        if (colors.banner) assert.ok(contrast(colors.banner.ink, colors.banner.bg) >= 4.5, `${label} banner`);
        if (colors.banner?.muted) assert.ok(contrast(colors.banner.muted, colors.banner.bg) >= 3, `${label} banner muted`);
        if (side?.bg && side.ink) assert.ok(contrast(side.ink, side.bg) >= 4.5, `${label} side`);
        if (side?.bg && side.accent) assert.ok(contrast(side.accent, side.bg) >= 3, `${label} side accent`);
      }
    }
  });

  it("recolors every template", () => {
    for (const { slug, design } of designed) assert.notDeepEqual(customizeDesign(design!, { accentColor: "#881337" }), design, slug);
  });

  it("leaves a color that is already readable alone", () => {
    assert.equal(readableOn("#1f3a5f", "#ffffff"), "#1f3a5f");
  });
});

describe("customizationVars", () => {
  it("sets nothing when nothing is chosen", () => {
    assert.deepEqual(customizationVars({}), {});
  });

  it("offers every font", () => {
    for (const fontFamily of RESUME_FONTS) assert.match(String(customizationVars({ fontFamily })["--resume-font"]), /var\(--font-/);
  });
});

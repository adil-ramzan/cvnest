import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TEMPLATE_COUNT, TEMPLATE_COUNT_LABEL } from "@/data/template-count";
import { templateCategories, templates } from "@/data/templates";

describe("TEMPLATE_COUNT", () => {
  it("counts unique templates", () => {
    assert.equal(TEMPLATE_COUNT, new Set(templates.map((t) => t.slug)).size);
  });

  it("keeps the public label true", () => {
    assert.ok(TEMPLATE_COUNT >= parseInt(TEMPLATE_COUNT_LABEL, 10));
  });

  it("matches the category counts, so chips can't contradict the headline", () => {
    const total = templateCategories.reduce((sum, c) => sum + templates.filter((t) => t.category === c.id).length, 0);
    assert.equal(total, TEMPLATE_COUNT);
  });
});

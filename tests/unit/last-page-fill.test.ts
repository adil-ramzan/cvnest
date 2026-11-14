import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentFill, FEW_LINES_FILL } from "@/components/resume/paginate";

// Audit T-05: the "only a few lines" warning measures the last page's content area, not the
// page from its edge, so the same few lines count the same in every template.
// Bottoms below are the last line's bottom on the last page, in CSS pixels from the page top,
// taken from the audit's exported Letter PDFs (1056px tall).
const letter = (inset: number) => ({ height: 1056, inset, gecko: false });

describe("last page fill", () => {
  it("leaves the top and bottom page margins out", () => {
    assert.equal(contentFill(48, letter(48)), 0);
    assert.equal(contentFill(1008, letter(48)), 1);
  });

  it("counts a 3-line last page as a few lines in Mural and Ambassador", () => {
    assert.ok(contentFill(148, letter(48)) <= FEW_LINES_FILL, "Mural, edge data: 3 lines ending at 148px");
    assert.ok(contentFill(135, letter(56)) <= FEW_LINES_FILL, "Ambassador, edge data: 3 lines ending at 135px");
  });

  it("still counts one line as a few lines", () => {
    assert.ok(contentFill(66, letter(48)) <= FEW_LINES_FILL);
  });

  it("doesn't count six lines or more", () => {
    assert.ok(contentFill(201, letter(56)) > FEW_LINES_FILL, "Steward, edge data: 6 lines ending at 201px");
    assert.ok(contentFill(210, letter(36)) > FEW_LINES_FILL, "Cornerstone-like compact page with 6 lines");
  });

  it("measures Firefox's columns, which hold only the content area, from the top", () => {
    assert.equal(contentFill(0, { height: 1056, inset: 48, gecko: true }), 0);
    assert.ok(contentFill(100, { height: 1056, inset: 48, gecko: true }) <= FEW_LINES_FILL);
  });
});

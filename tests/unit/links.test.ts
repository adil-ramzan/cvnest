import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareResume } from "@/components/resume/prepareResume";
import { safeHref } from "@/lib/links";
import { type IdContext, sanitizeResume } from "@/lib/resume-schema";

describe("safeHref", () => {
  it("keeps https, http and mailto", () => {
    assert.equal(safeHref("https://example.com/a?b=1"), "https://example.com/a?b=1");
    assert.equal(safeHref("http://example.com"), "http://example.com/");
    assert.equal(safeHref("mailto:ada@example.com"), "mailto:ada@example.com");
  });

  it("normalizes bare domains and emails", () => {
    assert.equal(safeHref("linkedin.com/in/ada"), "https://linkedin.com/in/ada");
    assert.equal(safeHref("  example.co.uk  "), "https://example.co.uk");
    assert.equal(safeHref("example.com:8080/x"), "https://example.com:8080/x");
    assert.equal(safeHref("ada@example.com"), "mailto:ada@example.com");
  });

  it("refuses everything else", () => {
    const bad = ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\tscript:alert(1)", "java\nscript:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "file:///etc/passwd", "tel:+1555", "ftp://example.com", "//example.com", "<script>", "https://", "Seattle, WA", "(555) 123-4567", "+1 555 0100", "", undefined];
    for (const value of bad) assert.equal(safeHref(value), null, String(value));
  });
});

describe("pasted bullets", () => {
  const ctx = (): IdContext => ({ seen: new Set(), makeId: () => crypto.randomUUID() });
  const bullets = (highlights: string[]) => {
    const resume = sanitizeResume({ id: "r", name: "A", sections: [{ id: "s", type: "experience", title: "E", visible: true, entries: [{ id: "e", role: "R", company: "", highlights }] }] }, ctx())!;
    const section = prepareResume(resume).sections[0];
    return section.kind === "entries" ? section.entries[0].bullets : [];
  };

  it("removes leading markers from pasted lines", () => {
    assert.deepEqual(bullets(["• One", "•Two", "- Three", "* Four", "  ◦ Five"]), ["One", "Two", "Three", "Four", "Five"]);
  });

  it("keeps text that only looks similar", () => {
    assert.deepEqual(bullets(["-5% churn", "*Starred", "Well-known"]), ["-5% churn", "*Starred", "Well-known"]);
  });

  it("drops lines that were only a marker", () => {
    assert.deepEqual(bullets(["•", "- ", "Real"]), ["Real"]);
  });
});

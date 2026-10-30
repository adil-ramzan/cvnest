import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Resume } from "@/data/resume";
import { createResume } from "@/lib/resumes";
import { sanitizeResume } from "@/lib/resume-schema";
import { internalDestination, isAtRisk, promptBeforeUnload } from "@/lib/unsaved";

const withContent = (extra: Partial<Resume> = {}): Resume => {
  const resume = createResume();
  return { ...resume, profile: { ...resume.profile, fullName: "Ada" }, updatedAt: 100, ...extra };
};

describe("isAtRisk", () => {
  it("never applies without a resume or to an empty one", () => {
    assert.equal(isAtRisk(null, "error"), false);
    assert.equal(isAtRisk(createResume(), "error"), false);
  });

  it("applies to content that has never been copied", () => {
    assert.equal(isAtRisk(withContent(), "saved"), true);
  });

  it("does not apply when nothing changed since a backup or PDF", () => {
    assert.equal(isAtRisk(withContent({ lastBackupAt: 100 }), "saved"), false);
    assert.equal(isAtRisk(withContent({ lastExportAt: 150 }), "saved"), false);
  });

  it("applies again after the next edit", () => {
    assert.equal(isAtRisk(withContent({ lastBackupAt: 90 }), "saved"), true);
  });

  it("applies whenever saving is pending or failing, even with a recent copy", () => {
    for (const status of ["saving", "error", "unavailable", "blocked"] as const) {
      assert.equal(isAtRisk(withContent({ lastBackupAt: 200 }), status), true, status);
    }
  });
});

describe("copy timestamps", () => {
  const ids = () => ({ seen: new Set<string>(), makeId: () => "id" });

  it("stay absent on resumes saved before they existed", () => {
    const resume = sanitizeResume({ id: "r", name: "Old" }, ids())!;
    assert.equal("lastBackupAt" in resume, false);
    assert.equal("lastExportAt" in resume, false);
  });

  it("survive a save and load, and ignore bad values", () => {
    const resume = sanitizeResume({ id: "r", name: "A", lastBackupAt: 5, lastExportAt: "soon" }, ids())!;
    assert.equal(resume.lastBackupAt, 5);
    assert.equal("lastExportAt" in resume, false);
  });
});

describe("internalDestination", () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  const link = (href: string, target = "", download = false) => ({ href, target, hasAttribute: (name: string) => name === "download" && download });
  const here = "https://site.test/editor";

  it("catches plain clicks on in-app links", () => {
    assert.equal(internalDestination(click, link("https://site.test/templates?category=photo"), here), "/templates?category=photo");
  });

  it("leaves modified and non-primary clicks alone", () => {
    for (const change of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      assert.equal(internalDestination({ ...click, ...change }, link("https://site.test/"), here), null);
    }
  });

  it("leaves new-tab, download, external and same-page links alone", () => {
    assert.equal(internalDestination(click, link("https://site.test/", "_blank"), here), null);
    assert.equal(internalDestination(click, link("https://site.test/a.json", "", true), here), null);
    assert.equal(internalDestination(click, link("https://other.test/"), here), null);
    assert.equal(internalDestination(click, link("https://site.test/editor#top"), here), null);
  });
});

describe("promptBeforeUnload", () => {
  it("does what browsers require to show their prompt", () => {
    let prevented = false;
    const event = { preventDefault: () => (prevented = true), returnValue: true } as unknown as BeforeUnloadEvent;
    promptBeforeUnload(event);
    assert.equal(prevented, true);
    assert.equal(event.returnValue, "");
  });
});

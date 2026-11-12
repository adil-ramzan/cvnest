import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { isQuotaError, loadResumes, loadSettings, parseResumes, photoIdsInStoredText, saveResumes, writeResumes } from "@/lib/resume-storage";
import { createResume } from "@/lib/resumes";

/** Minimal in-memory localStorage. `failWrites` blocks all writes; `failKeys` rejects writes to specific keys (e.g. quota exceeded). */
class MemoryStorage {
  data = new Map<string, string>();
  failWrites = false;
  failKeys = new Set<string>();
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites || this.failKeys.has(key)) throw new Error("QuotaExceededError");
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  Object.assign(globalThis, { window: { localStorage: storage } });
});

const legacy = JSON.stringify({
  version: 1,
  resumes: [{ id: "a", name: "First", template: "modern", createdAt: 1, updatedAt: 2, data: { name: "Ada", skills: ["Go"] } }],
});

describe("loadResumes: migrating v1 data", () => {
  it("migrates, writes the v2 key and leaves the original untouched as a backup", () => {
    storage.setItem("folio.resumes", legacy);
    const result = loadResumes();
    assert.equal(result.migratedFrom, 1);
    assert.equal(result.persisted, true);
    assert.equal(result.resumes[0].id, "a");
    assert.equal(result.resumes[0].design.templateId, "modern");
    assert.equal(storage.getItem("folio.resumes"), legacy);
    const stored = JSON.parse(storage.getItem("folio.resumes.v2")!);
    assert.equal(stored.schemaVersion, 2);
    assert.equal(stored.resumes[0].profile.fullName, "Ada");
    assert.equal(JSON.parse(storage.getItem("folio.migrations")!).length, 1);
  });

  it("never migrates twice", () => {
    storage.setItem("folio.resumes", legacy);
    loadResumes();
    storage.setItem("folio.resumes", JSON.stringify({ version: 1, resumes: [] }));
    const again = loadResumes();
    assert.equal(again.migratedFrom, null);
    assert.equal(again.resumes.length, 1);
    assert.equal(JSON.parse(storage.getItem("folio.migrations")!).length, 1);
  });

  it("does not create the v2 key when nothing could be migrated", () => {
    storage.setItem("folio.resumes", "{broken");
    const result = loadResumes();
    assert.equal(result.recovered, true);
    assert.equal(storage.getItem("folio.resumes.v2"), null);
  });

  it("keeps migrated data in memory and leaves no partial v2 data when the write fails", () => {
    storage.setItem("folio.resumes", legacy);
    storage.failKeys.add("folio.resumes.v2");
    const result = loadResumes();
    assert.equal(result.persisted, false);
    assert.equal(result.resumes.length, 1);
    assert.equal(storage.getItem("folio.resumes.v2"), null);
  });
});

describe("loadResumes: damaged or partial current data", () => {
  it("backs up unreadable data and reports recovery", () => {
    storage.setItem("folio.resumes.v2", "{not json");
    const result = loadResumes();
    assert.equal(result.recovered, true);
    assert.deepEqual(result.resumes, []);
    assert.equal(storage.getItem("folio.resumes.v2.unreadable-backup"), "{not json");
  });

  it("keeps valid resumes and skips invalid ones", () => {
    const good = { ...createResume("classic"), id: "good" };
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [good, "junk", null] }));
    const result = loadResumes();
    assert.equal(result.recovered, true);
    assert.deepEqual(result.resumes.map((r) => r.id), ["good"]);
  });

  it("flags data from a newer version so it is never overwritten", () => {
    const good = { ...createResume("classic"), id: "good" };
    const raw = JSON.stringify({ schemaVersion: 2, resumes: [good, { schemaVersion: 99 }] });
    storage.setItem("folio.resumes.v2", raw);
    const result = loadResumes();
    assert.equal(result.newerData, true);
    assert.deepEqual(result.resumes.map((r) => r.id), ["good"]);
    assert.equal(storage.getItem("folio.resumes.v2"), raw);
  });

  it("falls back to the default template when a stored template no longer exists", () => {
    const resume = { ...createResume(), design: { templateId: "retired", pageSize: "letter" } };
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [resume] }));
    assert.equal(loadResumes().resumes[0].design.templateId, "professional");
  });

  it("upgrades older resumes stored in the current key after backing them up", () => {
    const raw = JSON.stringify({ schemaVersion: 2, resumes: [{ id: "old", data: { name: "Old" } }] });
    storage.setItem("folio.resumes.v2", raw);
    const result = loadResumes();
    assert.equal(result.migratedFrom, 1);
    assert.equal(storage.getItem("folio.resumes.backup-v1"), raw);
    assert.equal(JSON.parse(storage.getItem("folio.resumes.v2")!).resumes[0].schemaVersion, 2);
  });

  it("reports storage as unavailable when it can't be written", () => {
    storage.failWrites = true;
    assert.equal(loadResumes().available, false);
  });
});

describe("loadResumes: unreadable data that can't be copied", () => {
  const UNREADABLE = "folio.resumes.v2.unreadable-backup";
  const good = () => ({ ...createResume("classic"), id: "good" });

  it("says so when the copy of unreadable data can't be written, and leaves the original untouched", () => {
    const raw = JSON.stringify({ schemaVersion: 2, resumes: [good(), "junk"] });
    storage.setItem("folio.resumes.v2", raw);
    storage.failKeys.add(UNREADABLE);
    const result = loadResumes();
    assert.equal(result.recovered, true);
    assert.equal(result.unreadableNotCopied, true);
    assert.deepEqual(result.resumes.map((r) => r.id), ["good"]);
    assert.equal(storage.getItem("folio.resumes.v2"), raw);
    assert.equal(storage.getItem(UNREADABLE), null);
  });

  it("also flags data that is unreadable as a whole", () => {
    storage.setItem("folio.resumes.v2", "{not json");
    storage.failKeys.add(UNREADABLE);
    const result = loadResumes();
    assert.equal(result.unreadableNotCopied, true);
    assert.equal(storage.getItem("folio.resumes.v2"), "{not json");
  });

  it("doesn't flag anything when the copy was kept, or when nothing was unreadable", () => {
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [good(), "junk"] }));
    assert.equal(loadResumes().unreadableNotCopied, undefined);
    storage.clear();
    storage.failKeys.add(UNREADABLE);
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [good()] }));
    const clean = loadResumes();
    assert.equal(clean.recovered, false);
    assert.equal(clean.unreadableNotCopied, undefined);
  });

  it("leaves the result shape unchanged for ordinary data", () => {
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [good()] }));
    assert.equal("unreadableNotCopied" in loadResumes(), false);
  });

  it("leaves the in-place upgrade path as it was: its own backup keeps the original text", () => {
    const raw = JSON.stringify({ schemaVersion: 2, resumes: [{ id: "old", data: { name: "Old" } }, "junk"] });
    storage.failKeys.add(UNREADABLE);
    storage.setItem("folio.resumes.v2", raw);
    const result = loadResumes();
    assert.equal(result.migratedFrom, 1);
    assert.equal(result.persisted, true);
    assert.equal("unreadableNotCopied" in result, false);
    assert.equal(storage.getItem("folio.resumes.backup-v1"), raw);
  });
});

describe("saving and settings", () => {
  it("returns false instead of throwing when a save fails", () => {
    storage.failWrites = true;
    assert.equal(saveResumes([createResume()]), false);
  });

  it("round-trips saved resumes through parseResumes", () => {
    const resume = createResume("minimal", "a4");
    assert.equal(saveResumes([resume]), true);
    assert.deepEqual(parseResumes(storage.getItem("folio.resumes.v2")).resumes, [resume]);
  });

  it("ignores invalid editor settings", () => {
    storage.setItem("folio.editor-settings", JSON.stringify({ activeResumeId: 5, zoom: 40 }));
    assert.deepEqual(loadSettings(), { activeResumeId: null, zoom: "fit" });
    storage.setItem("folio.editor-settings", "{bad");
    assert.deepEqual(loadSettings(), { activeResumeId: null, zoom: "fit" });
  });
});

describe("photoIdsInStoredText: photos that cleanup must keep", () => {
  it("finds photo ids in readable, unreadable and damaged stored text", () => {
    const withPhoto = (id: string, photoId: string) => ({ ...createResume(), id, profile: { fullName: "", jobTitle: "", email: "", phone: "", location: "", photo: { id: photoId, mimeType: "image/jpeg", width: 1, height: 1, byteSize: 1, updatedAt: 1 } } });
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [withPhoto("a", "readable"), { broken: true, profile: { photo: { id: "in-junk-item" } } }] }));
    storage.setItem("folio.resumes.v2.unreadable-backup", `{"resumes":[{"profile":{"photo":{"mimeType":"image/jpeg","id":"in-copy"}}}, {not json`);
    assert.deepEqual(photoIdsInStoredText()!.sort(), ["in-copy", "in-junk-item", "readable"]);
  });

  it("returns an empty list when nothing is stored, and null when storage can't be read", () => {
    assert.deepEqual(photoIdsInStoredText(), []);
    Object.assign(globalThis, { window: {} });
    assert.equal(photoIdsInStoredText(), null);
  });
});

describe("writeResumes: why a write failed", () => {
  it("reports a full storage area as quota, and anything else as refused", () => {
    storage.failKeys.add("folio.resumes.v2");
    const quota = new DOMException("full", "QuotaExceededError");
    const original = storage.setItem.bind(storage);
    storage.setItem = () => {
      throw quota;
    };
    assert.deepEqual(writeResumes([createResume()]), { ok: false, reason: "quota" });
    storage.setItem = () => {
      throw new DOMException("denied", "SecurityError");
    };
    assert.deepEqual(writeResumes([createResume()]), { ok: false, reason: "refused" });
    storage.setItem = original;
    storage.failKeys.clear();
    assert.deepEqual(writeResumes([createResume()]), { ok: true });
  });

  it("recognises the older Firefox name for a full storage area", () => {
    assert.equal(isQuotaError(new DOMException("full", "NS_ERROR_DOM_QUOTA_REACHED")), true);
    assert.equal(isQuotaError(new Error("QuotaExceededError")), false);
  });
});

describe("loadResumes: storage that can't be written", () => {
  const raw = () => JSON.stringify({ schemaVersion: 2, resumes: [{ ...createResume("classic"), id: "kept" }] });
  const refuseProbe = (error: unknown) => {
    const original = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      if (key === "folio.probe") throw error;
      original(key, value);
    };
  };

  it("full: says so and still reads the saved resumes, writing nothing", () => {
    storage.data.set("folio.resumes.v2", raw());
    refuseProbe(new DOMException("full", "QuotaExceededError"));
    const before = [...storage.data.entries()];
    const result = loadResumes();
    assert.equal(result.available, false);
    assert.equal(result.unavailableReason, "full");
    assert.deepEqual(result.resumes.map((r) => r.id), ["kept"]);
    assert.deepEqual([...storage.data.entries()], before, "nothing written or removed");
  });

  it("blocked: anything that isn't a full storage area", () => {
    storage.data.set("folio.resumes.v2", raw());
    refuseProbe(new DOMException("denied", "SecurityError"));
    const result = loadResumes();
    assert.equal(result.unavailableReason, "blocked");
    assert.equal(result.available, false);
  });

  it("blocked and unreadable: no resumes, no error", () => {
    Object.assign(globalThis, { window: {} });
    const result = loadResumes();
    assert.equal(result.available, false);
    assert.equal(result.unavailableReason, "blocked");
    assert.deepEqual(result.resumes, []);
  });
});

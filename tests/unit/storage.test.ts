import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { loadResumes, loadSettings, parseResumes, saveResumes } from "@/lib/resume-storage";
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
    storage.setItem("folio.resumes.v2", JSON.stringify({ schemaVersion: 2, resumes: [good, "junk", null, { schemaVersion: 99 }] }));
    const result = loadResumes();
    assert.equal(result.recovered, true);
    assert.deepEqual(result.resumes.map((r) => r.id), ["good"]);
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

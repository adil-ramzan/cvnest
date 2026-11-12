import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESUME_SCHEMA_VERSION } from "@/data/resume";
import { BACKUP_KIND, createBackup, createNewerVersionBackup, readBackup } from "@/lib/backup";
import { createResume } from "@/lib/resumes";

describe("backup files from data-safety states", () => {
  it("a backup file can carry the stored text exactly, and still restores", async () => {
    const storedText = `{"schemaVersion":2,"resumes":[{"id":"a"},"unreadable \\u2028 item",5]}`;
    const text = await createBackup([{ ...createResume("classic"), id: "a", name: "Kept" }], { storedText });
    const file = JSON.parse(text);
    assert.equal(file.kind, BACKUP_KIND);
    assert.equal(file.storedText, storedText, "byte for byte after a JSON round trip");
    const result = readBackup(text);
    assert.ok(result.ok);
    assert.deepEqual(result.resumes.map((r) => r.name), ["Kept"]);
  });

  it("an ordinary backup has no storedText field", async () => {
    assert.equal("storedText" in JSON.parse(await createBackup([createResume()])), false);
  });

  it("newer-version data: keeps its resumes and version, and this version refuses it with the reason", () => {
    const storedText = JSON.stringify({ schemaVersion: RESUME_SCHEMA_VERSION + 1, resumes: [{ id: "n", schemaVersion: RESUME_SCHEMA_VERSION + 1, future: 1 }] });
    const text = createNewerVersionBackup(storedText);
    const file = JSON.parse(text);
    assert.equal(file.kind, BACKUP_KIND);
    assert.equal(file.schemaVersion, RESUME_SCHEMA_VERSION + 1);
    assert.deepEqual(file.resumes, [{ id: "n", schemaVersion: RESUME_SCHEMA_VERSION + 1, future: 1 }]);
    assert.equal(file.storedText, storedText);
    const result = readBackup(text);
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.message.includes("newer version"));
  });

  it("newer-version data that can't be parsed is still kept whole", () => {
    const file = JSON.parse(createNewerVersionBackup("{broken"));
    assert.equal(file.storedText, "{broken");
    assert.deepEqual(file.resumes, []);
    assert.ok(file.schemaVersion > RESUME_SCHEMA_VERSION);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Resume } from "@/data/resume";
import { commitRestore, NO_ROOM_MESSAGE, type RestoreDeps, undoReplace } from "@/lib/restore";
import { createResume } from "@/lib/resumes";
import type { Snapshot } from "@/lib/snapshot-store";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

const resume = (id: string, name: string, photo?: { id: string; inline?: boolean }): Resume => {
  const base = { ...createResume("classic"), id, name };
  if (!photo) return base;
  return {
    ...base,
    profile: {
      ...base.profile,
      fullName: name,
      photo: { id: photo.id, mimeType: "image/jpeg", width: 1, height: 1, byteSize: 1, updatedAt: 1, ...(photo.inline ? { inlineData: PHOTO } : {}) },
    },
  };
};

/** In-memory stand-ins for IndexedDB photos, the snapshot store and the localStorage commit. */
function fakeStorage({ photosFail = false, writeFails = false, snapshotFails = false, existingPhotos = [] as string[] } = {}) {
  const photos = new Set(existingPhotos);
  let snapshot: Snapshot | null = null;
  const writes: Resume[][] = [];
  const deps: RestoreDeps = {
    listPhotoIds: async () => {
      if (photosFail) throw new Error("IndexedDB unavailable");
      return new Set(photos);
    },
    savePhoto: async (id) => {
      if (photosFail) throw new Error("IndexedDB unavailable");
      photos.add(id);
    },
    deletePhoto: async (id) => {
      photos.delete(id);
    },
    readSnapshot: async () => snapshot,
    saveSnapshot: async (resumes, createdAt) => {
      if (snapshotFails) throw new Error("IndexedDB unavailable");
      snapshot = { key: "folio.resumes.pre-restore", createdAt, resumes };
    },
    writeSnapshot: async (value) => {
      snapshot = value;
    },
    writeResumes: (resumes) => {
      if (writeFails) return false;
      writes.push(resumes);
      return true;
    },
    now: () => 1000,
  };
  return { deps, photos, writes, getSnapshot: () => snapshot, setSnapshot: (value: Snapshot | null) => (snapshot = value) };
}

describe("commitRestore", () => {
  it("merges: writes current plus restored in one write, with fresh ids and lastBackupAt", async () => {
    const store = fakeStorage();
    const current = [resume("a", "Mine")];
    const outcome = await commitRestore(current, [resume("b", "Backup")], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.equal(store.writes.length, 1);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Mine", "Backup"]);
    assert.notEqual(outcome.resumes[1].id, "b");
    assert.equal(outcome.resumes[1].lastBackupAt, 1000);
    assert.deepEqual(outcome.restoredIds, [outcome.resumes[1].id]);
    assert.equal(outcome.undoAvailable, false);
    assert.equal(store.getSnapshot(), null, "merge never touches the snapshot");
  });

  it("moves inline photos into IndexedDB before the write, so the list holds none", async () => {
    const store = fakeStorage();
    const outcome = await commitRestore([], [resume("b", "One", { id: "p1", inline: true }), resume("c", "Two", { id: "p2", inline: true })], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.deepEqual([...store.photos].sort(), ["p1", "p2"]);
    assert.ok(store.writes[0].every((r) => r.profile.photo && !r.profile.photo.inlineData));
    assert.deepEqual(store.writes[0].map((r) => r.profile.photo?.id), ["p1", "p2"]);
  });

  it("restoring the same backup twice leaves no inline photo either time", async () => {
    const store = fakeStorage();
    const backup = [resume("b", "One", { id: "p1", inline: true })];
    const first = await commitRestore([], backup, "merge", store.deps);
    assert.ok(first.ok);
    const second = await commitRestore(first.resumes, backup, "merge", store.deps);
    assert.ok(second.ok);
    assert.equal(second.resumes.length, 2);
    assert.ok(store.writes[1].every((r) => !r.profile.photo?.inlineData));
  });

  it("keeps photos inline when IndexedDB is unavailable, and still writes", async () => {
    const store = fakeStorage({ photosFail: true });
    const outcome = await commitRestore([], [resume("b", "One", { id: "p1", inline: true })], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.equal(store.writes[0][0].profile.photo?.inlineData, PHOTO);
  });

  it("changes nothing when the write fails: new photos removed, existing photos kept", async () => {
    const store = fakeStorage({ writeFails: true, existingPhotos: ["shared"] });
    const outcome = await commitRestore(
      [resume("a", "Mine", { id: "shared" })],
      [resume("b", "New", { id: "fresh", inline: true }), resume("c", "Same photo", { id: "shared", inline: true })],
      "merge",
      store.deps,
    );
    assert.deepEqual(outcome, { ok: false, message: NO_ROOM_MESSAGE });
    assert.deepEqual([...store.photos], ["shared"], "only the photo this attempt added is removed");
  });

  it("replace: snapshots the current list first and offers undo", async () => {
    const store = fakeStorage();
    const current = [resume("a", "Mine"), resume("x", "Other")];
    const outcome = await commitRestore(current, [resume("b", "Backup")], "replace", store.deps);
    assert.ok(outcome.ok);
    assert.equal(outcome.undoAvailable, true);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Backup"]);
    assert.deepEqual(store.getSnapshot()?.resumes.map((r) => r.name), ["Mine", "Other"]);
    assert.equal(store.getSnapshot()?.createdAt, 1000);
  });

  it("replace that fails puts the previous snapshot back", async () => {
    const store = fakeStorage({ writeFails: true });
    const older: Snapshot = { key: "folio.resumes.pre-restore", createdAt: 5, resumes: [resume("old", "Older")] };
    store.setSnapshot(older);
    const outcome = await commitRestore([resume("a", "Mine")], [resume("b", "Backup")], "replace", store.deps);
    assert.equal(outcome.ok, false);
    assert.equal(store.getSnapshot(), older);
  });

  it("replace still goes ahead without undo when the snapshot can't be saved", async () => {
    const store = fakeStorage({ snapshotFails: true });
    const outcome = await commitRestore([resume("a", "Mine")], [resume("b", "Backup")], "replace", store.deps);
    assert.ok(outcome.ok);
    assert.equal(outcome.undoAvailable, false);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Backup"]);
  });
});

describe("undoReplace", () => {
  it("writes the snapshot back and only then removes it", async () => {
    const store = fakeStorage();
    await commitRestore([resume("a", "Mine")], [resume("b", "Backup")], "replace", store.deps);
    const outcome = await undoReplace(store.deps);
    assert.ok(outcome.ok);
    assert.deepEqual(outcome.resumes.map((r) => r.name), ["Mine"]);
    assert.deepEqual(store.writes.at(-1)?.map((r) => r.name), ["Mine"]);
    assert.equal(store.getSnapshot(), null);
  });

  it("keeps the snapshot when the write fails", async () => {
    const store = fakeStorage();
    await commitRestore([resume("a", "Mine")], [resume("b", "Backup")], "replace", store.deps);
    const failing = { ...store.deps, writeResumes: () => false };
    const outcome = await undoReplace(failing);
    assert.equal(outcome.ok, false);
    assert.ok(store.getSnapshot());
  });

  it("says so when there is nothing to put back", async () => {
    const outcome = await undoReplace(fakeStorage().deps);
    assert.equal(outcome.ok, false);
  });
});

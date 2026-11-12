import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Resume } from "@/data/resume";
import { commitRestore, EXPIRED_MESSAGE, NO_ROOM_MESSAGE, REFUSED_MESSAGE, type RestoreDeps, undoReplace } from "@/lib/restore";
import type { WriteResult } from "@/lib/resume-storage";
import { createResume } from "@/lib/resumes";
import { isSnapshotUndoable, type Snapshot, SNAPSHOT_MAX_AGE_MS } from "@/lib/snapshot-store";

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const DAY = 24 * 60 * 60 * 1000;

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
const list = (...items: Resume[]) => () => items;

/** In-memory stand-ins for IndexedDB photos, the snapshot store and the localStorage commit. */
function fakeStorage({ photosFail = false, write = { ok: true } as WriteResult, snapshotFails = false, existingPhotos = [] as string[], now = 1000 } = {}) {
  const photos = new Map(existingPhotos.map((id) => [id, "original bytes"]));
  const saved: string[] = [];
  let snapshot: Snapshot | null = null;
  const writes: Resume[][] = [];
  let clock = now;
  const deps: RestoreDeps = {
    listPhotoIds: async () => {
      if (photosFail) throw new Error("IndexedDB unavailable");
      return new Set(photos.keys());
    },
    savePhoto: async (id) => {
      if (photosFail) throw new Error("IndexedDB unavailable");
      saved.push(id);
      photos.set(id, "backup bytes");
    },
    deletePhoto: async (id) => {
      photos.delete(id);
    },
    readSnapshot: async () => snapshot,
    saveSnapshot: async (resumes, createdAt, restoredIds) => {
      if (snapshotFails) throw new Error("IndexedDB unavailable");
      snapshot = { key: "folio.resumes.pre-restore", createdAt, resumes, restoredIds };
    },
    writeSnapshot: async (value) => {
      snapshot = value;
    },
    writeResumes: (resumes) => {
      if (write.ok) writes.push(resumes);
      return write;
    },
    now: () => clock,
  };
  return {
    deps,
    photos,
    saved,
    writes,
    getSnapshot: () => snapshot,
    setSnapshot: (value: Snapshot | null) => (snapshot = value),
    setClock: (value: number) => (clock = value),
  };
}

describe("commitRestore", () => {
  it("merges: writes current plus restored in one write, with fresh ids and lastBackupAt", async () => {
    const store = fakeStorage();
    const outcome = await commitRestore(list(resume("a", "Mine")), [resume("b", "Backup")], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.equal(store.writes.length, 1);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Mine", "Backup"]);
    assert.notEqual(outcome.resumes[1].id, "b");
    assert.equal(outcome.resumes[1].lastBackupAt, 1000);
    assert.deepEqual(outcome.restoredIds, [outcome.resumes[1].id]);
    assert.equal(outcome.undoAvailable, false);
    assert.equal(store.getSnapshot(), null, "merge never touches the snapshot");
  });

  it("builds the list from the latest state at commit time, so edits made meanwhile are kept", async () => {
    const store = fakeStorage();
    let current = [resume("a", "Before edit")];
    const slowSave = store.deps.savePhoto;
    // The person edits while the photo is being stored.
    store.deps.savePhoto = async (id, blob) => {
      current = [resume("a", "Edited meanwhile"), resume("n", "Added meanwhile")];
      await slowSave(id, blob);
    };
    const outcome = await commitRestore(() => current, [resume("b", "Backup", { id: "p", inline: true })], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Edited meanwhile", "Added meanwhile", "Backup"]);
  });

  it("replace: the snapshot also holds the latest state, not the state at the start", async () => {
    const store = fakeStorage();
    let current = [resume("a", "Before edit")];
    const slowList = store.deps.listPhotoIds;
    store.deps.listPhotoIds = async () => {
      current = [resume("a", "Edited meanwhile")];
      return slowList();
    };
    await commitRestore(() => current, [resume("b", "Backup")], "replace", store.deps);
    assert.deepEqual(store.getSnapshot()?.resumes.map((r) => r.name), ["Edited meanwhile"]);
  });

  it("moves inline photos into IndexedDB before the write, so the list holds none", async () => {
    const store = fakeStorage();
    const outcome = await commitRestore(list(), [resume("b", "One", { id: "p1", inline: true }), resume("c", "Two", { id: "p2", inline: true })], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.deepEqual([...store.photos.keys()].sort(), ["p1", "p2"]);
    assert.ok(store.writes[0].every((r) => r.profile.photo && !r.profile.photo.inlineData));
    assert.deepEqual(store.writes[0].map((r) => r.profile.photo?.id), ["p1", "p2"]);
  });

  it("never rewrites a photo that is already stored under the same id", async () => {
    const store = fakeStorage({ existingPhotos: ["shared"] });
    const outcome = await commitRestore(list(), [resume("b", "Same photo", { id: "shared", inline: true })], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.deepEqual(store.saved, [], "no write for an existing id");
    assert.equal(store.photos.get("shared"), "original bytes");
    assert.equal(store.writes[0][0].profile.photo?.inlineData, undefined, "still referenced by id, not inline");
  });

  it("restoring the same backup twice leaves no inline photo either time", async () => {
    const store = fakeStorage();
    const backup = [resume("b", "One", { id: "p1", inline: true })];
    const first = await commitRestore(list(), backup, "merge", store.deps);
    assert.ok(first.ok);
    const second = await commitRestore(list(...first.resumes), backup, "merge", store.deps);
    assert.ok(second.ok);
    assert.equal(second.resumes.length, 2);
    assert.ok(store.writes[1].every((r) => !r.profile.photo?.inlineData));
  });

  it("keeps photos inline when IndexedDB is unavailable, and still writes", async () => {
    const store = fakeStorage({ photosFail: true });
    const outcome = await commitRestore(list(), [resume("b", "One", { id: "p1", inline: true })], "merge", store.deps);
    assert.ok(outcome.ok);
    assert.equal(store.writes[0][0].profile.photo?.inlineData, PHOTO);
  });

  it("changes nothing when storage is full: new photos removed, existing photos untouched", async () => {
    const store = fakeStorage({ write: { ok: false, reason: "quota" }, existingPhotos: ["shared"] });
    const outcome = await commitRestore(
      list(resume("a", "Mine", { id: "shared" })),
      [resume("b", "New", { id: "fresh", inline: true }), resume("c", "Same photo", { id: "shared", inline: true })],
      "merge",
      store.deps,
    );
    assert.deepEqual(outcome, { ok: false, message: NO_ROOM_MESSAGE });
    assert.deepEqual([...store.photos.entries()], [["shared", "original bytes"]], "only the photo this attempt added is removed; the existing one is unchanged");
  });

  it("says the browser refused, not that storage is full, for other failed writes", async () => {
    const store = fakeStorage({ write: { ok: false, reason: "refused" } });
    const outcome = await commitRestore(list(), [resume("b", "New")], "merge", store.deps);
    assert.deepEqual(outcome, { ok: false, message: REFUSED_MESSAGE });
  });

  it("replace: snapshots the current list first, with the restored ids, and offers undo", async () => {
    const store = fakeStorage();
    const outcome = await commitRestore(list(resume("a", "Mine"), resume("x", "Other")), [resume("b", "Backup")], "replace", store.deps);
    assert.ok(outcome.ok);
    assert.equal(outcome.undoAvailable, true);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Backup"]);
    assert.deepEqual(store.getSnapshot()?.resumes.map((r) => r.name), ["Mine", "Other"]);
    assert.equal(store.getSnapshot()?.createdAt, 1000);
    assert.deepEqual(store.getSnapshot()?.restoredIds, outcome.restoredIds);
  });

  it("replace that fails puts the previous snapshot back", async () => {
    const store = fakeStorage({ write: { ok: false, reason: "quota" } });
    const older: Snapshot = { key: "folio.resumes.pre-restore", createdAt: 5, resumes: [resume("old", "Older")] };
    store.setSnapshot(older);
    const outcome = await commitRestore(list(resume("a", "Mine")), [resume("b", "Backup")], "replace", store.deps);
    assert.equal(outcome.ok, false);
    assert.equal(store.getSnapshot(), older);
  });

  it("replace still goes ahead without undo when the snapshot can't be saved", async () => {
    const store = fakeStorage({ snapshotFails: true });
    const outcome = await commitRestore(list(resume("a", "Mine")), [resume("b", "Backup")], "replace", store.deps);
    assert.ok(outcome.ok);
    assert.equal(outcome.undoAvailable, false);
    assert.deepEqual(store.writes[0].map((r) => r.name), ["Backup"]);
  });
});

describe("undoReplace", () => {
  it("writes the snapshot back and only then removes it", async () => {
    const store = fakeStorage();
    await commitRestore(list(resume("a", "Mine")), [resume("b", "Backup")], "replace", store.deps);
    const outcome = await undoReplace(store.deps);
    assert.ok(outcome.ok);
    assert.deepEqual(outcome.resumes.map((r) => r.name), ["Mine"]);
    assert.deepEqual(store.writes.at(-1)?.map((r) => r.name), ["Mine"]);
    assert.equal(store.getSnapshot(), null);
  });

  it("keeps the snapshot when the write fails", async () => {
    const store = fakeStorage();
    await commitRestore(list(resume("a", "Mine")), [resume("b", "Backup")], "replace", store.deps);
    const outcome = await undoReplace({ ...store.deps, writeResumes: () => ({ ok: false, reason: "quota" }) });
    assert.equal(outcome.ok, false);
    assert.ok(store.getSnapshot());
  });

  it("works up to 7 days later and refuses afterwards, even in a tab left open (controllable clock)", async () => {
    const store = fakeStorage({ now: 1_000_000 });
    await commitRestore(list(resume("a", "Mine")), [resume("b", "Backup")], "replace", store.deps);

    store.setClock(1_000_000 + 6 * DAY);
    const stillOk = await undoReplace({ ...store.deps, writeResumes: () => ({ ok: false, reason: "quota" }) });
    assert.equal(stillOk.ok, false);
    assert.ok(store.getSnapshot(), "within 7 days the snapshot stays (the failure here is the write)");

    store.setClock(1_000_000 + SNAPSHOT_MAX_AGE_MS + 1);
    const writesBefore = store.writes.length;
    const expired = await undoReplace(store.deps);
    assert.deepEqual(expired, { ok: false, message: EXPIRED_MESSAGE });
    assert.equal(store.writes.length, writesBefore, "nothing is written after the window");
    assert.equal(store.getSnapshot(), null, "the expired snapshot is removed");
  });

  it("says so when there is nothing to put back", async () => {
    const outcome = await undoReplace(fakeStorage().deps);
    assert.deepEqual(outcome, { ok: false, message: EXPIRED_MESSAGE });
  });
});

describe("isSnapshotUndoable", () => {
  const snapshot = (createdAt: number, restoredIds?: string[]): Snapshot => ({ key: "folio.resumes.pre-restore", createdAt, resumes: [], restoredIds });
  const ids = new Set(["restored-1", "other"]);

  it("is undoable within 7 days when a restored resume is in the current list", () => {
    assert.equal(isSnapshotUndoable(snapshot(0, ["restored-1"]), 6 * DAY, ids), true);
    assert.equal(isSnapshotUndoable(snapshot(0, ["restored-1"]), SNAPSHOT_MAX_AGE_MS, ids), true);
  });

  it("expires after 7 days", () => {
    assert.equal(isSnapshotUndoable(snapshot(0, ["restored-1"]), SNAPSHOT_MAX_AGE_MS + 1, ids), false);
  });

  it("is never undoable when the restore wasn't committed (tab closed between snapshot and commit)", () => {
    assert.equal(isSnapshotUndoable(snapshot(0, ["never-written"]), DAY, ids), false);
    assert.equal(isSnapshotUndoable(snapshot(0, []), DAY, ids), false);
    assert.equal(isSnapshotUndoable(snapshot(0), DAY, ids), false, "snapshots without restored ids don't count");
  });

  it("rejects a snapshot dated in the future (clock moved back)", () => {
    assert.equal(isSnapshotUndoable(snapshot(10 * DAY, ["restored-1"]), DAY, ids), false);
  });
});

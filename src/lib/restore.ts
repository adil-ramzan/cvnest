/**
 * Restoring from a backup, all or nothing.
 *
 * Browser storage has no transaction spanning localStorage and IndexedDB, so the
 * restore is ordered around a single commit point: the one localStorage write of
 * the new resume list. Everything before it only adds data nobody refers to yet,
 * and is undone if the commit fails:
 *
 * 1. Photos held inline in the backup are written to IndexedDB, so the resume list
 *    stays small. Ids that weren't stored before are remembered.
 * 2. For "replace", the current list is saved as a snapshot so the restore can be
 *    undone. The previous snapshot is kept in memory in case the commit fails.
 * 3. Commit: the new list is written to localStorage in one write.
 *    If that fails, the new photos and the snapshot are removed again, the
 *    previous snapshot is put back, and nothing the person had has changed.
 *
 * Dependencies are passed in so this can be tested without a browser.
 */
import type { Resume } from "@/data/resume";
import { dataUrlToBlob } from "./photo-store";
import type { WriteResult } from "./resume-storage";
import { duplicateResume } from "./resumes";
import { SNAPSHOT_MAX_AGE_MS, type Snapshot } from "./snapshot-store";

export type RestoreMode = "merge" | "replace";

export type RestoreDeps = {
  listPhotoIds: () => Promise<Set<string>>;
  savePhoto: (id: string, blob: Blob) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  readSnapshot: () => Promise<Snapshot | null>;
  saveSnapshot: (resumes: Resume[], createdAt: number, restoredIds: string[]) => Promise<void>;
  writeSnapshot: (snapshot: Snapshot | null) => Promise<void>;
  /** The commit: writes the whole resume list in one write. */
  writeResumes: (resumes: Resume[]) => WriteResult;
  now?: () => number;
};

export type RestoreOutcome =
  | { ok: true; resumes: Resume[]; restoredIds: string[]; undoAvailable: boolean }
  | { ok: false; message: string };

export const NO_ROOM_MESSAGE =
  "There isn't enough room in this browser's storage to restore this backup. Nothing was changed. Try restoring fewer resumes, or delete some you no longer need first.";
export const REFUSED_MESSAGE =
  "Your browser refused to save the restored resumes, so nothing was changed. Check that this site is allowed to store data, then try again.";
export const EXPIRED_MESSAGE = "The resumes from before the restore are no longer available. They're kept for up to 7 days.";

const failureMessage = (result: WriteResult) => (!result.ok && result.reason === "quota" ? NO_ROOM_MESSAGE : REFUSED_MESSAGE);

/** Restored resumes get fresh ids so they can't clash; photo ids are kept, since the same id means the same photo. */
export function prepareRestored(incoming: Resume[], now: number): Resume[] {
  return incoming.map((resume) => ({ ...duplicateResume(resume, resume.name), lastBackupAt: now }));
}

/** Moves inline photos into IndexedDB. Returns the list without them, and the ids that are new. */
async function storeInlinePhotos(resumes: Resume[], deps: RestoreDeps) {
  let existing: Set<string> | null = null;
  try {
    existing = await deps.listPhotoIds();
  } catch {
    // IndexedDB unavailable: photos stay inline (the fallback the editor already uses).
    return { resumes, added: [] as string[] };
  }
  const added: string[] = [];
  const stored = new Set<string>();
  const out: Resume[] = [];
  for (const resume of resumes) {
    const photo = resume.profile.photo;
    if (!photo?.inlineData) {
      out.push(resume);
      continue;
    }
    // A photo already stored under this id is never rewritten, so a failed restore can't change it.
    // (Ids are made per upload, so the same id is the same photo.)
    if (!existing.has(photo.id) && !stored.has(photo.id)) {
      try {
        await deps.savePhoto(photo.id, dataUrlToBlob(photo.inlineData));
        stored.add(photo.id);
        added.push(photo.id);
      } catch {
        out.push(resume);
        continue;
      }
    }
    out.push({ ...resume, profile: { ...resume.profile, photo: { ...photo, inlineData: undefined } } });
  }
  return { resumes: out, added };
}

/**
 * `getCurrent` is read when it's needed, not once at the start: the person may still
 * edit while photos are being stored, and those edits must be part of what's written.
 */
export async function commitRestore(getCurrent: () => Resume[], incoming: Resume[], mode: RestoreMode, deps: RestoreDeps): Promise<RestoreOutcome> {
  const now = (deps.now ?? Date.now)();
  const prepared = prepareRestored(incoming, now);
  const restoredIds = prepared.map((r) => r.id);
  const { resumes: restored, added } = await storeInlinePhotos(prepared, deps);

  let previousSnapshot: Snapshot | null = null;
  let snapshotWritten = false;
  if (mode === "replace") {
    try {
      previousSnapshot = await deps.readSnapshot();
      await deps.saveSnapshot(getCurrent(), now, restoredIds);
      snapshotWritten = true;
    } catch {
      // Undo won't be offered, but the restore itself can still go ahead.
    }
  }

  // Built synchronously right before the write, from the latest list.
  const next = mode === "merge" ? [...getCurrent(), ...restored] : restored;
  const result = deps.writeResumes(next);
  if (result.ok) return { ok: true, resumes: next, restoredIds, undoAvailable: snapshotWritten };

  // The commit failed, so nothing refers to what was added: take it away again.
  await Promise.all(added.map((id) => deps.deletePhoto(id).catch(() => {})));
  if (snapshotWritten) await deps.writeSnapshot(previousSnapshot).catch(() => {});
  return { ok: false, message: failureMessage(result) };
}

/** Puts back the resumes a "replace" removed. Same single commit; the snapshot is removed only once it's back. */
export async function undoReplace(
  deps: Pick<RestoreDeps, "readSnapshot" | "writeSnapshot" | "writeResumes" | "now">,
): Promise<{ ok: true; resumes: Resume[] } | { ok: false; message: string }> {
  const snapshot = await deps.readSnapshot().catch(() => null);
  if (!snapshot) return { ok: false, message: EXPIRED_MESSAGE };
  // Checked here too, not only on load: a tab can stay open past the undo window.
  if ((deps.now ?? Date.now)() - snapshot.createdAt > SNAPSHOT_MAX_AGE_MS) {
    await deps.writeSnapshot(null).catch(() => {});
    return { ok: false, message: EXPIRED_MESSAGE };
  }
  const result = deps.writeResumes(snapshot.resumes);
  if (!result.ok) {
    return {
      ok: false,
      message: result.reason === "quota"
        ? "There isn't enough room in this browser's storage to put them back. Nothing was changed."
        : "Your browser refused to save them, so nothing was changed. Check that this site is allowed to store data, then try again.",
    };
  }
  await deps.writeSnapshot(null).catch(() => {});
  return { ok: true, resumes: snapshot.resumes };
}

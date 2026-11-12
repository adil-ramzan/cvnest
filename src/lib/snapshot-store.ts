/**
 * A copy of the resume list taken just before "Replace all my resumes", so that
 * restore can be undone. It lives in its own IndexedDB database, not in `folio`:
 * adding a store to `folio` would need a version upgrade, which tabs still open on
 * older code would block, and photo saving would fail until they closed. It is not
 * kept in localStorage because that would double the space resumes take there.
 *
 * Only one snapshot is kept. Its photos stay in the `folio` photo store, referenced
 * by id; photo cleanup keeps every id a snapshot refers to (see snapshotPhotoIds).
 * Like the rest of browser storage, it is local to this browser and never sent anywhere.
 */
import type { Resume } from "@/data/resume";

const DB_NAME = "folio-snapshots";
const DB_VERSION = 1;
const STORE = "snapshots";
export const PRE_RESTORE_KEY = "folio.resumes.pre-restore";
/** How long "undo replace" stays available. */
export const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type Snapshot = { key: string; createdAt: number; resumes: Resume[] };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => {
      // Let a future version upgrade this database instead of being blocked by this tab.
      request.result.onversionchange = () => {
        request.result.close();
        dbPromise = null;
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

const isSnapshot = (value: unknown): value is Snapshot =>
  typeof value === "object" && value !== null && Array.isArray((value as Snapshot).resumes) && typeof (value as Snapshot).createdAt === "number";

/** Resolves once the snapshot is durably written; rejects if it couldn't be. */
export async function saveSnapshot(resumes: Resume[], createdAt = Date.now()): Promise<void> {
  await run("readwrite", (store) => store.put({ key: PRE_RESTORE_KEY, createdAt, resumes } satisfies Snapshot));
}

/** The stored snapshot, whatever its age, or null. */
export async function readSnapshot(): Promise<Snapshot | null> {
  const value: unknown = await run("readonly", (store) => store.get(PRE_RESTORE_KEY));
  return isSnapshot(value) ? value : null;
}

/** Puts back a snapshot read earlier (or removes the slot if there was none). */
export async function writeSnapshot(snapshot: Snapshot | null): Promise<void> {
  if (snapshot) await run("readwrite", (store) => store.put(snapshot));
  else await deleteSnapshot();
}

export async function deleteSnapshot(): Promise<void> {
  await run("readwrite", (store) => store.delete(PRE_RESTORE_KEY));
}

/** The snapshot if it is still within the undo window. Older ones are removed. */
export async function loadUndoableSnapshot(now = Date.now()): Promise<Snapshot | null> {
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  if (now - snapshot.createdAt > SNAPSHOT_MAX_AGE_MS) {
    await deleteSnapshot().catch(() => {});
    return null;
  }
  return snapshot;
}

/**
 * Photo ids the snapshot refers to, so cleanup never removes them. Null when the
 * snapshot couldn't be read: the caller must then skip cleanup rather than guess.
 */
export async function snapshotPhotoIds(): Promise<string[] | null> {
  try {
    const snapshot = await readSnapshot();
    return (snapshot?.resumes ?? []).map((r) => r.profile?.photo?.id).filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return typeof indexedDB === "undefined" ? [] : null;
  }
}

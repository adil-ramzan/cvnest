/**
 * Profile photos are kept in the browser's IndexedDB rather than localStorage,
 * so resume JSON stays small. Like localStorage, IndexedDB is local to this
 * browser profile and is never sent anywhere. It is not encrypted.
 */

const DB_NAME = "folio";
const DB_VERSION = 1;
const STORE = "photos";

type PhotoRecord = { id: string; blob: Blob; createdAt: number };

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
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  // Allow a retry later if opening failed (e.g. private mode restrictions).
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

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  await run("readwrite", (store) => store.put({ id, blob, createdAt: Date.now() } satisfies PhotoRecord));
}

export async function loadPhoto(id: string): Promise<Blob | null> {
  const record = (await run("readonly", (store) => store.get(id))) as PhotoRecord | undefined;
  return record?.blob ?? null;
}

export async function deletePhoto(id: string): Promise<void> {
  forgetPhotoUrl(id);
  await run("readwrite", (store) => store.delete(id));
}

/** Removes stored photos no resume refers to. Recent ones are kept in case another tab is mid-save. */
export async function deleteUnusedPhotos(usedIds: Set<string>, minAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  const records = (await run("readonly", (store) => store.getAll())) as PhotoRecord[];
  const cutoff = Date.now() - minAgeMs;
  await Promise.all(
    records.filter((r) => !usedIds.has(r.id) && r.createdAt < cutoff).map((r) => deletePhoto(r.id)),
  );
}

/** Decodes a base64 data URL locally (no fetch, no network). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",", 2);
  const mime = header.slice(5, header.indexOf(";")) || "image/jpeg";
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

// Object URLs for display, cached per photo id for the life of the page.
const urlCache = new Map<string, Promise<string | null>>();

export function photoUrl(id: string): Promise<string | null> {
  let cached = urlCache.get(id);
  if (!cached) {
    cached = loadPhoto(id)
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    urlCache.set(id, cached);
    // Don't cache misses; the photo may arrive from another tab later.
    cached.then((url) => url === null && urlCache.delete(id));
  }
  return cached;
}

function forgetPhotoUrl(id: string) {
  const cached = urlCache.get(id);
  urlCache.delete(id);
  cached?.then((url) => url && URL.revokeObjectURL(url));
}

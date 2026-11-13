/**
 * Asking the browser to keep this site's storage (resumes in localStorage, photos in
 * IndexedDB) instead of clearing it when space runs low or the site isn't visited for a
 * while. Browsers decide for themselves: Chrome and Edge grant it silently based on how
 * the site is used, Firefox asks the person, and Safari may decline. Nothing is sent anywhere.
 */

export type StorageProtection = "protected" | "not-protected" | "unsupported";

type StorageManagerLike = { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> };

const manager = (): StorageManagerLike | undefined =>
  typeof navigator === "undefined" ? undefined : (navigator.storage as StorageManagerLike | undefined);

/** Whether the browser has already agreed to keep this site's storage. Never asks. */
export async function storageProtection(): Promise<StorageProtection> {
  const storage = manager();
  if (typeof storage?.persisted !== "function") return "unsupported";
  try {
    return (await storage.persisted()) ? "protected" : "not-protected";
  } catch {
    return "not-protected";
  }
}

/**
 * Asks the browser to keep this site's storage. Firefox shows a prompt, so the caller
 * must only do this once, after something the person did (see shouldRequestPersistence).
 */
export async function requestStorageProtection(): Promise<StorageProtection> {
  const storage = manager();
  if (typeof storage?.persist !== "function") return "unsupported";
  try {
    if (typeof storage.persisted === "function" && (await storage.persisted())) return "protected";
    return (await storage.persist()) ? "protected" : "not-protected";
  } catch {
    return "not-protected";
  }
}

/** Only the first PDF export or backup download asks, and only if nothing has asked before. */
export const shouldRequestPersistence = (persistRequestedAt: number | null) => persistRequestedAt === null;

/**
 * Browser-only persistence for resumes, using localStorage (photos live in
 * IndexedDB, see photo-store.ts). Resume content never leaves the browser.
 * localStorage is plain text readable by any script on this origin; it is not
 * encrypted.
 *
 * Storage layout:
 * - `folio.resumes.v2`    current data: { schemaVersion, resumes }.
 * - `folio.resumes`       schema v1 data from before the migration. Read once,
 *                         never modified, and kept as the pre-migration backup.
 * - `folio.resumes.backup-v{n}`  copy of the current key taken before any
 *                         in-place upgrade from schema n (future migrations).
 * - `folio.resumes.v2.unreadable-backup`  raw text of data that failed to load.
 * - `folio.migrations`    log of completed migrations.
 * - `folio.backup-state`  when a backup was last made; holds no resume content.
 */
import { RESUME_SCHEMA_VERSION, type Resume } from "@/data/resume";
import { migrateResume } from "./migrations";
import { createId, sanitizeResume } from "./resume-schema";
import { withKnownTemplate } from "./resumes";

const LEGACY_RESUMES_KEY = "folio.resumes";
const RESUMES_KEY = "folio.resumes.v2";
const SETTINGS_KEY = "folio.editor-settings";
const UNREADABLE_BACKUP_KEY = "folio.resumes.v2.unreadable-backup";
const BACKUP_STATE_KEY = "folio.backup-state";
const MIGRATION_LOG_KEY = "folio.migrations";
const OPEN_SECTIONS_KEY = "folio.open-sections";
const upgradeBackupKey = (fromVersion: number) => `folio.resumes.backup-v${fromVersion}`;

export const RESUMES_STORAGE_KEY = RESUMES_KEY;

export type Zoom = "fit" | number;

export type EditorSettings = {
  activeResumeId: string | null;
  zoom: Zoom;
};

export type LoadResult = {
  resumes: Resume[];
  /** False when localStorage cannot be used at all (blocked, disabled, private mode quirks). */
  available: boolean;
  /** True when stored data was partly or fully unreadable and has been skipped. */
  recovered: boolean;
  /** Schema version the data was migrated from during this load, if any. */
  migratedFrom: number | null;
  /** False when migrated data could not be written yet (it is kept in memory and saved on the next change). */
  persisted: boolean;
  /** Stored data came from a newer version of the app, so this version must not write over it. */
  newerData?: boolean;
  /**
   * Part of the stored data was unreadable and no copy of the original text could be kept
   * (usually because storage is nearly full). Saving would overwrite the only copy, so the
   * editor must not save until the person has downloaded it.
   */
  unreadableNotCopied?: boolean;
};

type ParseResult = { resumes: Resume[]; recovered: boolean; oldestVersion: number; newerData: boolean };

function getStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = "folio.probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function trySet(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses stored resumes in any known schema version, migrating each one to the
 * current schema in memory. Exported so cross-tab `storage` events can reuse it.
 */
export function parseResumes(raw: string | null): ParseResult {
  const empty = { resumes: [], recovered: false, oldestVersion: RESUME_SCHEMA_VERSION, newerData: false };
  if (raw === null) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...empty, recovered: true };
  }

  // Envelope ({ version | schemaVersion, resumes }) or, for very old data, a bare array.
  const items: unknown =
    typeof parsed === "object" && parsed !== null && "resumes" in parsed ? (parsed as { resumes: unknown }).resumes : parsed;
  if (!Array.isArray(items)) return { ...empty, recovered: true };

  const isNewer = (value: unknown) =>
    typeof value === "object" && value !== null && "schemaVersion" in value && Number(value.schemaVersion) > RESUME_SCHEMA_VERSION;
  const newerData = isNewer(parsed) || items.some(isNewer);

  const ids = { seen: new Set<string>(), makeId: createId };
  const resumes: Resume[] = [];
  let oldestVersion = RESUME_SCHEMA_VERSION;
  for (const item of items) {
    const migrated = migrateResume(item);
    const resume = migrated && sanitizeResume(migrated.value, ids);
    if (!migrated || !resume) continue;
    oldestVersion = Math.min(oldestVersion, migrated.fromVersion);
    resumes.push(withKnownTemplate(resume));
  }
  return { resumes, recovered: resumes.length !== items.length, oldestVersion, newerData };
}

const serialize = (resumes: Resume[]) => JSON.stringify({ schemaVersion: RESUME_SCHEMA_VERSION, resumes });

/** Writes data and reads it back to confirm the browser stored all of it. */
function writeVerified(storage: Storage, resumes: Resume[]): boolean {
  if (!trySet(storage, RESUMES_KEY, serialize(resumes))) return false;
  return parseResumes(storage.getItem(RESUMES_KEY)).resumes.length === resumes.length;
}

function logMigration(storage: Storage, entry: Record<string, unknown>) {
  let log: unknown[] = [];
  try {
    const existing = JSON.parse(storage.getItem(MIGRATION_LOG_KEY) ?? "[]");
    if (Array.isArray(existing)) log = existing;
  } catch {
    // Start a fresh log.
  }
  trySet(storage, MIGRATION_LOG_KEY, JSON.stringify([...log, { ...entry, at: new Date().toISOString() }].slice(-20)));
}

export function loadResumes(): LoadResult {
  const storage = getStorage();
  if (!storage) return { resumes: [], available: false, recovered: false, migratedFrom: null, persisted: false };

  try {
    const raw = storage.getItem(RESUMES_KEY);

    if (raw !== null) {
      const result = parseResumes(raw);
      // The skipped part exists only in `raw` until this copy is made, and the next save drops it.
      const copyKept = !result.recovered || trySet(storage, UNREADABLE_BACKUP_KEY, raw);
      if (result.newerData) return { resumes: result.resumes, recovered: false, available: true, migratedFrom: null, persisted: true, newerData: true };

      // In-place upgrade of the current key (future schema versions): back up first, then write.
      if (result.oldestVersion < RESUME_SCHEMA_VERSION) {
        const backupKey = upgradeBackupKey(result.oldestVersion);
        // Unchanged migration path: the upgrade backup below is what protects the original text here.
        const backedUp = storage.getItem(backupKey) !== null || trySet(storage, backupKey, raw);
        const persisted = backedUp && writeVerified(storage, result.resumes);
        if (persisted) logMigration(storage, { from: result.oldestVersion, to: RESUME_SCHEMA_VERSION, source: RESUMES_KEY, backup: backupKey, resumes: result.resumes.length });
        return { ...result, available: true, migratedFrom: result.oldestVersion, persisted };
      }
      return { resumes: result.resumes, recovered: result.recovered, available: true, migratedFrom: null, persisted: true, ...(!copyKept && { unreadableNotCopied: true }) };
    }

    // First run of this version: migrate schema v1 data, leaving the original key untouched as the backup.
    const legacyRaw = storage.getItem(LEGACY_RESUMES_KEY);
    if (legacyRaw === null) return { resumes: [], available: true, recovered: false, migratedFrom: null, persisted: true };

    const result = parseResumes(legacyRaw);
    if (result.resumes.length === 0) {
      // Nothing usable; don't create the new key so a later version can retry from the untouched original.
      return { resumes: [], available: true, recovered: result.recovered, migratedFrom: null, persisted: true };
    }

    // Another tab may have finished the same migration a moment ago.
    if (storage.getItem(RESUMES_KEY) !== null) return loadResumes();

    const persisted = writeVerified(storage, result.resumes);
    if (persisted) {
      logMigration(storage, {
        from: 1,
        to: RESUME_SCHEMA_VERSION,
        source: LEGACY_RESUMES_KEY,
        backup: LEGACY_RESUMES_KEY,
        resumes: result.resumes.length,
        skipped: result.recovered,
      });
    } else {
      // Never leave a partial write behind; the next load retries from the original.
      try {
        storage.removeItem(RESUMES_KEY);
      } catch {
        // Nothing more we can do.
      }
    }
    return { resumes: result.resumes, available: true, recovered: result.recovered, migratedFrom: 1, persisted };
  } catch {
    return { resumes: [], available: false, recovered: false, migratedFrom: null, persisted: false };
  }
}

/** The stored text exactly as it is, for saving a copy. */
export function readRawResumes(): string {
  try {
    return window.localStorage.getItem(RESUMES_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Returns true on success, false if the browser refused the write (e.g. quota exceeded). */
export function saveResumes(resumes: Resume[]): boolean {
  try {
    window.localStorage.setItem(RESUMES_KEY, serialize(resumes));
    return true;
  } catch {
    return false;
  }
}

export type BackupState = { lastBackupAt: number | null; reminderDismissed: boolean };

export function loadBackupState(): BackupState {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(BACKUP_STATE_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return { lastBackupAt: null, reminderDismissed: false };
    const { lastBackupAt, reminderDismissed } = parsed as Record<string, unknown>;
    return { lastBackupAt: typeof lastBackupAt === "number" ? lastBackupAt : null, reminderDismissed: reminderDismissed === true };
  } catch {
    return { lastBackupAt: null, reminderDismissed: false };
  }
}

export function saveBackupState(state: BackupState): void {
  try {
    window.localStorage.setItem(BACKUP_STATE_KEY, JSON.stringify(state));
  } catch {
    // Only affects whether the reminder shows again.
  }
}

const DEFAULT_SETTINGS: EditorSettings = { activeResumeId: null, zoom: "fit" };

export function loadSettings(): EditorSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_SETTINGS;
    const { activeResumeId, zoom } = parsed as Record<string, unknown>;
    return {
      activeResumeId: typeof activeResumeId === "string" ? activeResumeId : null,
      zoom: typeof zoom === "number" && zoom >= 0.3 && zoom <= 2 ? zoom : "fit",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: EditorSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are a convenience; ignore failures.
  }
}

function readOpenSections(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(window.localStorage.getItem(OPEN_SECTIONS_KEY) ?? "{}");
  return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
}

/** The section a resume was last left open on. Kept apart from the resume so it never counts as an edit. */
export function loadOpenSection(resumeId: string): string | null {
  try {
    const section = readOpenSections()[resumeId];
    return typeof section === "string" ? section : null;
  } catch {
    return null;
  }
}

export function saveOpenSection(resumeId: string, sectionId: string | null): void {
  try {
    const sections = readOpenSections();
    if (sectionId) sections[resumeId] = sectionId;
    else delete sections[resumeId];
    window.localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(sections));
  } catch {
    // Only affects which section opens next time.
  }
}

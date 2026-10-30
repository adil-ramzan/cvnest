/**
 * Backup files: every resume as JSON, with photos embedded so a backup is
 * complete on its own. Backups are created and read in the browser; nothing is
 * sent anywhere.
 */
import { RESUME_SCHEMA_VERSION, type Resume } from "@/data/resume";
import { loadPhoto } from "./photo-store";
import { parseResumes } from "./resume-storage";
import { isRecord } from "./resume-schema";

export const BACKUP_KIND = "resume-backup";
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export type BackupResult = { ok: true; resumes: Resume[]; skipped: number } | { ok: false; message: string };

const NEWER_MESSAGE = "This backup was made by a newer version of this site. Reload the page to get the latest version, then try again.";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function withEmbeddedPhoto(resume: Resume): Promise<Resume> {
  const photo = resume.profile.photo;
  if (!photo || photo.inlineData) return resume;
  try {
    const blob = await loadPhoto(photo.id);
    return blob ? { ...resume, profile: { ...resume.profile, photo: { ...photo, inlineData: await blobToDataUrl(blob) } } } : resume;
  } catch {
    return resume;
  }
}

export async function createBackup(resumes: Resume[]): Promise<string> {
  return JSON.stringify({
    kind: BACKUP_KIND,
    schemaVersion: RESUME_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    resumes: await Promise.all(resumes.map(withEmbeddedPhoto)),
  });
}

/** Checks a backup file through the same migrations and validation as stored data. */
export function readBackup(text: string): BackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "This file isn't a valid backup. Choose a .json file made with Download backup." };
  }
  if (!isRecord(parsed) || parsed.kind !== BACKUP_KIND || !Array.isArray(parsed.resumes)) {
    return { ok: false, message: "This file isn't a resume backup. Choose a .json file made with Download backup." };
  }
  const isNewer = (value: unknown) => typeof value === "number" && value > RESUME_SCHEMA_VERSION;
  if (isNewer(parsed.schemaVersion) || parsed.resumes.some((item) => isRecord(item) && isNewer(item.schemaVersion))) {
    return { ok: false, message: NEWER_MESSAGE };
  }
  const { resumes } = parseResumes(text);
  if (resumes.length === 0) return { ok: false, message: "This backup doesn't contain any resumes that can be read." };
  return { ok: true, resumes, skipped: parsed.resumes.length - resumes.length };
}

/** Saves text as a file through the browser's normal download. */
export function downloadTextFile(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export const backupFileName = (siteName: string, date = new Date()) => `${siteName}-backup-${date.toISOString().slice(0, 10)}.json`;

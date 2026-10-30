/**
 * Version-aware resume migrations.
 *
 * Each step upgrades a raw resume object by exactly one schema version. Add a
 * new step (and bump RESUME_SCHEMA_VERSION) whenever the model changes; never
 * edit an existing step, since saved data in browsers depends on it.
 */
import { DEFAULT_SECTION_TITLES, RESUME_SCHEMA_VERSION } from "@/data/resume";
import { isRecord } from "./resume-schema";

type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Schema v1 (Phase 2 editor): one flat `data` object per resume.

export type ResumeDataV1 = {
  name: string;
  photo?: string;
  title: string;
  contact: { email: string; phone: string; location: string; linkedin?: string; github?: string; website?: string };
  summary: string;
  experience: { id?: string; role: string; company: string; location: string; start: string; end: string; highlights: string[] }[];
  education: { id?: string; degree: string; school: string; start: string; end: string; detail?: string }[];
  skills: string[];
  projects?: { id?: string; name: string; subtitle?: string; link?: string; start?: string; end?: string; description?: string }[];
  languages?: string[];
  certifications?: string[];
  customSections?: {
    id?: string;
    title: string;
    items: { id?: string; title: string; subtitle?: string; date?: string; description?: string }[];
  }[];
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const records = (value: unknown): UnknownRecord[] => (Array.isArray(value) ? value.filter(isRecord) : []);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

/** "Spanish — Fluent" → name and proficiency. */
function splitLanguage(value: string) {
  const match = value.match(/^(.*?)\s+[—–-]\s+(.+)$/);
  return match ? { name: match[1].trim(), proficiency: match[2].trim() } : { name: value.trim(), proficiency: "" };
}

function mimeOf(dataUrl: string) {
  return dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg";
}

/**
 * v1 → v2. Existing ids are kept; ids that v1 never had (sections, skills,
 * languages, certifications) are derived from the resume id so two tabs
 * migrating the same data produce identical results.
 */
function v1ToV2(raw: UnknownRecord): UnknownRecord {
  const data = isRecord(raw.data) ? raw.data : {};
  const contact = isRecord(data.contact) ? data.contact : {};
  const resumeId = text(raw.id) || `resume-${text(raw.createdAt) || Date.now().toString(36)}`;
  const derived = (suffix: string) => `${resumeId}:${suffix}`;
  const keepId = (item: UnknownRecord, fallback: string) => (typeof item.id === "string" && item.id ? item.id : fallback);
  const section = (type: keyof typeof DEFAULT_SECTION_TITLES, extra: UnknownRecord) => ({
    id: derived(type),
    type,
    title: DEFAULT_SECTION_TITLES[type],
    visible: true,
    ...extra,
  });
  const photo = text(data.photo);

  return {
    schemaVersion: 2,
    id: resumeId,
    name: raw.name,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    profile: {
      fullName: text(data.name),
      jobTitle: text(data.title),
      email: text(contact.email),
      phone: text(contact.phone),
      location: text(contact.location),
      linkedin: text(contact.linkedin),
      github: text(contact.github),
      website: text(contact.website),
      ...(photo
        ? {
            photo: {
              id: derived("photo"),
              mimeType: mimeOf(photo),
              width: 0,
              height: 0,
              byteSize: Math.round(((photo.length - photo.indexOf(",") - 1) * 3) / 4),
              updatedAt: raw.updatedAt,
              // Moved into IndexedDB by the editor after the migration has been saved.
              inlineData: photo,
            },
          }
        : {}),
    },
    // Same order the v1 templates rendered sections in, so resumes look unchanged.
    sections: [
      section("summary", { content: text(data.summary) }),
      section("experience", {
        entries: records(data.experience).map((e, i) => ({
          id: keepId(e, derived(`experience-${i}`)),
          role: text(e.role),
          company: text(e.company),
          location: text(e.location),
          startDate: text(e.start),
          endDate: text(e.end),
          highlights: strings(e.highlights),
        })),
      }),
      section("projects", {
        entries: records(data.projects).map((p, i) => ({
          id: keepId(p, derived(`project-${i}`)),
          name: text(p.name),
          role: text(p.subtitle),
          link: text(p.link),
          startDate: text(p.start),
          endDate: text(p.end),
          description: text(p.description),
        })),
      }),
      section("education", {
        entries: records(data.education).map((e, i) => ({
          id: keepId(e, derived(`education-${i}`)),
          degree: text(e.degree),
          school: text(e.school),
          startDate: text(e.start),
          endDate: text(e.end),
          details: text(e.detail),
        })),
      }),
      section("skills", {
        entries: strings(data.skills).map((name, i) => ({ id: derived(`skill-${i}`), name })),
      }),
      section("certifications", {
        entries: strings(data.certifications).map((name, i) => ({ id: derived(`certification-${i}`), name })),
      }),
      section("languages", {
        entries: strings(data.languages).map((value, i) => ({ id: derived(`language-${i}`), ...splitLanguage(value) })),
      }),
      ...records(data.customSections).map((custom, index) => ({
        id: keepId(custom, derived(`custom-${index}`)),
        type: "custom",
        title: text(custom.title),
        visible: true,
        entries: records(custom.items).map((item, i) => ({
          id: keepId(item, derived(`custom-${index}-${i}`)),
          title: text(item.title),
          subtitle: text(item.subtitle),
          date: text(item.date),
          description: text(item.description),
        })),
      })),
    ],
    design: { templateId: raw.template, pageSize: raw.pageSize },
  };
}

const steps: Record<number, (raw: UnknownRecord) => UnknownRecord> = {
  1: v1ToV2,
};

/** Schema version of a raw stored resume. v1 resumes had no version field. */
export function schemaVersionOf(raw: UnknownRecord): number {
  return typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;
}

/**
 * Upgrades a raw resume to the current schema. Returns null for data that
 * can't be migrated, including resumes saved by a newer version of the app,
 * which are left for the caller to back up rather than downgraded.
 */
export function migrateResume(raw: unknown): { value: UnknownRecord; fromVersion: number } | null {
  if (!isRecord(raw)) return null;
  const fromVersion = schemaVersionOf(raw);
  if (!Number.isInteger(fromVersion) || fromVersion < 1 || fromVersion > RESUME_SCHEMA_VERSION) return null;

  let value = raw;
  for (let version = fromVersion; version < RESUME_SCHEMA_VERSION; version++) {
    const step = steps[version];
    if (!step) return null;
    value = step(value);
  }
  return { value, fromVersion };
}

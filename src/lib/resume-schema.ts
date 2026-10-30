/**
 * Validation for resumes in the current schema, plus id helpers. Has no
 * dependency on the template registry so it can run while sample data loads.
 */
import {
  DEFAULT_SECTION_TITLES,
  type ProfilePhoto,
  type Resume,
  RESUME_SCHEMA_VERSION,
  type ResumeProfile,
  type ResumeSection,
  SECTION_TYPES,
  type SectionType,
} from "@/data/resume";

export const DEFAULT_TEMPLATE = "professional";
export const DEFAULT_RESUME_NAME = "Untitled resume";

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // crypto.randomUUID needs a secure context; fall back for plain-HTTP LAN testing.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const isSectionType = (value: unknown): value is SectionType =>
  typeof value === "string" && (SECTION_TYPES as string[]).includes(value);

// ---------------------------------------------------------------------------
// Validation of untrusted data in the current schema. Malformed values are
// coerced to safe defaults rather than thrown, so partially damaged saves load.

const MAX_TEXT = 10_000;
const MAX_ITEMS = 200;
const MAX_ID = 100;

type UnknownRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown): string => (typeof value === "string" ? value.slice(0, MAX_TEXT) : "");
const optStr = (value: unknown): string | undefined => (typeof value === "string" ? value.slice(0, MAX_TEXT) : undefined);
const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, MAX_ITEMS).map(str) : [];
const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback);

/** Tracks ids across everything being loaded so duplicates are replaced. */
export type IdContext = { seen: Set<string>; makeId: () => string; freshIds?: boolean };

function takeId(value: unknown, ctx: IdContext): string {
  let id = !ctx.freshIds && typeof value === "string" && value.length > 0 && value.length <= MAX_ID ? value : "";
  if (!id || ctx.seen.has(id)) {
    do id = ctx.makeId();
    while (ctx.seen.has(id));
  }
  ctx.seen.add(id);
  return id;
}

function list<T>(value: unknown, parse: (item: UnknownRecord) => T): T[] {
  return Array.isArray(value) ? value.filter(isRecord).slice(0, MAX_ITEMS).map(parse) : [];
}

const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_INLINE_PHOTO = 1_500_000;
export const INLINE_PHOTO_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function sanitizePhoto(value: unknown, ctx: IdContext): ProfilePhoto | undefined {
  if (!isRecord(value)) return undefined;
  const inline =
    typeof value.inlineData === "string" && value.inlineData.length <= MAX_INLINE_PHOTO && INLINE_PHOTO_PATTERN.test(value.inlineData)
      ? value.inlineData
      : undefined;
  const hasId = typeof value.id === "string" && value.id.length > 0 && value.id.length <= MAX_ID;
  if (!hasId && !inline) return undefined;
  return {
    // Photo ids are storage keys, not React keys; duplicates mean a shared image and are kept.
    id: hasId ? (value.id as string) : ctx.makeId(),
    mimeType: typeof value.mimeType === "string" && PHOTO_MIME.includes(value.mimeType) ? value.mimeType : "image/jpeg",
    width: num(value.width, 0),
    height: num(value.height, 0),
    byteSize: num(value.byteSize, 0),
    updatedAt: num(value.updatedAt, Date.now()),
    ...(inline ? { inlineData: inline } : {}),
  };
}

function sanitizeProfile(value: unknown, ctx: IdContext): ResumeProfile {
  const raw = isRecord(value) ? value : {};
  const photo = sanitizePhoto(raw.photo, ctx);
  return {
    fullName: str(raw.fullName),
    jobTitle: str(raw.jobTitle),
    email: str(raw.email),
    phone: str(raw.phone),
    location: str(raw.location),
    linkedin: str(raw.linkedin),
    github: str(raw.github),
    website: str(raw.website),
    ...(photo ? { photo } : {}),
  };
}

function sanitizeSection(raw: UnknownRecord, ctx: IdContext): ResumeSection | null {
  const type = raw.type;
  if (!isSectionType(type)) return null;
  const base = {
    id: takeId(raw.id, ctx),
    title: typeof raw.title === "string" ? raw.title.slice(0, 120) : DEFAULT_SECTION_TITLES[type],
    visible: raw.visible !== false,
  };
  const id = (item: UnknownRecord) => takeId(item.id, ctx);

  switch (type) {
    case "summary":
      return { ...base, type, content: str(raw.content) };
    case "experience":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({
          id: id(e), role: str(e.role), company: str(e.company), location: optStr(e.location),
          startDate: optStr(e.startDate), endDate: optStr(e.endDate), highlights: strList(e.highlights),
        })),
      };
    case "education":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({
          id: id(e), degree: str(e.degree), school: str(e.school), location: optStr(e.location),
          startDate: optStr(e.startDate), endDate: optStr(e.endDate), details: optStr(e.details),
        })),
      };
    case "projects":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({
          id: id(e), name: str(e.name), role: optStr(e.role), link: optStr(e.link),
          startDate: optStr(e.startDate), endDate: optStr(e.endDate), description: optStr(e.description),
        })),
      };
    case "skills":
      return { ...base, type, entries: list(raw.entries, (e) => ({ id: id(e), name: str(e.name) })) };
    case "certifications":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({ id: id(e), name: str(e.name), issuer: optStr(e.issuer), date: optStr(e.date) })),
      };
    case "languages":
      return { ...base, type, entries: list(raw.entries, (e) => ({ id: id(e), name: str(e.name), proficiency: optStr(e.proficiency) })) };
    case "awards":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({
          id: id(e), title: str(e.title), issuer: optStr(e.issuer), date: optStr(e.date), description: optStr(e.description),
        })),
      };
    case "volunteering":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({
          id: id(e), role: str(e.role), organization: str(e.organization), location: optStr(e.location),
          startDate: optStr(e.startDate), endDate: optStr(e.endDate), highlights: strList(e.highlights),
        })),
      };
    case "custom":
      return {
        ...base,
        type,
        entries: list(raw.entries, (e) => ({
          id: id(e), title: str(e.title), subtitle: optStr(e.subtitle), date: optStr(e.date), description: optStr(e.description),
        })),
      };
  }
}

/** Validates a resume already in the current schema version. Returns null only if it isn't an object. */
export function sanitizeResume(value: unknown, ctx: IdContext): Resume | null {
  if (!isRecord(value)) return null;
  const now = Date.now();
  const createdAt = num(value.createdAt, now) || now;
  const design = isRecord(value.design) ? value.design : {};

  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    id: takeId(value.id, ctx),
    name: str(value.name).trim().slice(0, 120) || DEFAULT_RESUME_NAME,
    createdAt,
    updatedAt: num(value.updatedAt, createdAt) || createdAt,
    profile: sanitizeProfile(value.profile, ctx),
    sections: list(value.sections, (section) => sanitizeSection(section, ctx))
      .filter((section): section is ResumeSection => section !== null)
      .slice(0, 50),
    design: {
      // Checked against the template registry by the storage loader.
      templateId: typeof design.templateId === "string" && design.templateId ? design.templateId.slice(0, MAX_ID) : DEFAULT_TEMPLATE,
      pageSize: design.pageSize === "a4" ? "a4" : "letter",
    },
  };
}

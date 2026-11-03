import {
  type Award,
  type Certification,
  type CustomEntry,
  DEFAULT_SECTION_TITLES,
  type Education,
  type Experience,
  type Language,
  type PageSize,
  type Project,
  type Resume,
  RESUME_SCHEMA_VERSION,
  type ResumeProfile,
  type ResumeSection,
  type SectionType,
  type Skill,
  type Volunteering,
} from "@/data/resume";
import { getTemplate, type TemplateSlug } from "@/data/templates";
import { createId, DEFAULT_RESUME_NAME, DEFAULT_TEMPLATE, sanitizeResume } from "./resume-schema";

export { createId, DEFAULT_RESUME_NAME, DEFAULT_TEMPLATE };

/** Sections a new resume starts with, in order. Awards, volunteering and custom sections are added on demand. */
export const DEFAULT_SECTIONS: SectionType[] = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
  "languages",
];

export function isTemplateSlug(value: unknown): value is TemplateSlug {
  return typeof value === "string" && getTemplate(value) !== undefined;
}

/** Falls back to the default template when a stored template id no longer exists. */
export function withKnownTemplate(resume: Resume): Resume {
  return isTemplateSlug(resume.design.templateId)
    ? resume
    : { ...resume, design: { ...resume.design, templateId: DEFAULT_TEMPLATE } };
}

/** US Letter for North America, A4 elsewhere, based on the browser's language region. */
export function defaultPageSize(): PageSize {
  if (typeof navigator === "undefined") return "letter";
  const region = navigator.language.split("-")[1]?.toUpperCase();
  return !region || ["US", "CA", "MX", "PH", "CL", "CO", "VE"].includes(region) ? "letter" : "a4";
}

// ---------------------------------------------------------------------------
// Factories

export const newExperience = (): Experience => ({ id: createId(), role: "", company: "", location: "", startDate: "", endDate: "", highlights: [] });
export const newEducation = (): Education => ({ id: createId(), degree: "", school: "", startDate: "", endDate: "", details: "" });
export const newProject = (): Project => ({ id: createId(), name: "", role: "", link: "", startDate: "", endDate: "", description: "" });
export const newSkill = (name: string): Skill => ({ id: createId(), name });
export const newCertification = (): Certification => ({ id: createId(), name: "", issuer: "", date: "" });
export const newLanguage = (): Language => ({ id: createId(), name: "", proficiency: "" });
export const newAward = (): Award => ({ id: createId(), title: "", issuer: "", date: "", description: "" });
export const newVolunteering = (): Volunteering => ({ id: createId(), role: "", organization: "", location: "", startDate: "", endDate: "", highlights: [] });
export const newCustomEntry = (): CustomEntry => ({ id: createId(), title: "", subtitle: "", date: "", description: "" });

export function createSection(type: SectionType): ResumeSection {
  const base = { id: createId(), title: DEFAULT_SECTION_TITLES[type], visible: true };
  if (type === "summary") return { ...base, type, content: "" };
  if (type === "custom") return { ...base, type, title: "", entries: [newCustomEntry()] };
  return { ...base, type, entries: [] } as ResumeSection;
}

export const emptyProfile = (): ResumeProfile => ({
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
});

export function createResume(
  template: TemplateSlug = DEFAULT_TEMPLATE,
  pageSize: PageSize = "letter",
  name = DEFAULT_RESUME_NAME,
): Resume {
  const now = Date.now();
  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    profile: emptyProfile(),
    sections: DEFAULT_SECTIONS.map(createSection),
    design: { templateId: template, pageSize },
  };
}

/** Deep copy with fresh resume, section and entry ids. The photo record is shared (see photo-store). */
export function duplicateResume(source: Resume, name: string): Resume {
  const copy = sanitizeResume(JSON.parse(JSON.stringify(source)), { seen: new Set(), makeId: createId, freshIds: true })!;
  const now = Date.now();
  return { ...copy, name, createdAt: now, updatedAt: now };
}

/** True when the resume has no user-entered content at all. */
export function isResumeEmpty(resume: Resume): boolean {
  const hasText = (value: unknown): boolean =>
    typeof value === "string"
      ? value.trim() !== ""
      : Array.isArray(value)
        ? value.some(hasText)
        : typeof value === "object" && value !== null
          ? Object.entries(value).some(([key, v]) => !["id", "type", "title", "visible", "sampleFields"].includes(key) && hasText(v))
          : false;
  return !resume.profile.photo && !hasText(resume.profile) && !hasText(resume.sections);
}

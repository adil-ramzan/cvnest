/**
 * Unified, versioned resume data model.
 *
 * A resume is profile details plus an ordered list of typed sections, with
 * presentation choices kept apart in `design`. Every resume, section and entry
 * has a stable id. Bump RESUME_SCHEMA_VERSION and add a step to
 * `src/lib/migrations.ts` whenever this shape changes.
 */

export const RESUME_SCHEMA_VERSION = 2;

export type PageSize = "letter" | "a4";

/**
 * Metadata for a profile photo. The image itself lives in the browser's
 * IndexedDB (see `src/lib/photo-store.ts`), keyed by `id`, so localStorage only
 * holds this small record.
 */
export type ProfilePhoto = {
  id: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  updatedAt: number;
  /** Fallback when IndexedDB is unavailable: the image kept inline as a data URL. */
  inlineData?: string;
};

export type ResumeProfile = {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
  photo?: ProfilePhoto;
};

/** Presentation settings. Changing these never touches resume content. */
export type ResumeDesign = {
  templateId: string;
  pageSize: PageSize;
};

export type Experience = {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
};

export type Education = {
  id: string;
  degree: string;
  school: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
};

export type Project = {
  id: string;
  name: string;
  role?: string;
  link?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export type Skill = { id: string; name: string };

export type Certification = { id: string; name: string; issuer?: string; date?: string };

export type Language = { id: string; name: string; proficiency?: string };

export type Award = { id: string; title: string; issuer?: string; date?: string; description?: string };

export type Volunteering = {
  id: string;
  role: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
};

export type CustomEntry = { id: string; title: string; subtitle?: string; date?: string; description?: string };

type SectionBase<Type extends string> = {
  id: string;
  type: Type;
  /** Heading shown on the resume; editable by the user. */
  title: string;
  visible: boolean;
};

type ListSection<Type extends string, Entry> = SectionBase<Type> & { entries: Entry[] };

export type SummarySection = SectionBase<"summary"> & { content: string };
export type ExperienceSection = ListSection<"experience", Experience>;
export type EducationSection = ListSection<"education", Education>;
export type ProjectsSection = ListSection<"projects", Project>;
export type SkillsSection = ListSection<"skills", Skill>;
export type CertificationsSection = ListSection<"certifications", Certification>;
export type LanguagesSection = ListSection<"languages", Language>;
export type AwardsSection = ListSection<"awards", Award>;
export type VolunteeringSection = ListSection<"volunteering", Volunteering>;
export type CustomSection = ListSection<"custom", CustomEntry>;

export type ResumeSection =
  | SummarySection
  | ExperienceSection
  | EducationSection
  | ProjectsSection
  | SkillsSection
  | CertificationsSection
  | LanguagesSection
  | AwardsSection
  | VolunteeringSection
  | CustomSection;

export type SectionType = ResumeSection["type"];
export type EntrySection = Exclude<ResumeSection, SummarySection>;

export type Resume = {
  schemaVersion: typeof RESUME_SCHEMA_VERSION;
  id: string;
  /** Document name used to tell resumes apart; not printed on the resume. */
  name: string;
  createdAt: number;
  updatedAt: number;
  profile: ResumeProfile;
  /** Ordered; the main resume column follows this order. */
  sections: ResumeSection[];
  design: ResumeDesign;
};

export const SECTION_TYPES: SectionType[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "languages",
  "awards",
  "volunteering",
  "custom",
];

export const DEFAULT_SECTION_TITLES: Record<SectionType, string> = {
  summary: "Profile",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards",
  volunteering: "Volunteering",
  custom: "Custom section",
};

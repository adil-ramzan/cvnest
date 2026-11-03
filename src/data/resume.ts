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
  /** Fields still holding sample text. Optional; missing means none. See `src/lib/sample-content.ts`. */
  sampleFields?: SampleProfileField[];
};

export const SAMPLE_PROFILE_FIELDS = ["fullName", "jobTitle", "email", "phone", "location", "linkedin", "github", "website"] as const;
export type SampleProfileField = (typeof SAMPLE_PROFILE_FIELDS)[number];

/** Font choices offered to the user, as keys of the template font stacks. */
export const RESUME_FONTS = ["inter", "plexSans", "montserrat", "sourceSerif", "lora", "garamond"] as const;
export type ResumeFont = (typeof RESUME_FONTS)[number];

/** Multiplier applied to every text size. 1 is the template's own sizing. */
export const FONT_SCALE = { min: 0.8, max: 1.2, step: 0.05, small: 0.9, large: 1.1 };

/** Optional. Missing means the template's own choice, so resumes saved before these existed look the same. */
export type ResumeCustomization = {
  accentColor?: string;
  fontFamily?: ResumeFont;
  fontScale?: number;
};

/** Presentation settings. Changing these never touches resume content. */
export type ResumeDesign = ResumeCustomization & {
  templateId: string;
  pageSize: PageSize;
};

/** Optional on every entry. Missing means visible and the user's own, so resumes saved before these existed load unchanged. */
type EntryOptions = { hidden?: boolean; sample?: true };

export type Experience = EntryOptions & {
  id: string;
  role: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
};

export type Education = EntryOptions & {
  id: string;
  degree: string;
  school: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
};

export type Project = EntryOptions & {
  id: string;
  name: string;
  role?: string;
  link?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export type Skill = EntryOptions & { id: string; name: string };

export type Certification = EntryOptions & { id: string; name: string; issuer?: string; date?: string };

export type Language = EntryOptions & { id: string; name: string; proficiency?: string };

export type Award = EntryOptions & { id: string; title: string; issuer?: string; date?: string; description?: string };

export type Volunteering = EntryOptions & {
  id: string;
  role: string;
  organization: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
};

export type CustomEntry = EntryOptions & { id: string; title: string; subtitle?: string; date?: string; description?: string };

type SectionBase<Type extends string> = {
  id: string;
  type: Type;
  /** Heading shown on the resume; editable by the user. */
  title: string;
  visible: boolean;
};

type ListSection<Type extends string, Entry> = SectionBase<Type> & { entries: Entry[] };

export type SummarySection = SectionBase<"summary"> & { content: string; sample?: true };
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
  /** When a backup or PDF last captured this resume. Optional; missing means never. */
  lastBackupAt?: number;
  lastExportAt?: number;
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

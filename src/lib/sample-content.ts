/**
 * Tracks what "Load sample data" put in a resume, so someone's real resume can't
 * go out with a stranger's skills left in it. The marks are optional and belong to
 * the editor: `prepareResume` never reads them, so a template can't print them.
 */
import { type Resume, type ResumeProfile, type ResumeSection, SAMPLE_PROFILE_FIELDS } from "@/data/resume";

export const sampleEntryElementId = (entryId: string) => `sample-entry-${entryId}`;

/** The same resume with everything that has text marked as sample. */
export function markAsSample(resume: Resume): Resume {
  const sampleFields = SAMPLE_PROFILE_FIELDS.filter((field) => resume.profile[field]?.trim());
  const sections = resume.sections.map((section): ResumeSection => {
    if (section.type === "summary") return section.content.trim() ? { ...section, sample: true } : section;
    return { ...section, entries: section.entries.map((entry) => ({ ...entry, sample: true })) } as ResumeSection;
  });
  return { ...resume, profile: { ...resume.profile, ...(sampleFields.length ? { sampleFields } : {}) }, sections };
}

/** Removes everything still marked as sample. Anything the user wrote or edited stays. */
export function clearSampleContent(resume: Resume): Resume {
  const profile: ResumeProfile = { ...resume.profile };
  for (const field of profile.sampleFields ?? []) profile[field] = "";
  delete profile.sampleFields;
  const sections = resume.sections.map((section): ResumeSection => {
    if (section.type === "summary") return section.sample ? { ...section, content: "", sample: undefined } : section;
    return { ...section, entries: section.entries.filter((entry) => !entry.sample) } as ResumeSection;
  });
  return { ...resume, profile, sections };
}

/** Any sample content at all, including content hidden from the resume. */
export function hasSampleContent(resume: Resume): boolean {
  return (
    !!resume.profile.sampleFields?.length ||
    resume.sections.some((section) => (section.type === "summary" ? section.sample : section.entries.some((entry) => entry.sample)))
  );
}

/** Where the first sample content the PDF would show is, or null if it would show none. */
export function findSampleContent(resume: Resume): { sectionId: string; elementId: string } | null {
  if (resume.profile.sampleFields?.length) return { sectionId: "personal", elementId: "section-personal" };
  for (const section of resume.sections) {
    if (!section.visible) continue;
    if (section.type === "summary") {
      if (section.sample) return { sectionId: section.id, elementId: `section-${section.id}` };
      continue;
    }
    const entry = section.entries.find((item) => item.sample && !item.hidden);
    if (entry) return { sectionId: section.id, elementId: sampleEntryElementId(entry.id) };
  }
  return null;
}

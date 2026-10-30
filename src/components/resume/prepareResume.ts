import { DEFAULT_SECTION_TITLES, type Resume, type ResumeSection, type SectionType } from "@/data/resume";

/** One entry (job, school, project, award...) normalized for rendering. */
export type RenderEntry = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  link: string;
  dates: string;
  bullets: string[];
  text: string;
};

export type RenderSection =
  | { kind: "text"; id: string; type: SectionType; title: string; text: string }
  | { kind: "entries"; id: string; type: SectionType; title: string; entries: RenderEntry[] }
  | { kind: "list"; id: string; type: SectionType; title: string; items: string[] };

/**
 * Resume content prepared for templates: text trimmed, hidden and empty
 * sections removed, hidden entries and entries without content dropped. Sections keep the
 * user's order.
 */
export type PreparedResume = {
  name: string;
  /** Up to three initials, used where a template shows a monogram instead of a photo. */
  initials: string;
  /** Resolved image URL (object URL or data URL), or "" when there is no photo. */
  photo: string;
  title: string;
  contact: { location: string; phone: string; email: string; linkedin: string; github: string; website: string };
  /** Contact details in display order, blanks removed. */
  contactItems: string[];
  sections: RenderSection[];
};

const text = (value: string | undefined) => value?.trim() ?? "";
const lines = (items: string[] | undefined) => (items ?? []).map((item) => item.trim()).filter(Boolean);

export function dateRange(start?: string, end?: string) {
  const from = text(start);
  const to = text(end);
  if (from && to && from !== to) return `${from} – ${to}`;
  return from || to;
}

/** Joins the parts that are present. */
export const joinParts = (parts: string[], separator: string) => parts.filter(Boolean).join(separator);

function entry(fields: Partial<RenderEntry> & { id: string }): RenderEntry {
  return { title: "", subtitle: "", location: "", link: "", dates: "", bullets: [], text: "", ...fields };
}

const hasContent = (e: RenderEntry) => !!(e.title || e.subtitle || e.text || e.bullets.length);

const shown = <T extends { hidden?: boolean }>(list: T[]) => list.filter((e) => !e.hidden);

function prepareSection(section: ResumeSection): RenderSection | null {
  const base = { id: section.id, type: section.type, title: text(section.title) || DEFAULT_SECTION_TITLES[section.type] };
  const entries = (list: RenderEntry[]): RenderSection | null => {
    const kept = list.filter(hasContent);
    return kept.length ? { ...base, kind: "entries", entries: kept } : null;
  };
  const items = (list: string[]): RenderSection | null => {
    const kept = list.map((item) => item.trim()).filter(Boolean);
    return kept.length ? { ...base, kind: "list", items: kept } : null;
  };

  switch (section.type) {
    case "summary":
      return text(section.content) ? { ...base, kind: "text", text: text(section.content) } : null;
    case "experience":
      return entries(
        shown(section.entries).map((e) =>
          entry({
            id: e.id,
            title: text(e.role),
            subtitle: text(e.company),
            location: text(e.location),
            dates: dateRange(e.startDate, e.endDate),
            bullets: lines(e.highlights),
          }),
        ),
      );
    case "volunteering":
      return entries(
        shown(section.entries).map((e) =>
          entry({
            id: e.id,
            title: text(e.role),
            subtitle: text(e.organization),
            location: text(e.location),
            dates: dateRange(e.startDate, e.endDate),
            bullets: lines(e.highlights),
          }),
        ),
      );
    case "education":
      return entries(
        shown(section.entries).map((e) =>
          entry({
            id: e.id,
            title: text(e.degree),
            subtitle: text(e.school),
            location: text(e.location),
            dates: dateRange(e.startDate, e.endDate),
            text: text(e.details),
          }),
        ),
      );
    case "projects":
      return entries(
        shown(section.entries).map((e) =>
          entry({
            id: e.id,
            title: text(e.name),
            subtitle: text(e.role),
            link: text(e.link),
            dates: dateRange(e.startDate, e.endDate),
            text: text(e.description),
          }),
        ),
      );
    case "awards":
      return entries(
        shown(section.entries).map((e) =>
          entry({ id: e.id, title: text(e.title), subtitle: text(e.issuer), dates: text(e.date), text: text(e.description) }),
        ),
      );
    case "custom":
      return entries(
        shown(section.entries).map((e) =>
          entry({ id: e.id, title: text(e.title), subtitle: text(e.subtitle), dates: text(e.date), text: text(e.description) }),
        ),
      );
    case "skills":
      return items(shown(section.entries).map((e) => e.name));
    case "languages":
      return items(shown(section.entries).map((e) => joinParts([text(e.name), text(e.proficiency)], " — ")));
    case "certifications":
      return items(
        shown(section.entries).map((e) => {
          const name = joinParts([text(e.name), text(e.issuer)], " — ");
          return name && text(e.date) ? `${name} (${text(e.date)})` : name;
        }),
      );
  }
}

export function prepareResume(resume: Resume, photoUrl = ""): PreparedResume {
  const { profile } = resume;
  const contact = {
    location: text(profile.location),
    phone: text(profile.phone),
    email: text(profile.email),
    linkedin: text(profile.linkedin),
    github: text(profile.github),
    website: text(profile.website),
  };
  const name = text(profile.fullName) || "Your Name";

  return {
    name,
    initials: name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
    photo: photoUrl,
    title: text(profile.jobTitle),
    contact,
    contactItems: [contact.location, contact.phone, contact.email, contact.linkedin, contact.github, contact.website].filter(Boolean),
    sections: resume.sections
      .filter((section) => section.visible)
      .map(prepareSection)
      .filter((section): section is RenderSection => section !== null),
  };
}

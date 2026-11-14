import { DEFAULT_SECTION_TITLES, type Resume, type ResumeSection, type SectionType } from "@/data/resume";

/** Part of a free-text field: a paragraph, or lines the user wrote as a list. */
export type TextBlock = { kind: "text"; text: string } | { kind: "bullets"; items: string[] };

/** One entry (job, school, project, award...) normalized for rendering. */
export type RenderEntry = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  link: string;
  dates: string;
  bullets: string[];
  /** Free text on one line, for templates that run it into another line. */
  text: string;
  /** The same text with its structure, for templates that give it its own block. */
  details: TextBlock[];
};

export type RenderSection =
  | { kind: "text"; id: string; type: SectionType; title: string; text: string; details: TextBlock[] }
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
  /** Render URLs and emails as real links. */
  links?: boolean;
  /** Firefox's PDF floats the sidebar, which has to come first. */
  asideFirst?: boolean;
  /** The name is only the page's main heading in the PDF. On screen it sits inside a page with its own. */
  nameTag?: "h1" | "div";
};

const text = (value: string | undefined) => value?.trim() ?? "";
const BULLET_MARKER = /^(?:[•‣◦▪·]\s*|[-*](?:\s+|$))/;
/** Pasted lists often keep their own markers, which would print a second bullet. */
const stripBullet = (item: string) => item.trim().replace(BULLET_MARKER, "").trim();
const lines = (items: string[] | undefined) => (items ?? []).map(stripBullet).filter(Boolean);

/** Splits free text into paragraphs and lists. Lines starting with a bullet marker form a list. */
export function textBlocks(value: string | undefined): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const line of (value ?? "").split("\n")) {
    const last = blocks.at(-1);
    if (BULLET_MARKER.test(line.trim())) {
      const item = stripBullet(line);
      if (!item) continue;
      if (last?.kind === "bullets") last.items.push(item);
      else blocks.push({ kind: "bullets", items: [item] });
    } else if (last?.kind === "text") last.text += `\n${line}`;
    else if (line.trim()) blocks.push({ kind: "text", text: line });
  }
  return blocks.map((block) => (block.kind === "text" ? { ...block, text: block.text.trim() } : block));
}

/** Free text for an entry: its blocks, and one line for templates with no room for them. */
function freeText(value: string | undefined) {
  const details = textBlocks(value);
  return { details, text: details.map((block) => (block.kind === "text" ? block.text : block.items.join(" · "))).join(" · ") };
}

/** End dates that only say "still going" and carry no date of their own. */
const ONGOING = /^(present|current|now|ongoing|today)$/i;

export function dateRange(start?: string, end?: string) {
  const from = text(start);
  const to = text(end);
  if (from && to && from !== to) return `${from} – ${to}`;
  // "Present" on its own says nothing about when, so an entry without a start date
  // shows no date rather than a bare "Present" (audit T-09). A real end date still shows.
  if (!from && ONGOING.test(to)) return "";
  return from || to;
}

/** Marks text long enough that it must be free to split across pages. See `.paged--gecko` in globals.css. */
export const longTextClass = (value: string) => (value.length > 1200 ? " long-text" : "");

/** Joins the parts that are present. */
export const joinParts = (parts: string[], separator: string) => parts.filter(Boolean).join(separator);

function entry(fields: Partial<RenderEntry> & { id: string }): RenderEntry {
  return { title: "", subtitle: "", location: "", link: "", dates: "", bullets: [], text: "", details: [], ...fields };
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
      return freeText(section.content).text ? { ...base, kind: "text", ...freeText(section.content) } : null;
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
            ...freeText(e.details),
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
            ...freeText(e.description),
          }),
        ),
      );
    case "awards":
      return entries(
        shown(section.entries).map((e) =>
          entry({ id: e.id, title: text(e.title), subtitle: text(e.issuer), dates: text(e.date), ...freeText(e.description) }),
        ),
      );
    case "custom":
      return entries(
        shown(section.entries).map((e) =>
          entry({ id: e.id, title: text(e.title), subtitle: text(e.subtitle), dates: text(e.date), ...freeText(e.description) }),
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

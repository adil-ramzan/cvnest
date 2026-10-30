/**
 * Editing limits. The editor stops input at these limits and says so. Stored
 * data over them is never cut: it loads in full and findOverLimits reports it.
 */
import { DEFAULT_SECTION_TITLES, type Resume } from "@/data/resume";

export const LIMITS = { text: 10_000, title: 120, entries: 200, lines: 200, sections: 50 };

/** Counters appear once a field is this full. */
export const COUNTER_THRESHOLD = 0.9;

const number = (value: number) => value.toLocaleString("en-US");

/** Plain descriptions of anything over the limits, for a warning. */
export function findOverLimits(resume: Resume): string[] {
  const found: string[] = [];
  const longest = (values: unknown[]) => Math.max(0, ...values.map((value) => (typeof value === "string" ? value.length : 0)));
  const checkText = (label: string, length: number) => {
    if (length > LIMITS.text) found.push(`${label}: ${number(length)} characters (limit ${number(LIMITS.text)})`);
  };

  checkText("Personal details", longest(Object.values(resume.profile)));
  if (resume.sections.length > LIMITS.sections) found.push(`${number(resume.sections.length)} sections (limit ${LIMITS.sections})`);

  for (const section of resume.sections) {
    const name = section.title.trim() || DEFAULT_SECTION_TITLES[section.type];
    if (section.title.length > LIMITS.title) found.push(`${name.slice(0, 30)}…: heading is ${section.title.length} characters (limit ${LIMITS.title})`);
    if (section.type === "summary") {
      checkText(name, section.content.length);
      continue;
    }
    if (section.entries.length > LIMITS.entries) found.push(`${name}: ${number(section.entries.length)} entries (limit ${LIMITS.entries})`);
    for (const entry of section.entries) {
      checkText(name, longest(Object.values(entry)));
      if ("highlights" in entry) {
        checkText(name, longest(entry.highlights));
        if (entry.highlights.length > LIMITS.lines) found.push(`${name}: ${number(entry.highlights.length)} bullet points (limit ${LIMITS.lines})`);
      }
    }
  }
  return [...new Set(found)];
}

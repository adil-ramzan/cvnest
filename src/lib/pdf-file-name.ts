/**
 * The suggested PDF file name, without the extension (callers add ".pdf" once; the
 * browser adds it itself when the name is used as the document title).
 *
 * A resume the person has named uses that name: "Frontend Developer CV" stays
 * "Frontend Developer CV". An unnamed one ("Untitled resume") keeps the older rule
 * based on the name on the resume: "Maya Chen" becomes "Maya-Chen-Resume".
 */
import { SITE_NAME } from "@/data/site";
import { DEFAULT_RESUME_NAME } from "./resume-schema";

const MAX_LENGTH = 80;
/** Characters most file systems refuse, plus controls and bidi overrides that could disguise a name. */
const UNSAFE = /[\\/:*?"<>|#%{}^~[\]`\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]+/g;
/** Names Windows reserves, with or without an extension. */
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

function clean(value: string, separator: " " | "-"): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(UNSAFE, " ")
    .replace(/\s+/g, separator)
    .replace(/(\.pdf)+$/i, "")
    // Leading dots hide files on some systems; trailing dots and spaces are dropped by Windows.
    .replace(/^[\s.-]+|[\s.-]+$/g, "");
  // Cut by characters, not UTF-16 units, so an emoji or accented letter is never split.
  return Array.from(cleaned).slice(0, MAX_LENGTH).join("").replace(/[\s.-]+$/, "");
}

export function pdfFileName(resume: { name: string; profile: { fullName: string } }): string {
  const name = resume.name.trim();
  if (name && name !== DEFAULT_RESUME_NAME) {
    const base = clean(name, " ");
    if (base && !RESERVED.test(base)) return base;
  }
  const person = clean(resume.profile.fullName, "-");
  return person ? `${person}-Resume` : `${SITE_NAME}-Resume`;
}

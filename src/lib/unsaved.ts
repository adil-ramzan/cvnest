/**
 * When leaving the editor could cost someone their work. Everything is stored
 * in this browser only, so a resume counts as safe once a copy exists outside
 * it and nothing has changed since.
 */
import type { Resume } from "@/data/resume";
import { isResumeEmpty } from "./resumes";

type SaveState = "saved" | "saving" | "error" | "unavailable" | "blocked";

export function isAtRisk(resume: Resume | null, saveStatus: SaveState): boolean {
  if (!resume || isResumeEmpty(resume)) return false;
  if (saveStatus !== "saved") return true;
  const copiedAt = Math.max(resume.lastBackupAt ?? 0, resume.lastExportAt ?? 0);
  return resume.updatedAt > copiedAt;
}

type ClickLike = { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean };
type LinkLike = { href: string; target: string; hasAttribute: (name: string) => boolean };

/** The in-app address a click would navigate to, or null if the click should be left alone. */
export function internalDestination(event: ClickLike, link: LinkLike, current: string): string | null {
  // Modified clicks open new tabs and windows, which don't leave this page.
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const from = new URL(current);
  const to = new URL(link.href, current);
  if (to.origin !== from.origin) return null;
  if (to.pathname === from.pathname && to.search === from.search) return null;
  return `${to.pathname}${to.search}${to.hash}`;
}

/** What the browser needs to show its own "leave site?" prompt. Its wording can't be changed. */
export function promptBeforeUnload(event: Pick<BeforeUnloadEvent, "preventDefault" | "returnValue">) {
  event.preventDefault();
  event.returnValue = "";
}

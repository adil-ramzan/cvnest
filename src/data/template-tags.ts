import type { ResumeTemplate } from "./templates";

export type TemplateStructure = "Sidebar" | "Two column" | "Single column + grid" | "Single column";

/** How the page is arranged, worked out from the design so a label can't drift from it. */
export function templateStructure({ slug, design }: Pick<ResumeTemplate, "slug" | "design">): TemplateStructure {
  if (slug === "modern" || design?.layout === "sidebar") return "Sidebar";
  if (design?.layout === "columns") return "Two column";
  // `lower` moves some sections into a two-column grid below the main column, in the
  // design's order rather than the user's (audit T-03).
  if (design?.lower?.length) return "Single column + grid";
  return "Single column";
}

export const ORDER_NOTE = "This layout arranges some sections by design, so they may not follow your section order.";

/**
 * Designs that never draw their accent color, so choosing one changes nothing on the page
 * (audit T-04). tests/unit/template-tags.test.ts renders every design with and without an
 * accent and fails if this list and the renderer disagree.
 */
const NO_ACCENT = new Set(["classic", "clarity", "plainsong", "plainview", "concise", "telegraph", "scholar"]);

/** Whether a custom accent color changes how this template looks. */
export const usesAccentColor = ({ slug }: Pick<ResumeTemplate, "slug">) => !NO_ACCENT.has(slug);

export const NO_ACCENT_NOTE = "This template doesn't use an accent color, so color choices don't change it.";

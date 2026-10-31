import type { ResumeTemplate } from "./templates";

export type TemplateStructure = "Sidebar" | "Two column" | "Single column";

/** How the page is arranged, worked out from the design so a label can't drift from it. */
export function templateStructure({ slug, design }: Pick<ResumeTemplate, "slug" | "design">): TemplateStructure {
  if (slug === "modern" || design?.layout === "sidebar") return "Sidebar";
  return design?.layout === "columns" ? "Two column" : "Single column";
}

export const ORDER_NOTE = "This layout arranges some sections by design, so they may not follow your section order.";

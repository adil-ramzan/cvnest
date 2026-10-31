import { BookOpen, Briefcase, ChartLine, CircleUserRound, Code, FileText, GraduationCap, LayoutPanelLeft, type LucideIcon, Palette, Rows3 } from "lucide-react";
import type { TemplateStructure } from "@/data/template-tags";
import type { ResumeTemplate, TemplateCategory } from "@/data/templates";

/** What the gallery needs to know up front; the resume itself loads with its thumbnail. */
export type GalleryTemplate = Pick<ResumeTemplate, "slug" | "name" | "category" | "layout" | "description" | "bestFor" | "photo"> & {
  structure: TemplateStructure;
  search: string;
};

export type GalleryCategory = { id: TemplateCategory; label: string; count: number };

export const categoryDetails: Record<TemplateCategory, { idealFor: string; icon: LucideIcon }> = {
  simple: { idealFor: "Ideal when the words should do the talking, in any field.", icon: FileText },
  modern: { idealFor: "Ideal for tech, product and business roles that value a fresh look.", icon: LayoutPanelLeft },
  creative: { idealFor: "Ideal for design, media and marketing, where personality helps.", icon: Palette },
  photo: { idealFor: "Ideal for countries and roles where a headshot is expected.", icon: CircleUserRound },
  compact: { idealFor: "Ideal for long careers that need to fit on fewer pages.", icon: Rows3 },
  graduate: { idealFor: "Ideal for students and first jobs, with education up front.", icon: GraduationCap },
  executive: { idealFor: "Ideal for senior leaders who want a quiet, confident page.", icon: Briefcase },
  technical: { idealFor: "Ideal for engineers and developers who want structure over decoration.", icon: Code },
  academic: { idealFor: "Ideal for researchers and teachers with long records to organize.", icon: BookOpen },
  business: { idealFor: "Ideal for finance, sales and management roles where results come first.", icon: ChartLine },
};

export const INITIAL_CARDS = 6;

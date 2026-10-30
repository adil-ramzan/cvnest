import type { SectionType } from "@/data/resume";

/**
 * Declarative description of a resume design. `DesignTemplate` renders any
 * combination of these options from the same resume content, which is how the
 * template library stays consistent while looking genuinely different.
 */

export type FontKey =
  | "inter"
  | "sourceSerif"
  | "lora"
  | "playfair"
  | "montserrat"
  | "plexSans"
  | "spaceGrotesk"
  | "garamond"
  | "workSans";

/** CSS font stacks; the variables are defined by next/font in the root layout. */
export const fontStacks: Record<FontKey, string> = {
  inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  sourceSerif: "var(--font-source-serif), ui-serif, Georgia, serif",
  lora: "var(--font-lora), ui-serif, Georgia, serif",
  playfair: "var(--font-playfair), ui-serif, Georgia, serif",
  montserrat: "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
  plexSans: "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
  spaceGrotesk: "var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif",
  garamond: "var(--font-garamond), ui-serif, Georgia, serif",
  workSans: "var(--font-work-sans), ui-sans-serif, system-ui, sans-serif",
};

/** What a sidebar or secondary column holds, in display order. */
export type SidebarSection = SectionType | "contact";

export type HeadingStyle =
  | "rule" // small caps with a full-width rule underneath
  | "double" // centered caps between two rules
  | "caps" // accent-colored small caps
  | "line-after" // small caps followed by a hairline
  | "bar" // accent bar beside a sentence-case title
  | "underline" // title with a short accent underline
  | "pill" // tinted band behind the title
  | "serif" // larger sentence-case title with a thin rule
  | "boxed" // solid accent band with light text
  | "dot"; // accent dot before small caps

export type TemplateDesign = {
  layout: "single" | "sidebar" | "columns" | "timeline" | "labels";
  header: "left" | "center" | "split" | "banner" | "sidebar";
  fonts: { heading: FontKey; body: FontKey };
  colors: {
    accent: string;
    ink?: string;
    muted?: string;
    rule?: string;
    /** Light tint used behind pills and tags. */
    tint?: string;
    /** Text color on solid accent backgrounds. */
    onAccent?: string;
    banner?: { bg: string; ink: string; muted?: string; accent?: string };
  };
  /** Sidebar (layout "sidebar") or secondary column (layout "columns"). */
  side?: {
    position?: "left" | "right";
    width?: string;
    bg?: string;
    ink?: string;
    muted?: string;
    accent?: string;
    rule?: string;
    tint?: string;
    sections?: SidebarSection[];
  };
  heading: HeadingStyle;
  /** Heading style used inside the sidebar; defaults to `heading`. */
  sideHeading?: HeadingStyle;
  bullets: "disc" | "dash" | "square" | "arrow" | "dot" | "none";
  skills: "inline" | "list" | "tags" | "columns";
  dates: "right" | "below" | "left";
  density: "relaxed" | "normal" | "compact";
  name?: {
    size?: "md" | "lg" | "xl";
    weight?: "light" | "normal" | "semibold" | "bold" | "black";
    upper?: boolean;
    tracking?: "tight" | "normal" | "wide";
    accent?: boolean;
  };
  titleStyle?: "accent" | "muted" | "caps";
  subtitleStyle?: "muted" | "accent" | "italic";
  contactIcons?: boolean;
  /** Rule under the header block. */
  headerRule?: boolean;
  stripe?: "top" | "left";
  photo?: { shape: "circle" | "square" | "rounded"; mode: "always" | "if-present" };
};

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
  | "workSans"
  | "plexMono";

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
  plexMono: "var(--font-plex-mono), ui-monospace, monospace",
};

/**
 * Top and bottom padding of a printed page, in spacing units. Continuation pages get
 * the same space as page 1 from these, so they must match the padding each template
 * puts on its page (`densities` in DesignTemplate, and the hand-written templates).
 */
const designInsets: Record<TemplateDesign["density"], number> = { relaxed: 14, normal: 12, compact: 9 };
const handWrittenInsets: Record<string, number> = { minimal: 14 };

export const pageInset = (slug: string, design?: TemplateDesign) => (design ? designInsets[design.density] : (handWrittenInsets[slug] ?? 12));

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
  | "dot" // accent dot before small caps
  | "band-center" // tinted band with a centered title
  | "overline" // heavy rule above a short title
  | "tab" // solid accent tab sitting on a full-width rule
  | "flanked" // centered small caps with hairlines either side
  | "display" // large, light title with no rule
  | "outline-box" // small caps inside a thin box
  | "dotted" // title over a dotted line
  | "thick-under" // title over a heavy accent line
  | "corner" // title tucked into an L-shaped accent corner
  | "slab" // heavy, large uppercase title with no rule
  | "right-rule"; // right-aligned title over a hairline

export type TemplateDesign = {
  layout: "single" | "sidebar" | "columns" | "timeline" | "labels";
  header: "left" | "center" | "split" | "banner" | "sidebar" | "masthead" | "plate";
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
    banner?: {
      bg: string;
      ink: string;
      muted?: string;
      accent?: string;
      /** Lower edge of the banner: an angled cut, or a heavy rule in the accent color. */
      edge?: "slant" | "rule";
    };
    /** Page color behind everything, repeated on every PDF page. */
    paper?: string;
    /** Background of section cards. */
    card?: string;
    /** Three colors for the `ribbon` stripe, in order. */
    ribbon?: [string, string, string];
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
    /** Solid block behind the name at the top of a `sidebar` header. */
    block?: { bg: string; ink: string; muted?: string; accent?: string };
  };
  heading: HeadingStyle;
  /** Heading style used inside the sidebar; defaults to `heading`. */
  sideHeading?: HeadingStyle;
  bullets: "disc" | "dash" | "square" | "arrow" | "dot" | "none" | "ring";
  skills: "inline" | "list" | "tags" | "columns" | "outline" | "grid" | "pipe";
  dates: "right" | "below" | "left" | "chip" | "inline";
  density: "relaxed" | "normal" | "compact";
  name?: {
    size?: "md" | "lg" | "xl";
    weight?: "light" | "normal" | "semibold" | "bold" | "black";
    upper?: boolean;
    tracking?: "tight" | "normal" | "wide";
    accent?: boolean;
    /** First name above the rest of the name. */
    stack?: boolean;
    /** Job title on the same line as the name. */
    inlineTitle?: boolean;
    smallCaps?: boolean;
  };
  titleStyle?: "accent" | "muted" | "caps";
  subtitleStyle?: "muted" | "accent" | "italic";
  /** Entries as one-line "Title, Company" rows, or separated by hairlines. */
  entryStyle?: "inline" | "ruled";
  /** Each main-column section sits on its own card. */
  sectionCards?: boolean;
  /** Each main-column section hangs off a vertical accent line. */
  sectionRules?: boolean;
  /** Every second main-column section sits on a full-width tinted band. */
  sectionBands?: boolean;
  /** Sections shown across the full page, above a two-column body. */
  top?: SectionType[];
  /** Sections moved into a two-column grid below the main column. */
  lower?: SectionType[];
  contactIcons?: boolean;
  /** Header contact details in two columns instead of one wrapping row. */
  contactGrid?: boolean;
  /** Contact details in a tinted panel, in a split header. */
  contactBox?: boolean;
  /** Rule under the header block. */
  headerRule?: boolean;
  stripe?: "top" | "left" | "rail" | "ribbon" | "right" | "bookend" | "corner";
  /** Line drawn around the whole page, repeated on every PDF page. */
  frame?: "thin" | "double";
  /** Initials badge in a left header, for designs without a photo. */
  monogram?: boolean;
  /** Photo on the right of a left or banner header. */
  photoRight?: boolean;
  photo?: { shape: "circle" | "square" | "rounded"; mode: "always" | "if-present" };
};

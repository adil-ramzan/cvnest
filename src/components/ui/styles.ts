/**
 * Shared class names for interactive controls, so buttons, inputs and labels
 * look and behave the same across the site and the editor.
 */

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

/*
  Hover only applies on devices that can hover, so each variant repeats its hover look on
  active: touch screens then show the press too.
*/
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft active:bg-ink-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/35 hover:bg-canvas active:border-ink/35 active:bg-canvas",
  ghost: "text-ink hover:bg-ink/5 active:bg-ink/5",
  danger: "bg-[#b42318] text-white hover:bg-[#912018] active:bg-[#912018]",
  link: "text-accent-ink hover:text-ink active:text-ink",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-base",
  xl: "h-15 px-8 text-lg",
};

/**
 * Hover lift, arrow slide and pressed shade for the public site's filled and outlined
 * buttons (.site-button in globals.css). The editor's buttons don't use these.
 */
export const siteButtonMotion: Partial<Record<ButtonVariant, string>> = {
  primary: "site-button site-button--primary",
  secondary: "site-button site-button--secondary",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  const shape = variant === "link" ? "h-10 px-1 text-sm" : buttonSizes[size];
  return `inline-flex items-center justify-center gap-2 rounded-[14px] font-bold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${focusRing} ${buttonVariants[variant]} ${shape} ${extra}`;
}

/** Square icon-only button, 40px everywhere. */
export const iconButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink active:bg-ink/5 active:text-ink disabled:pointer-events-none disabled:opacity-30 " +
  focusRing;

/** A link inside running text: underlined, and on hover the link color with a full-strength underline. */
export const textLinkClass =
  "rounded-sm font-medium text-ink underline decoration-ink/40 underline-offset-4 transition-colors hover:text-accent-ink hover:decoration-current active:text-accent-ink " +
  focusRing;

/** A quiet standalone link (footer, breadcrumbs, related lists): muted until hovered, then ink and underlined. */
export const quietLinkClass =
  "text-muted underline-offset-4 decoration-1 transition-colors duration-150 ease-out hover:text-ink hover:underline active:text-ink";

/** Editor fields: 15px text, 16px on phones so iOS doesn't zoom in on focus. */
export const inputClass =
  "block w-full rounded-xl border border-line bg-panel px-3.5 text-base text-ink placeholder:text-placeholder transition-colors hover:border-ink/35 focus:border-accent focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-accent lg:text-[0.9375rem]";

export const labelClass = "block text-[0.875rem] font-medium text-ink-soft";
export const hintClass = "mt-1.5 text-sm text-muted";

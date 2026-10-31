/**
 * Shared class names for interactive controls, so buttons, inputs and labels
 * look and behave the same across the site and the editor.
 */

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/35 hover:bg-canvas",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-[#b42318] text-white hover:bg-[#912018]",
  link: "text-accent-ink hover:text-ink",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-base",
  xl: "h-15 px-8 text-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  const shape = variant === "link" ? "h-10 px-1 text-sm" : buttonSizes[size];
  return `inline-flex items-center justify-center gap-2 rounded-[14px] font-bold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${focusRing} ${buttonVariants[variant]} ${shape} ${extra}`;
}

/** Square icon-only button, 40px everywhere. */
export const iconButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30 " +
  focusRing;

/** Editor fields: 15px text, 16px on phones so iOS doesn't zoom in on focus. */
export const inputClass =
  "block w-full rounded-xl border border-line bg-panel px-3.5 text-base text-ink placeholder:text-placeholder transition-colors hover:border-ink/35 focus:border-accent focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-accent lg:text-[0.9375rem]";

export const labelClass = "block text-[0.875rem] font-medium text-ink-soft";
export const hintClass = "mt-1.5 text-sm text-muted";

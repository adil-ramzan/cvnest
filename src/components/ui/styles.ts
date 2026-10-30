/**
 * Shared class names for interactive controls, so buttons, inputs and labels
 * look and behave the same across the site and the editor.
 */

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/35 hover:bg-canvas",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-[#b42318] text-white hover:bg-[#912018]",
  link: "text-accent hover:text-ink",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  const shape = variant === "link" ? "h-10 px-1 text-sm" : buttonSizes[size];
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${focusRing} ${buttonVariants[variant]} ${shape} ${extra}`;
}

/** Square icon-only button; 40px on touch screens, 36px on desktop. */
export const iconButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30 lg:size-9 " +
  focusRing;

export const inputClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-placeholder transition-colors hover:border-[#bfb8ab] focus:border-accent focus:outline-3 focus:outline-offset-0 focus:outline-accent/20";

export const labelClass = "block text-sm font-medium text-ink-soft";
export const hintClass = "mt-1.5 text-sm text-muted";

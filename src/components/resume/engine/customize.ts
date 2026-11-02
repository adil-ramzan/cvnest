import type { ResumeCustomization } from "@/data/resume";
import { fontStacks, type TemplateDesign } from "./design";

const WHITE = "#ffffff";
const BLACK = "#000000";

/** Contrast small text needs against its background (WCAG AA). */
const READABLE_CONTRAST = 4.5;

const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

/** `amount` of `color` blended into `other`, from 0 to 1. */
export function mix(color: string, other: string, amount: number) {
  const base = channels(other);
  const blended = channels(color).map((value, i) => Math.round(value * amount + base[i] * (1 - amount)));
  return `#${blended.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const isDark = (hex: string) => luminance(hex) < 0.18;

const isTinted = (hex: string) => {
  const values = channels(hex);
  return Math.max(...values) - Math.min(...values) > 12;
};

/** Darkens a color just enough to stay readable as text on `background`. */
export function readableOn(color: string, background: string) {
  for (let amount = 1; amount > 0; amount -= 0.05) {
    const candidate = mix(color, BLACK, amount);
    if (contrast(candidate, background) >= READABLE_CONTRAST) return candidate;
  }
  return BLACK;
}

const tint = (color: string, amount: number) => mix(color, WHITE, amount);

/** A solid accent surface, and the text colors that sit on it. */
function solidSurface(accent: string) {
  const bg = readableOn(accent, WHITE);
  return { bg, ink: WHITE, muted: mix(WHITE, bg, 0.82), accent: mix(WHITE, bg, 0.82) };
}

function recolorSide(side: NonNullable<TemplateDesign["side"]>, accent: string) {
  const solid = solidSurface(accent);
  const block = side.block && { ...side.block, ...solid };
  if (!side.bg) return { ...side, block, ...(side.accent ? { accent } : {}) };
  if (isDark(side.bg)) return { ...side, ...solid, block, rule: mix(WHITE, solid.bg, 0.3), tint: undefined };
  return { ...side, bg: tint(accent, 0.08), tint: tint(accent, 0.2), rule: tint(accent, 0.28), block, ...(side.accent ? { accent } : {}) };
}

/** A template's design with the user's color in place of its own. Without one, the design is returned untouched. */
export function customizeDesign(design: TemplateDesign, { accentColor }: ResumeCustomization): TemplateDesign {
  if (!accentColor) return design;
  const { colors, side } = design;
  const accent = readableOn(accentColor, colors.paper ?? WHITE);
  return {
    ...design,
    colors: {
      ...colors,
      accent,
      onAccent: WHITE,
      tint: tint(accent, 0.12),
      rule: colors.rule && isTinted(colors.rule) ? tint(accent, 0.25) : colors.rule,
      banner: colors.banner && { ...colors.banner, ...solidSurface(accent) },
      ribbon: colors.ribbon && [accent, tint(accent, 0.6), tint(accent, 0.3)],
    },
    side: side && recolorSide(side, accent),
  };
}

/** The sidebar color of the hand-written Modern template, which has no design to recolor. */
export const modernSidebar = (accentColor?: string) => (accentColor ? tint(readableOn(accentColor, WHITE), 0.08) : "#eef4f2");

/** CSS variables on the resume paper. Unset choices stay out, so templates keep their own values. */
export function customizationVars({ accentColor, fontFamily, fontScale }: ResumeCustomization) {
  const accent = accentColor && readableOn(accentColor, WHITE);
  return {
    ...(accent ? { "--r-accent": accent, "--r-accent-rule": tint(accent, 0.2), "--r-accent-soft": modernSidebar(accent) } : {}),
    ...(fontFamily ? { "--resume-font": fontStacks[fontFamily] } : {}),
    ...(fontScale ? { "--resume-font-scale": fontScale } : {}),
  };
}

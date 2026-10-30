import type { FontKey } from "@/components/resume/engine/design";

/**
 * Static font files for PDF export in Firefox.
 *
 * Firefox's PDF output drops text set in a variable font at any weight but the
 * font's default: it draws the outlines, so the words can't be selected or
 * searched. Other browsers keep using the variable fonts from next/font; these
 * files in public/fonts/print are only requested by Firefox, during export.
 */
const families: Record<FontKey, { file: string; name: string; variable: string; weights: number[]; italic: boolean }> = {
  inter: { file: "inter", name: "Inter", variable: "--font-inter", weights: [300, 400, 500, 600, 700, 900], italic: true },
  sourceSerif: { file: "source-serif", name: "Source Serif", variable: "--font-source-serif", weights: [300, 400, 500, 600, 700, 900], italic: true },
  lora: { file: "lora", name: "Lora", variable: "--font-lora", weights: [400, 500, 600, 700], italic: true },
  playfair: { file: "playfair", name: "Playfair", variable: "--font-playfair", weights: [400, 500, 600, 700, 900], italic: true },
  montserrat: { file: "montserrat", name: "Montserrat", variable: "--font-montserrat", weights: [300, 400, 500, 600, 700, 900], italic: true },
  plexSans: { file: "plex-sans", name: "Plex Sans", variable: "--font-plex-sans", weights: [300, 400, 500, 600, 700], italic: true },
  spaceGrotesk: { file: "space-grotesk", name: "Space Grotesk", variable: "--font-space-grotesk", weights: [300, 400, 500, 600, 700], italic: false },
  garamond: { file: "garamond", name: "Garamond", variable: "--font-garamond", weights: [400, 500, 600, 700, 800], italic: true },
  workSans: { file: "work-sans", name: "Work Sans", variable: "--font-work-sans", weights: [300, 400, 500, 600, 700, 900], italic: true },
};

const printFamily = (key: FontKey) => `Print ${families[key].name}`;

const face = (key: FontKey, weight: number, style: "normal" | "italic") =>
  `@font-face { font-family: "${printFamily(key)}"; font-weight: ${weight}; font-style: ${style}; font-display: block; src: url("/fonts/print/${families[key].file}-${weight}${style === "italic" ? "-italic" : ""}.woff") format("woff"); }`;

const keys = Object.keys(families) as FontKey[];

/** @font-face rules plus the font variables, re-pointed at the static families inside the print copy. */
export const staticFontCss = [
  ...keys.flatMap((key) => [
    ...families[key].weights.map((weight) => face(key, weight, "normal")),
    ...(families[key].italic ? [face(key, 400, "italic")] : []),
  ]),
  `.print-root--gecko { font-family: "${printFamily("inter")}", ui-sans-serif, system-ui, sans-serif; ${keys
    .map((key) => `${families[key].variable}: "${printFamily(key)}";`)
    .join(" ")} }`,
].join("\n");

/**
 * Printing doesn't wait for fonts, and the print copy is hidden on screen so
 * nothing would request them first. A failed font only means that text falls
 * back to the variable font, so failures are ignored.
 */
export async function loadStaticFonts(used: FontKey[]) {
  const names = new Set(used.map(printFamily));
  const faces = [...document.fonts].filter((font) => names.has(font.family.replace(/"/g, "")));
  await Promise.allSettled(faces.map((font) => font.load()));
}

export function needsStaticFonts() {
  return /\bFirefox\//.test(navigator.userAgent);
}

"use client";

import { Check, Minus, Plus } from "lucide-react";
import { fontStacks } from "@/components/resume/engine/design";
import { buttonClass, focusRing } from "@/components/ui/styles";
import { FONT_SCALE, RESUME_FONTS, type ResumeCustomization, type ResumeFont } from "@/data/resume";

export const chipClass =
  "inline-flex h-10 pointer-coarse:h-11 items-center rounded-full border border-line px-3.5 text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white";

const colors = [
  { label: "Navy", value: "#1f3a5f" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Teal", value: "#0f766e" },
  { label: "Forest", value: "#166534" },
  { label: "Burgundy", value: "#881337" },
  { label: "Plum", value: "#6b21a8" },
  { label: "Rust", value: "#9a3412" },
  { label: "Slate", value: "#334155" },
  { label: "Charcoal", value: "#27272a" },
];

const fontLabels: Record<ResumeFont, string> = {
  inter: "Inter",
  plexSans: "IBM Plex Sans",
  montserrat: "Montserrat",
  sourceSerif: "Source Serif",
  lora: "Lora",
  garamond: "EB Garamond",
};

const sizes = [
  { label: "Small", value: FONT_SCALE.small },
  { label: "Medium", value: 1 },
  { label: "Large", value: FONT_SCALE.large },
];

const groupLabel = "text-sm font-medium text-ink";
const swatchClass = `flex size-10 pointer-coarse:size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-ink ${focusRing}`;
const stepClass = `flex size-10 pointer-coarse:size-11 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40 ${focusRing}`;

type StyleControlsProps = {
  customization: ResumeCustomization;
  onChange: (customization: ResumeCustomization) => void;
};

export function StyleControls({ customization, onChange }: StyleControlsProps) {
  const { accentColor, fontFamily, fontScale = 1 } = customization;
  const isPreset = colors.some((color) => color.value === accentColor);
  const customized = accentColor !== undefined || fontFamily !== undefined || fontScale !== 1;

  const setScale = (value: number) => {
    const scale = Math.round(value * 100) / 100;
    onChange({ fontScale: scale === 1 ? undefined : scale });
  };

  return (
    <div className="mt-5 space-y-6">
      <div role="group" aria-labelledby="style-color">
        <p id="style-color" className={groupLabel}>
          Color
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <button type="button" aria-pressed={!accentColor} onClick={() => onChange({ accentColor: undefined })} className={chipClass}>
            Template
          </button>
          {colors.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={color.label}
              aria-pressed={accentColor === color.value}
              onClick={() => onChange({ accentColor: color.value })}
              className={swatchClass}
              style={{ backgroundColor: color.value }}
            >
              {accentColor === color.value && <Check aria-hidden="true" className="size-4 text-white" />}
            </button>
          ))}
          <label className={`inline-flex h-10 pointer-coarse:h-11 cursor-pointer items-center gap-2 rounded-full border px-2 pr-3.5 text-sm text-ink-soft hover:border-line-strong hover:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${accentColor && !isPreset ? "border-ink" : "border-line"}`}>
            <input
              type="color"
              value={accentColor ?? colors[0].value}
              onChange={(event) => onChange({ accentColor: event.target.value })}
              className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
            Custom
          </label>
        </div>
        <p className="mt-2 text-sm text-muted">Very light colors are darkened so your text stays readable.</p>
      </div>

      <div role="group" aria-labelledby="style-font">
        <p id="style-font" className={groupLabel}>
          Font
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!fontFamily} onClick={() => onChange({ fontFamily: undefined })} className={chipClass}>
            Template
          </button>
          {RESUME_FONTS.map((font) => (
            <button
              key={font}
              type="button"
              aria-pressed={fontFamily === font}
              onClick={() => onChange({ fontFamily: font })}
              className={chipClass}
              style={{ fontFamily: fontStacks[font] }}
            >
              {fontLabels[font]}
            </button>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="style-size">
        <p id="style-size" className={groupLabel}>
          Text size
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {sizes.map((size) => (
            <button key={size.label} type="button" aria-pressed={fontScale === size.value} onClick={() => setScale(size.value)} className={chipClass}>
              {size.label}
            </button>
          ))}
          <div className="flex items-center gap-1 sm:ml-2">
            <button
              type="button"
              aria-label="Decrease text size"
              disabled={fontScale <= FONT_SCALE.min}
              onClick={() => setScale(fontScale - FONT_SCALE.step)}
              className={stepClass}
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <output aria-live="polite" className="w-12 text-center text-sm text-muted tabular-nums">
              {Math.round(fontScale * 100)}%
            </output>
            <button
              type="button"
              aria-label="Increase text size"
              disabled={fontScale >= FONT_SCALE.max}
              onClick={() => setScale(fontScale + FONT_SCALE.step)}
              className={stepClass}
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {customized && (
        <button
          type="button"
          onClick={() => onChange({ accentColor: undefined, fontFamily: undefined, fontScale: undefined })}
          className={buttonClass("secondary", "sm", "h-10 px-3.5")}
        >
          Reset to template style
        </button>
      )}
    </div>
  );
}

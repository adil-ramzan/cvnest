"use client";

import { type CSSProperties, useRef, useState } from "react";
import { inputClass } from "@/components/ui/styles";
import { LIMITS } from "@/lib/resume-limits";
import { DEFAULT_RESUME_NAME } from "@/lib/resume-schema";

type ResumeNameInputProps = {
  name: string;
  /** Accessible name of the field. */
  label: string;
  className?: string;
  /** Grow and shrink with the text, so swapping a title for this field doesn't shift what's around it. */
  fitText?: boolean;
  onSave: (name: string) => void;
  onDone: () => void;
};

/**
 * A resume's name, edited in place (Overview list and editor header). Enter or leaving
 * the field saves; Escape puts the old name back. An empty name becomes "Untitled
 * resume". The cap matches the Rename dialog's, so saving never cuts an existing name short.
 */
export function ResumeNameInput({ name, label, className = "", fitText = false, onSave, onDone }: ResumeNameInputProps) {
  const [draft, setDraft] = useState(name);
  // Set once Enter or Escape has handled it, so the blur that follows doesn't save again.
  const finished = useRef(false);
  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const next = draft.trim().slice(0, LIMITS.title) || DEFAULT_RESUME_NAME;
    if (save && next !== name) onSave(next);
    onDone();
  };
  // 4ch of room for padding and the caret; capped by the parent's max width.
  const style: CSSProperties | undefined = fitText ? { width: `${Math.max(draft.length, 6) + 4}ch` } : undefined;

  return (
    <input
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      value={draft}
      maxLength={LIMITS.title}
      aria-label={label}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      style={style}
      className={`${inputClass} text-base font-medium text-ink ${className}`}
    />
  );
}

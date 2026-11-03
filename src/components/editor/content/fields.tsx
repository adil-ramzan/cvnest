"use client";

import { Plus, X } from "lucide-react";
import { type HTMLInputTypeAttribute, useId, useState } from "react";
import type { Skill } from "@/data/resume";
import { COUNTER_THRESHOLD, LIMITS } from "@/lib/resume-limits";
import { newSkill } from "@/lib/resumes";
import { sampleEntryElementId } from "@/lib/sample-content";
import { buttonClass, hintClass, inputClass, labelClass } from "@/components/ui/styles";

export { inputClass };

/** Marks content that came from "Load sample data". Only ever shown in the editor. */
export function SampleTag() {
  return <span className="shrink-0 rounded-full bg-[#fffaeb] px-2 py-0.5 text-xs font-medium text-[#93370d] ring-1 ring-[#fedf89]">Sample</span>;
}

/** Shown as a field nears its limit; the message at the limit is announced to screen readers. */
function LimitNote({ length, limit }: { length: number; limit: number }) {
  if (length < limit * COUNTER_THRESHOLD) return null;
  const full = length >= limit;
  return (
    <p role={full ? "status" : undefined} className={`mt-1.5 text-right text-[0.875rem] ${full ? "font-medium text-[#b42318]" : "text-muted"}`}>
      {full ? `Limit reached: ${limit.toLocaleString("en-US")} characters maximum` : `${length.toLocaleString("en-US")} / ${limit.toLocaleString("en-US")}`}
    </p>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  autoFocus?: boolean;
  hint?: string;
  className?: string;
  maxLength?: number;
  /** Still holds sample text. */
  sample?: boolean;
  /** Natural-language text, so the browser's spell check is useful here. */
  prose?: boolean;
};

export function TextField({ label, value, onChange, placeholder, type = "text", autoComplete, autoFocus, hint, className = "", maxLength = LIMITS.text, sample, prose }: TextFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {sample && (
          <span className="ml-2 align-middle">
            <SampleTag />
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? "off"}
        autoFocus={autoFocus}
        maxLength={maxLength}
        {...(prose ? { spellCheck: true, lang: "en" } : {})}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${inputClass} mt-2 h-11`}
      />
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      <LimitNote length={value.length} limit={maxLength} />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  className?: string;
  /** One item per line, as in bullet points. */
  maxLines?: number;
};

export function TextArea({ label, value, onChange, placeholder, rows = 4, hint, className = "", maxLines }: TextAreaProps) {
  const id = useId();
  const lineCount = value.split("\n").length;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(maxLines ? next.split("\n").slice(0, Math.max(maxLines, lineCount)).join("\n") : next);
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={LIMITS.text}
        spellCheck
        lang="en"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${inputClass} mt-2 resize-y py-2.5 leading-relaxed`}
      />
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      <LimitNote length={value.length} limit={LIMITS.text} />
      {maxLines && lineCount >= maxLines && (
        <p role="status" className="mt-1.5 text-right text-[0.875rem] font-medium text-[#b42318]">
          Limit reached: {maxLines} bullet points maximum
        </p>
      )}
    </div>
  );
}

type TagInputProps = {
  label: string;
  /** Singular noun used in button and screen reader labels, e.g. "skill". */
  itemName: string;
  items: Skill[];
  onChange: (items: Skill[]) => void;
  /** Called after an item is removed, so it can be offered for undo. */
  onDeleted: (item: Skill, index: number, title: string) => void;
  placeholder?: string;
  hint?: string;
};

/** Add/remove short values such as skills. Enter or comma adds the typed value; existing ids are kept. */
export function TagInput({ label, itemName, items, onChange, onDeleted, placeholder, hint }: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const full = items.length >= LIMITS.entries;

  const add = () => {
    const values = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const existing = new Set(items.map((item) => item.name.toLowerCase()));
    const fresh = values.filter((value) => {
      const key = value.toLowerCase();
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    if (fresh.length) onChange([...items, ...fresh.slice(0, LIMITS.entries - items.length).map(newSkill)]);
    setDraft("");
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-describedby={`${id}-hint`}
          className={`${inputClass} h-11`}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || full}
          className={buttonClass("secondary", "md", "shrink-0")}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add
        </button>
      </div>
      <p id={`${id}-hint`} role={full ? "status" : undefined} className={hintClass}>
        {full ? `Limit reached: ${LIMITS.entries} maximum.` : (hint ?? "Press Enter or comma to add.")}
      </p>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label} added`}>
          {items.map((item, index) => (
            <li
              key={item.id}
              id={item.sample ? sampleEntryElementId(item.id) : undefined}
              className="inline-flex scroll-mt-36 items-center gap-1 rounded-full bg-canvas py-1 pr-1 pl-3.5 text-sm text-ink ring-1 ring-line"
            >
              {item.name}
              {item.sample && <SampleTag />}
              <button
                type="button"
                onClick={() => {
                  onChange(items.filter((other) => other.id !== item.id));
                  onDeleted(item, index, item.name);
                }}
                aria-label={`Remove ${itemName} ${item.name}`}
                className="-m-1.5 inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

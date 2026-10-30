"use client";

import { Plus, X } from "lucide-react";
import { type HTMLInputTypeAttribute, useId, useState } from "react";
import type { Skill } from "@/data/resume";
import { newSkill } from "@/lib/resumes";
import { buttonClass, hintClass, inputClass, labelClass } from "@/components/ui/styles";

export { inputClass };

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
};

export function TextField({ label, value, onChange, placeholder, type = "text", autoComplete, autoFocus, hint, className = "" }: TextFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? "off"}
        autoFocus={autoFocus}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${inputClass} mt-2 h-11`}
      />
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
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
};

export function TextArea({ label, value, onChange, placeholder, rows = 4, hint, className = "" }: TextAreaProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={`${inputClass} mt-2 resize-y py-2.5 leading-relaxed`}
      />
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
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
  placeholder?: string;
  hint?: string;
};

/** Add/remove short values such as skills. Enter or comma adds the typed value; existing ids are kept. */
export function TagInput({ label, itemName, items, onChange, placeholder, hint }: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

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
    if (fresh.length) onChange([...items, ...fresh.map(newSkill)]);
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
          disabled={!draft.trim()}
          className={buttonClass("secondary", "md", "shrink-0")}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add
        </button>
      </div>
      <p id={`${id}-hint`} className={hintClass}>
        {hint ?? "Press Enter or comma to add."}
      </p>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label} added`}>
          {items.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-canvas py-1 pr-1 pl-3.5 text-sm text-ink ring-1 ring-line"
            >
              {item.name}
              <button
                type="button"
                onClick={() => onChange(items.filter((other) => other.id !== item.id))}
                aria-label={`Remove ${itemName} ${item.name}`}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-ink/10 hover:text-ink"
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

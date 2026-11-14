"use client";

import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { focusRing } from "@/components/ui/styles";
import { type ResumeTemplate, templateCategories, templates } from "@/data/templates";

const groups = templateCategories.map((category) => ({
  ...category,
  items: templates.filter((item) => item.category === category.id),
}));
const ordered = groups.flatMap((group) => group.items);

const PAGE_STEP = 8;
const TYPE_AHEAD_RESET_MS = 500;

const triggerClass = `h-10 pointer-coarse:h-11 max-w-52 rounded-lg border border-line bg-surface pr-8 pl-3 text-left text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong ${focusRing}`;

type TemplatePickerProps = {
  template: ResumeTemplate;
  onChange: (slug: string) => void;
};

/** A list on computers. Touch screens keep the native select, whose system picker suits them better. */
export function TemplatePicker({ template, onChange }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const labelId = useId();
  const selectId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const optionId = (slug: string) => `${listId}-${slug}`;
  const activeSlug = ordered[active]?.slug;

  const show = () => {
    setActive(Math.max(ordered.findIndex((item) => item.slug === template.slug), 0));
    setOpen(true);
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const choose = (slug: string) => {
    close();
    if (slug !== template.slug) onChange(slug);
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && activeSlug) document.getElementById(`${listId}-${activeSlug}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeSlug, listId]);

  const typeAhead = (key: string, now: number) => {
    const text = now - typed.current.at > TYPE_AHEAD_RESET_MS ? key : typed.current.text + key;
    typed.current = { text, at: now };
    const match = ordered.findIndex((item) => item.name.toLowerCase().startsWith(text.toLowerCase()));
    if (match >= 0) setActive(match);
  };

  const onListKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowUp: active - 1,
      PageDown: active + PAGE_STEP,
      PageUp: active - PAGE_STEP,
      Home: 0,
      End: ordered.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(Math.min(Math.max(moves[event.key], 0), ordered.length - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (activeSlug) choose(activeSlug);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      close(false);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeAhead(event.key, event.timeStamp);
    }
  };

  return (
    <div ref={rootRef} className="relative flex min-w-0 items-center gap-2">
      <label id={labelId} htmlFor={selectId} className="text-[0.875rem] text-muted">
        Template
      </label>
      <div className="relative min-w-0">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${labelId} ${listId}-value`}
          onClick={() => (open ? close() : show())}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault();
              show();
            }
          }}
          className={`${triggerClass} block w-full truncate pointer-coarse:hidden`}
        >
          <span id={`${listId}-value`}>{template.name}</span>
        </button>

        <select
          id={selectId}
          value={template.slug}
          onChange={(event) => onChange(event.target.value)}
          className={`${triggerClass} hidden w-full appearance-none pointer-coarse:block`}
        >
          {groups.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.items.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
      </div>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={activeSlug ? optionId(activeSlug) : undefined}
          onKeyDown={onListKeyDown}
          // The active option shows focus, and the site-wide focus rule outranks utility classes.
          style={{ outline: "none" }}
          className="editor-scroll absolute top-full left-0 z-50 mt-1.5 max-h-[min(24rem,60dvh)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          {groups.map((group) => (
            <div key={group.id} role="group" aria-labelledby={`${listId}-${group.id}`}>
              <div id={`${listId}-${group.id}`} className="sticky -top-1.5 z-10 bg-surface px-2.5 pt-2.5 pb-1 text-[0.8125rem] font-bold text-muted">
                {group.label}
              </div>
              {group.items.map((item) => {
                const selected = item.slug === template.slug;
                return (
                  <div
                    key={item.slug}
                    id={optionId(item.slug)}
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(item.slug)}
                    onMouseMove={() => setActive(ordered.indexOf(item))}
                    className={`flex h-10 pointer-coarse:h-11 cursor-pointer scroll-mt-9 items-center gap-2.5 rounded-lg px-2.5 text-[0.875rem] ${
                      selected ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-soft"
                    } ${item.slug === activeSlug ? "outline-2 -outline-offset-2 outline-accent" : ""}`}
                  >
                    <Check aria-hidden="true" className={`size-4 shrink-0 ${selected ? "text-accent" : "invisible"}`} />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className={`shrink-0 text-[0.8125rem] font-normal ${selected ? "text-accent-ink" : "text-muted"}`}>{item.layout}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

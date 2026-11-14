"use client";

import { type LucideIcon, Plus } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { buttonClass, focusRing } from "@/components/ui/styles";
import { accordionDuration, keepInView } from "./accordion";

export type AddSectionOption = { label: string; description?: string; icon: LucideIcon; onSelect: () => void };

type AddSectionPanelProps = {
  options: AddSectionOption[];
  /** Every optional section is already on the resume (custom sections can always be added). */
  allAdded: boolean;
};

/**
 * "Add section" and its choices, which open in the page under the button, the way a card
 * opens (see .accordion-body in globals.css). The page scrolls just enough to show them.
 */
export function AddSectionPanel({ options, allAdded }: AddSectionPanelProps) {
  const [open, setOpen] = useState(false);
  // The options fade in one by one each time the panel opens.
  const [stagger, setStagger] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    setStagger(true);
    const timer = setTimeout(() => setStagger(false), accordionDuration() + 50);
    const stopScrolling = keepInView(rootRef.current);
    return () => {
      clearTimeout(timer);
      stopScrolling();
      setStagger(false);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const items = [...(listRef.current?.querySelectorAll("button") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && items.length) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length].focus();
    }
  };

  const choose = (option: AddSectionOption) => {
    option.onSelect();
    setOpen(false);
    // Back to the button, unless choosing moved focus somewhere useful (a custom section's name field).
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body || rootRef.current?.querySelector(`#${CSS.escape(panelId)}`)?.contains(active)) buttonRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <div ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={buttonClass("secondary", "lg", `accordion-toggle h-14 w-full ${open ? "border-ink/35 shadow-soft" : ""}`)}
      >
        <Plus aria-hidden="true" className={`accordion-chevron size-5 ${open ? "rotate-45" : ""}`} />
        Add section
      </button>
      <div id={panelId} role="region" aria-label="Sections you can add" inert={!open} data-open={open || undefined} data-stagger={stagger || undefined} className="accordion-body">
        <div className="accordion-inner">
          <div className="pt-2">
            <div className="rounded-[22px] bg-surface p-1.5 shadow-soft">
              {allAdded && <p className="px-3 py-2.5 text-sm text-muted">All sections added.</p>}
              <ul ref={listRef} className="stagger-list">
                {options.map((option) => {
                  const Icon = option.icon;
                  return (
                    <li key={option.label}>
                      <button
                        type="button"
                        onClick={() => choose(option)}
                        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink transition-colors duration-150 hover:bg-ink/5 motion-reduce:transition-none ${focusRing} focus-visible:outline-offset-0`}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0 opacity-70" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{option.label}</span>
                          {option.description && <span className="line-clamp-2 block text-sm text-muted">{option.description}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

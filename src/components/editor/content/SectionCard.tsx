"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { accordionDuration } from "./accordion";
import { SampleTag } from "./fields";

type SectionCardProps = {
  id: string;
  title: ReactNode;
  icon: LucideIcon;
  /** Short status shown under the title, e.g. "3 entries". */
  summary?: string;
  /** Small label beside the title, e.g. "Hidden". */
  badge?: string;
  /** The section's own text is still sample text. */
  sample?: boolean;
  open: boolean;
  onToggle: () => void;
  /** Controls beside the header (e.g. a section options menu). */
  actions?: ReactNode;
  /** Replaces the toggle button, e.g. with an inline rename field. */
  headerOverride?: ReactNode;
  children: ReactNode;
};

/**
 * One collapsible card in the editor panel. The body stays mounted, so typing survives
 * closing and reopening; its height animates by growing a grid row (see .accordion-body in
 * globals.css). A closed body is inert, so nothing in it can be reached or read.
 */
export function SectionCard({ id, title, icon: Icon, summary, badge, sample, open, onToggle, actions, headerOverride, children }: SectionCardProps) {
  const bodyId = `section-body-${id}`;
  // Entries fade in one by one the first time the card opens, not on later opens or re-renders.
  const [stagger, setStagger] = useState(false);
  const opened = useRef(open);
  useEffect(() => {
    if (!open || opened.current) return;
    opened.current = true;
    setStagger(true);
  }, [open]);
  // Ends the stagger once it has played. Tied to the flag, not to `open`, so closing the
  // card early can't leave it on (entries would then replay it when moved).
  useEffect(() => {
    if (!stagger) return;
    const timer = setTimeout(() => setStagger(false), accordionDuration() + 50);
    return () => clearTimeout(timer);
  }, [stagger]);

  return (
    <section id={`section-${id}`} className="accordion-card scroll-mt-36 rounded-[22px] lg:scroll-mt-24 bg-surface shadow-soft">
      <div className="flex items-center gap-1.5 pr-2 pl-4 sm:pl-5">
        {headerOverride ?? (
          <h2 className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={bodyId}
              // The hover background reaches 8px past the content on the left and into the gap on the right, so nothing moves.
              className="group -mr-1.5 -ml-2 flex w-[calc(100%+0.875rem)] items-center gap-3.5 rounded-xl py-3.5 pr-1.5 pl-2 text-left transition-colors duration-150 hover:bg-ink/[0.035] focus-visible:outline-offset-0 motion-reduce:transition-none"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-lg font-bold text-ink">{title}</span>
                  {badge && <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-muted">{badge}</span>}
                  {sample && <SampleTag />}
                </span>
                {summary && <span className="block truncate text-[0.875rem] text-muted">{summary}</span>}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`accordion-chevron size-5 shrink-0 text-muted group-hover:text-ink ${open ? "rotate-180" : ""}`}
              />
            </button>
          </h2>
        )}
        {actions}
      </div>
      <div id={bodyId} inert={!open} data-open={open || undefined} data-stagger={stagger || undefined} className="accordion-body">
        <div className="accordion-inner">
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

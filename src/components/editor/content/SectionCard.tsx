"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SectionCardProps = {
  id: string;
  title: ReactNode;
  icon: LucideIcon;
  /** Short status shown under the title, e.g. "3 entries". */
  summary?: string;
  /** Small label beside the title, e.g. "Hidden". */
  badge?: string;
  open: boolean;
  onToggle: () => void;
  /** Controls beside the header (e.g. a section options menu). */
  actions?: ReactNode;
  /** Replaces the toggle button, e.g. with an inline rename field. */
  headerOverride?: ReactNode;
  children: ReactNode;
};

/** One collapsible card in the editor panel. */
export function SectionCard({ id, title, icon: Icon, summary, badge, open, onToggle, actions, headerOverride, children }: SectionCardProps) {
  const bodyId = `section-body-${id}`;

  return (
    <section id={`section-${id}`} className="scroll-mt-36 rounded-[22px] lg:scroll-mt-24 bg-surface shadow-soft">
      <div className="flex items-center gap-1.5 pr-2 pl-4 sm:pl-5">
        {headerOverride ?? (
          <h2 className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={bodyId}
              className="group flex w-full items-center gap-3.5 rounded-xl py-3.5 text-left focus-visible:outline-offset-0"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-lg font-bold text-ink">{title}</span>
                  {badge && <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-muted">{badge}</span>}
                </span>
                {summary && <span className="block truncate text-[0.875rem] text-muted">{summary}</span>}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-5 shrink-0 text-muted transition-transform group-hover:text-ink motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
              />
            </button>
          </h2>
        )}
        {actions}
      </div>
      <div id={bodyId} hidden={!open} className="px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </section>
  );
}

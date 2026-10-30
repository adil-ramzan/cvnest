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

/** One collapsible block in the editor panel, separated from its neighbours by a divider. */
export function SectionCard({ id, title, icon: Icon, summary, badge, open, onToggle, actions, headerOverride, children }: SectionCardProps) {
  const bodyId = `section-body-${id}`;

  return (
    <section id={`section-${id}`} className="scroll-mt-2 border-b border-line">
      <div className="flex items-center gap-1 px-4 sm:px-6">
        {headerOverride ?? (
          <h2 className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={bodyId}
              className="group flex w-full items-center gap-3.5 py-4 text-left focus-visible:outline-offset-0"
            >
              <Icon aria-hidden="true" className="size-5 shrink-0 text-muted group-hover:text-ink" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-lg font-semibold text-ink">{title}</span>
                  {badge && <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-muted">{badge}</span>}
                </span>
                {summary && <span className="block truncate text-sm text-muted">{summary}</span>}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-5 shrink-0 text-muted transition-transform group-hover:text-ink ${open ? "rotate-180" : ""}`}
              />
            </button>
          </h2>
        )}
        {actions}
      </div>
      <div id={bodyId} hidden={!open} className="px-4 pt-1 pb-7 sm:px-6">
        {children}
      </div>
    </section>
  );
}

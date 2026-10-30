"use client";

import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { getTemplate } from "@/data/templates";
import type { Resume, SectionType } from "@/data/resume";
import { buttonClass, iconButtonClass } from "@/components/ui/styles";
import { PrivacyDetails } from "./PrivacyNote";

type OverviewTabProps = {
  resumes: Resume[];
  active: Resume;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onEditSection: (sectionId: string) => void;
};

export const formatUpdated = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const smallButton = buttonClass("secondary", "sm");
const iconButton = iconButtonClass;

export function OverviewTab({ resumes, active, onSelect, onCreate, onRename, onDuplicate, onDelete, onEditSection }: OverviewTabProps) {
  const { profile, sections } = active;
  const sectionStatus = (type: SectionType, label: string) => {
    const section = sections.find((s) => s.type === type);
    const done = section ? (section.type === "summary" ? !!section.content.trim() : section.entries.length > 0) : false;
    return { id: section?.id, label, done };
  };
  const checklist = [
    { id: "personal", label: "Name and contact details", done: !!(profile.fullName.trim() && profile.email.trim()) },
    sectionStatus("summary", "Professional summary"),
    sectionStatus("experience", "Work experience"),
    sectionStatus("education", "Education"),
    sectionStatus("skills", "Skills"),
  ];
  const completed = checklist.filter((item) => item.done).length;
  const sorted = [...resumes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div>
      <Card
        title="Current resume"
        action={
          <button type="button" onClick={() => onRename(active.id)} className={smallButton}>
            <Pencil aria-hidden="true" className="size-4" />
            Rename
          </button>
        }
      >
        <p className="text-xl font-semibold break-words text-ink">{active.name}</p>
        <p className="mt-1 text-base text-muted">
          {getTemplate(active.design.templateId)?.name} template · Last edited {formatUpdated(active.updatedAt)}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Essentials</span>
            <span>
              {completed} of {checklist.length} done
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(completed / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-4 divide-y divide-line">
            {checklist.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => onEditSection(item.id ?? "add-section")}
                  className="flex min-h-12 w-full items-center gap-3 py-2.5 text-left text-base hover:text-ink"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-accent bg-accent text-white" : "border-line-strong"}`}
                  >
                    {item.done && <Check aria-hidden="true" className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={`flex-1 ${item.done ? "text-ink-soft" : "text-ink"}`}>{item.label}</span>
                  <span className="sr-only">{item.done ? "(done)" : "(not started)"}</span>
                  <span className="text-sm font-medium text-accent">Edit</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card
        title={`Your resumes (${resumes.length})`}
        action={
          <button type="button" onClick={onCreate} className={smallButton}>
            <Plus aria-hidden="true" className="size-4" />
            New resume
          </button>
        }
      >
        <ul className="divide-y divide-line">
          {sorted.map((resume) => {
            const isActive = resume.id === active.id;
            return (
              <li key={resume.id} className="flex items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-ink">
                    {resume.name}
                    {isActive && (
                      <span className="ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                        Open
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {getTemplate(resume.design.templateId)?.name} · {formatUpdated(resume.updatedAt)}
                  </p>
                </div>
                {!isActive && (
                  <button type="button" onClick={() => onSelect(resume.id)} className={smallButton}>
                    Open
                  </button>
                )}
                <button type="button" onClick={() => onDuplicate(resume.id)} aria-label={`Duplicate ${resume.name}`} className={iconButton}>
                  <Copy aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(resume.id)}
                  aria-label={`Delete ${resume.name}`}
                  className={`${iconButton} hover:bg-[#fef3f2] hover:text-[#b42318]`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Privacy and storage">
        <PrivacyDetails />
      </Card>
    </div>
  );
}

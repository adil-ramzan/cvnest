"use client";

import { AlertTriangle, ChevronDown, Copy, Download, HardDrive, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useRef } from "react";
import { getTemplate } from "@/data/templates";
import { site } from "@/data/site";
import type { Resume } from "@/data/resume";
import { buttonClass } from "@/components/ui/styles";
import { Menu, type MenuItem } from "./Menu";
import type { SaveStatus } from "./useResumeStore";

export type EditorTab = "overview" | "content" | "customize";

export const editorTabs: { id: EditorTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "customize", label: "Customize" },
];

export const tabId = (tab: EditorTab) => `editor-tab-${tab}`;
export const tabPanelId = "editor-tabpanel";

type EditorTopBarProps = {
  resumes: Resume[];
  active: Resume;
  saveStatus: SaveStatus;
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  onSelectResume: (id: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDownload: () => void;
  /** True while the PDF is being prepared or the print dialog is open. */
  downloading: boolean;
};

const statusContent: Record<SaveStatus, { icon: typeof HardDrive; text: string; detail: string; className: string }> = {
  saved: {
    icon: HardDrive,
    text: "Saved locally",
    detail: "All changes are saved in this browser.",
    className: "text-muted",
  },
  saving: {
    icon: Loader2,
    text: "Saving…",
    detail: "Saving changes in this browser.",
    className: "text-muted",
  },
  error: {
    icon: AlertTriangle,
    text: "Not saved",
    detail: "Your browser refused to save. Storage may be full or blocked. Your changes stay open in this tab.",
    className: "text-[#b42318]",
  },
  unavailable: {
    icon: AlertTriangle,
    text: "Storage unavailable",
    detail: "Browser storage is blocked or disabled, so changes will be lost when you close this tab.",
    className: "text-[#b54708]",
  },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { icon: Icon, text, detail, className } = statusContent[status];
  const isProblem = status === "error" || status === "unavailable";
  return (
    <>
      <span title={detail} className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${className}`}>
        <Icon aria-hidden="true" className={`size-4 ${status === "saving" ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{text}</span>
        <span className="sr-only sm:hidden">{text}</span>
      </span>
      {/* Only announce problems; announcing every autosave would be noisy. */}
      <span role="status" className="sr-only">
        {isProblem ? `${text}. ${detail}` : ""}
      </span>
    </>
  );
}

function Tabs({ tab, onTabChange, className = "" }: { tab: EditorTab; onTabChange: (tab: EditorTab) => void; className?: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = editorTabs[(index + offset + editorTabs.length) % editorTabs.length];
    onTabChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div role="tablist" aria-label="Editor sections" className={`flex items-center gap-1 ${className}`}>
      {editorTabs.map((item, index) => {
        const selected = item.id === tab;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            id={tabId(item.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`relative inline-flex h-10 items-center rounded-lg px-3.5 text-sm font-medium transition-colors ${selected ? "bg-ink/[0.06] text-ink" : "text-muted hover:text-ink"}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function EditorTopBar({
  resumes,
  active,
  saveStatus,
  tab,
  onTabChange,
  onSelectResume,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onDownload,
  downloading,
}: EditorTopBarProps) {
  const resumeItems: MenuItem[] = [
    ...[...resumes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((resume) => ({
        label: resume.name,
        description: `${getTemplate(resume.design.templateId)?.name} template`,
        checked: resume.id === active.id,
        onSelect: () => onSelectResume(resume.id),
      })),
    "separator" as const,
    { label: "New resume", icon: Plus, onSelect: onCreate },
  ];

  const moreItems: MenuItem[] = [
    { label: "Rename", icon: Pencil, onSelect: onRename },
    { label: "Duplicate", icon: Copy, onSelect: onDuplicate },
    "separator",
    { label: "Delete", icon: Trash2, onSelect: onDelete, danger: true },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link
          href="/"
          aria-label={`${site.name} home`}
          className="inline-flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-md bg-ink text-base font-bold text-white"
          >
            {site.name[0]}
          </span>
          <span className="hidden text-xl font-bold tracking-tight text-ink sm:inline">{site.name}</span>
          <span className="hidden text-sm text-muted xl:inline">Free resume builder</span>
        </Link>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Menu
          label={`Switch resume. Current resume: ${active.name}`}
          items={resumeItems}
          menuClassName="max-h-[70vh] w-72 overflow-y-auto"
          className="min-w-0"
          triggerClassName="inline-flex h-10 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-base font-medium text-ink hover:bg-ink/5 sm:max-w-60"
          trigger={
            <>
              <span className="truncate">{active.name}</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" />
            </>
          }
        />

        <Tabs tab={tab} onTabChange={onTabChange} className="mx-auto hidden lg:flex" />

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-0">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            aria-busy={downloading}
            title="Download your resume as a PDF"
            className={buttonClass("primary", "sm", "ml-1 disabled:cursor-progress disabled:opacity-70")}
          >
            {downloading ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">{downloading ? "Preparing PDF…" : "Download PDF"}</span>
          </button>
          <Menu
            label="More actions"
            align="end"
            items={moreItems}
            triggerClassName="inline-flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
            trigger={<MoreHorizontal aria-hidden="true" className="size-5" />}
          />
        </div>
      </div>

      <div className="border-t border-line px-2 py-1 lg:hidden">
        <Tabs tab={tab} onTabChange={onTabChange} />
      </div>
    </header>
  );
}

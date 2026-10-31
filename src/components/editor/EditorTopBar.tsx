"use client";

import { AlertTriangle, ChevronDown, Copy, Download, HardDrive, Info, LayoutDashboard, Loader2, type LucideIcon, MoreHorizontal, Pencil, PencilLine, Plus, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useRef } from "react";
import { getTemplate } from "@/data/templates";
import { site } from "@/data/site";
import type { Resume } from "@/data/resume";
import { buttonClass, focusRing } from "@/components/ui/styles";
import { Menu, type MenuItem } from "./Menu";
import type { SaveStatus } from "./useResumeStore";

export type EditorTab = "overview" | "content" | "customize";

export const editorTabs: { id: EditorTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "content", label: "Content", icon: PencilLine },
  { id: "customize", label: "Customize", icon: SlidersHorizontal },
];

const STORAGE_NOTE = "Stored in this browser only. Never uploaded.";

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
  onDownloadBackup: () => void;
  onRestoreBackup: () => void;
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
  blocked: {
    icon: AlertTriangle,
    text: "Not saving",
    detail: "These resumes were saved by a newer version of this site, so this version won't write over them.",
    className: "text-[#b54708]",
  },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { icon: Icon, text, detail, className } = statusContent[status];
  const isProblem = status === "error" || status === "unavailable";
  return (
    <>
      <span title={detail} className={`inline-flex items-center gap-1.5 text-[0.875rem] whitespace-nowrap ${className}`}>
        <Icon aria-hidden="true" className={`size-4 ${status === "saving" ? "animate-spin" : ""}`} />
        <span className="hidden xl:inline">{text}</span>
        <span className="sr-only xl:hidden">{text}</span>
      </span>
      <StorageInfo />
      {/* Only announce problems; announcing every autosave would be noisy. */}
      <span role="status" className="sr-only">
        {isProblem ? `${text}. ${detail}` : ""}
      </span>
    </>
  );
}

/** Focusing the button also shows the note, so it works by keyboard and by tapping on touch screens. */
function StorageInfo() {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={STORAGE_NOTE} className={`inline-flex size-7 items-center justify-center rounded-full text-muted hover:text-ink ${focusRing}`}>
        <Info aria-hidden="true" className="size-4" />
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full right-0 z-40 mt-2 hidden w-56 rounded-xl bg-ink px-3 py-2 text-[0.875rem] text-white shadow-pop group-focus-within:block group-hover:block"
      >
        {STORAGE_NOTE}
      </span>
    </span>
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
            className={`relative inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-2 text-[0.875rem] lg:px-3.5 font-medium transition-colors lg:flex-none ${selected ? "bg-accent-soft text-accent-ink" : "text-muted hover:text-ink"}`}
          >
            <item.icon aria-hidden="true" className="hidden size-4 shrink-0 min-[400px]:block" />
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
  onDownloadBackup,
  onRestoreBackup,
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
    { label: "Download backup", icon: Download, onSelect: onDownloadBackup },
    { label: "Restore from backup", icon: Upload, onSelect: onRestoreBackup },
    "separator",
    { label: "Delete", icon: Trash2, onSelect: onDelete, danger: true },
  ];

  return (
    <header className="z-30 bg-canvas px-3 pt-3 pb-1.5 tall:sticky tall:top-0 sm:px-4">
      <div className="rounded-2xl bg-surface shadow-soft">
      <div className="flex h-15 items-center gap-2 px-3 sm:gap-3 sm:px-4">
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
        </Link>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <Menu
          label={`Switch resume. Current resume: ${active.name}`}
          items={resumeItems}
          menuClassName="max-h-[70vh] w-72 overflow-y-auto"
          className="min-w-0 sm:max-w-60"
          triggerClassName="inline-flex h-10 max-w-full items-center gap-1.5 rounded-lg px-2 text-base font-medium text-ink hover:bg-ink/5"
          trigger={
            <>
              <span className="truncate">{active.name}</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" />
            </>
          }
        />

        <Tabs tab={tab} onTabChange={onTabChange} className="mx-auto hidden shrink-0 lg:flex" />

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
              <Download aria-hidden="true" className="hidden size-4 min-[360px]:block" />
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

      <div className="border-t border-line p-1.5 lg:hidden">
        <Tabs tab={tab} onTabChange={onTabChange} />
      </div>
      </div>
    </header>
  );
}

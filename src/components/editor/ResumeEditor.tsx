"use client";

import { AlertTriangle, Eye, Loader2, PencilLine, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Resume } from "@/data/resume";
import { site } from "@/data/site";
import { getTemplate, type TemplateSlug, templates } from "@/data/templates";
import { backupFileName, createBackup, downloadTextFile, MAX_BACKUP_BYTES, readBackup } from "@/lib/backup";
import { findOverLimits } from "@/lib/resume-limits";
import { type BackupState, loadBackupState, readRawResumes, saveBackupState } from "@/lib/resume-storage";
import { duplicateResume, isResumeEmpty } from "@/lib/resumes";
import { ContentTab } from "./content/ContentTab";
import { buttonClass } from "@/components/ui/styles";
import { inputClass } from "./content/fields";
import { CustomizeTab } from "./CustomizeTab";
import { Dialog, dialogButtonClass } from "./Dialog";
import { type EditorTab, EditorTopBar, tabId, tabPanelId } from "./EditorTopBar";
import { Notice } from "./Notice";
import { formatUpdated, OverviewTab } from "./OverviewTab";
import { PreviewPanel } from "./PreviewPanel";
import { UndoToast } from "./UndoToast";
import { usePdfExport } from "./usePdfExport";
import { usePhotoUrl } from "./usePhotoUrl";
import { useResumeStore } from "./useResumeStore";

const tabCard = "m-4 overflow-hidden rounded-[22px] bg-surface shadow-soft sm:m-5";

type DialogState =
  | { type: "rename" | "delete"; id: string }
  | { type: "restore"; resumes: Resume[]; skipped: number }
  | { type: "restore-error"; message: string }
  | null;

export function ResumeEditor({ initialTemplate }: { initialTemplate?: TemplateSlug }) {
  const store = useResumeStore(initialTemplate);
  const [tab, setTab] = useState<EditorTab>("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const scrollTarget = useRef<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [backupState, setBackupState] = useState<BackupState>(loadBackupState);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const restoreInput = useRef<HTMLInputElement>(null);
  const [undo, setUndo] = useState<{ id: number; resumeId: string; message: string; restore: () => void } | null>(null);
  const dismissUndo = useCallback(() => setUndo(null), []);

  const { activeResume: active } = store;
  const photoUrl = usePhotoUrl(active?.profile.photo);
  const pdf = usePdfExport();
  const dialogResume = dialog && "id" in dialog ? store.resumes.find((r) => r.id === dialog.id) : undefined;

  useEffect(() => {
    if (!scrollTarget.current) return;
    document.getElementById(`section-${scrollTarget.current}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    scrollTarget.current = null;
  }, [openSections]);

  if (!store.ready || !active) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas text-base text-muted" role="status">
        Loading your resumes…
      </div>
    );
  }

  const changeTab = (next: EditorTab) => {
    setTab(next);
    setMobileView("edit");
  };

  const toggleSection = (id: string) =>
    setOpenSections((current) => new Set(current.has(id) ? [] : [id]));

  const openSection = (id: string) => {
    setOpenSections(new Set([id]));
    scrollTarget.current = id;
  };

  const editSection = (id: string) => {
    changeTab("content");
    openSection(id);
  };

  const loadSample = () => {
    const { sample } = getTemplate(active.design.templateId) ?? templates[0];
    const { profile, sections } = duplicateResume(sample, active.name);
    store.updateActive((resume) => ({ ...resume, profile, sections }));
  };

  const overLimits = findOverLimits(active);
  const offerUndo = (message: string, restore: () => void) => setUndo({ id: Date.now(), resumeId: active.id, message, restore });

  const updateBackupState = (patch: Partial<BackupState>) => {
    const next = { ...backupState, ...patch };
    setBackupState(next);
    saveBackupState(next);
  };

  const downloadBackup = async () => {
    downloadTextFile(backupFileName(site.name), await createBackup(store.resumes));
    updateBackupState({ lastBackupAt: Date.now() });
  };

  const onRestoreFile = async (file: File | undefined) => {
    if (restoreInput.current) restoreInput.current.value = "";
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setDialog({ type: "restore-error", message: "This file is too large to be a resume backup." });
      return;
    }
    const result = readBackup(await file.text());
    setRestoreMode("merge");
    setDialog(result.ok ? { type: "restore", resumes: result.resumes, skipped: result.skipped } : { type: "restore-error", message: result.message });
  };

  const openRename = (id: string) => {
    setNameDraft(store.resumes.find((r) => r.id === id)?.name ?? "");
    setDialog({ type: "rename", id });
  };

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    const name = nameDraft.trim().slice(0, 120);
    if (dialog && "id" in dialog && name) store.renameResume(dialog.id, name);
    setDialog(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <EditorTopBar
        resumes={store.resumes}
        active={active}
        saveStatus={store.saveStatus}
        tab={tab}
        onTabChange={changeTab}
        onSelectResume={store.selectResume}
        onCreate={() => store.createNewResume(active.design.templateId)}
        onRename={() => openRename(active.id)}
        onDuplicate={() => store.duplicateResume(active.id)}
        onDelete={() => setDialog({ type: "delete", id: active.id })}
        onDownloadBackup={downloadBackup}
        onRestoreBackup={() => restoreInput.current?.click()}
        onDownload={() => pdf.start(active, photoUrl)}
        downloading={pdf.status === "preparing"}
      />

      <main id="main" className="flex min-h-0 flex-1">
        <div
          className={`min-h-0 w-full flex-col lg:flex lg:w-[40%] lg:max-w-[560px] lg:min-w-[420px] lg:shrink-0 ${mobileView === "edit" ? "flex" : "hidden"}`}
        >
          <div
            id={tabPanelId}
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto outline-none"
          >
            {store.recovered && (
              <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-[#fedf89] bg-[#fffaeb] p-3.5 text-sm text-[#93370d] sm:mx-6">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p className="flex-1">
                  Some saved resume data in this browser could not be read and was skipped. A copy of the original data
                  was kept in this browser&apos;s storage.
                </p>
                <button type="button" onClick={store.dismissRecovered} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-black/5">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
            {store.saveStatus === "unavailable" && (
              <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-[#fedf89] bg-[#fffaeb] p-3.5 text-sm text-[#93370d] sm:mx-6">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p>
                  Browser storage is blocked or disabled, so your resume can&apos;t be saved. You can keep editing, but
                  changes will be lost when you close this tab.
                </p>
              </div>
            )}

            {store.saveStatus === "blocked" && (
              <Notice
                tone="warning"
                title="Saved by a newer version of this site"
                actions={
                  <button type="button" onClick={() => downloadTextFile(`${site.name}-saved-data.json`, readRawResumes())} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                    Download a copy
                  </button>
                }
              >
                To protect your resumes, nothing will be saved here until you reload to get the latest version. Changes in this tab will be lost.
              </Notice>
            )}

            {overLimits.length > 0 && (
              <Notice
                tone="warning"
                title="Some content is over the editing limits"
                actions={
                  <button type="button" onClick={downloadBackup} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                    Download backup
                  </button>
                }
              >
                <p>Nothing has been cut, and it all stays in this resume. To keep editing these, shorten them:</p>
                <ul className="mt-1 list-disc pl-4">
                  {overLimits.slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {overLimits.length > 4 && <p className="mt-1">and {overLimits.length - 4} more</p>}
              </Notice>
            )}

            {!isResumeEmpty(active) && !backupState.lastBackupAt && !backupState.reminderDismissed && (
              <Notice
                title="Back up your resume"
                onDismiss={() => updateBackupState({ reminderDismissed: true })}
                actions={
                  <button type="button" onClick={downloadBackup} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                    Download backup
                  </button>
                }
              >
                It only lives in this browser, so keep a copy somewhere safe.
              </Notice>
            )}

            {tab === "overview" && (
              <div className={tabCard}>
              <OverviewTab
                resumes={store.resumes}
                active={active}
                onSelect={store.selectResume}
                onCreate={() => store.createNewResume(active.design.templateId)}
                onRename={openRename}
                onDuplicate={store.duplicateResume}
                onDelete={(id) => setDialog({ type: "delete", id })}
                onEditSection={editSection}
                onDownloadBackup={downloadBackup}
                onRestoreBackup={() => restoreInput.current?.click()}
                lastBackupAt={backupState.lastBackupAt}
              />
              </div>
            )}
            {tab === "content" && (
              <ContentTab
                key={active.id}
                resume={active}
                photoUrl={photoUrl}
                onChange={store.updateActive}
                onPhotoChange={store.setPhoto}
                openSections={openSections}
                onToggleSection={toggleSection}
                onOpenSection={openSection}
                onUndoable={offerUndo}
              />
            )}
            {tab === "customize" && (
              <div className={tabCard}>
              <CustomizeTab
                resume={active}
                photoUrl={photoUrl}
                template={active.design.templateId}
                pageSize={active.design.pageSize}
                onTemplateChange={store.setTemplate}
                onPageSizeChange={store.setPageSize}
              />
              </div>
            )}
          </div>
        </div>

        <div className={`min-h-0 w-full min-w-0 lg:block lg:flex-1 ${mobileView === "preview" ? "block" : "hidden"}`}>
          <PreviewPanel
            resume={active}
            photoUrl={photoUrl}
            zoom={store.zoom}
            onZoomChange={store.setZoom}
            onTemplateChange={store.setTemplate}
            onLoadSample={loadSample}
          />
        </div>
      </main>

      {/* Mobile: switch between the form and the preview. */}
      <div className="flex justify-center border-t border-line bg-surface px-4 py-2.5 lg:hidden">
        <div role="group" aria-label="View" className="flex w-full max-w-xs rounded-full border border-line bg-canvas p-1">
          {(
            [
              { id: "edit", label: "Edit", icon: PencilLine },
              { id: "preview", label: "Preview", icon: Eye },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mobileView === id}
              onClick={() => setMobileView(id)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-base font-medium text-muted aria-pressed:bg-ink aria-pressed:text-white"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {pdf.status !== "idle" && (
        <div
          role={pdf.status === "error" ? "alert" : "status"}
          className={`fixed right-4 bottom-20 left-4 z-40 flex items-start gap-3 rounded-xl border p-4 text-sm shadow-pop sm:left-auto sm:w-96 lg:bottom-6 ${
            pdf.status === "preparing" ? "border-line bg-surface text-ink" : "border-[#fedf89] bg-[#fffaeb] text-[#93370d]"
          }`}
        >
          {pdf.status === "preparing" ? (
            <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-accent" />
          ) : (
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            {pdf.status === "preparing" ? (
              <>
                <p className="font-medium">Preparing your PDF…</p>
                <p className="mt-1 text-muted">
                  When the print window opens, choose <strong className="font-medium text-ink">Save as PDF</strong> as the
                  destination. File name: <span className="break-all">{pdf.fileName}</span>
                </p>
                {pdf.message && <p className="mt-1">{pdf.message}</p>}
              </>
            ) : (
              <p>{pdf.message}</p>
            )}
          </div>
          {pdf.status !== "preparing" && (
            <button type="button" onClick={pdf.dismiss} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-black/5">
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      )}
      {undo?.resumeId === active.id && (
        <UndoToast
          key={undo.id}
          message={undo.message}
          onDismiss={dismissUndo}
          onUndo={() => {
            undo.restore();
            setUndo(null);
          }}
        />
      )}
      {pdf.printView}

      <input
        ref={restoreInput}
        type="file"
        accept=".json,application/json"
        aria-label="Choose a backup file"
        onChange={(event) => onRestoreFile(event.target.files?.[0])}
        className="sr-only"
        tabIndex={-1}
      />

      <Dialog
        open={dialog?.type === "restore"}
        onClose={() => setDialog(null)}
        title="Restore from backup"
        description={
          dialog?.type === "restore"
            ? `This backup holds ${dialog.resumes.length} ${dialog.resumes.length === 1 ? "resume" : "resumes"}.${dialog.skipped ? ` ${dialog.skipped} couldn't be read and will be skipped.` : ""}`
            : undefined
        }
      >
        {dialog?.type === "restore" && (
          <>
            <ul className="mt-4 max-h-48 space-y-1.5 overflow-y-auto rounded-xl bg-panel p-3 text-[0.875rem]">
              {dialog.resumes.map((resume) => (
                <li key={resume.id}>
                  <span className="font-bold text-ink">{resume.name}</span>
                  <span className="block text-muted">
                    {resume.profile.fullName.trim() || "No name"} · {resume.sections.length} sections · updated {formatUpdated(resume.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
            <fieldset className="mt-4 space-y-2 text-[0.875rem] text-ink">
              <legend className="sr-only">How to restore</legend>
              <label className="flex items-start gap-2.5">
                <input type="radio" name="restore-mode" checked={restoreMode === "merge"} onChange={() => setRestoreMode("merge")} className="mt-0.5 size-4 accent-[#0f766e]" />
                <span>
                  <span className="font-bold">Add to my resumes</span>
                  <span className="block text-muted">Keeps everything you have now.</span>
                </span>
              </label>
              <label className="flex items-start gap-2.5">
                <input type="radio" name="restore-mode" checked={restoreMode === "replace"} onChange={() => setRestoreMode("replace")} className="mt-0.5 size-4 accent-[#0f766e]" />
                <span>
                  <span className="font-bold">Replace all my resumes</span>
                  <span className="block text-muted">Removes the {store.resumes.length} in this browser.</span>
                </span>
              </label>
            </fieldset>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setDialog(null)} className={dialogButtonClass.secondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  store.restoreResumes(dialog.resumes, restoreMode);
                  setDialog(null);
                }}
                className={restoreMode === "replace" ? dialogButtonClass.danger : dialogButtonClass.primary}
              >
                {restoreMode === "replace" ? "Replace and restore" : "Restore"}
              </button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog
        open={dialog?.type === "restore-error"}
        onClose={() => setDialog(null)}
        title="Couldn’t restore this file"
        description={dialog?.type === "restore-error" ? dialog.message : undefined}
      >
        <div className="mt-6 flex justify-end">
          <button type="button" autoFocus onClick={() => setDialog(null)} className={dialogButtonClass.secondary}>
            Close
          </button>
        </div>
      </Dialog>

      <Dialog
        open={dialog?.type === "rename" && !!dialogResume}
        onClose={() => setDialog(null)}
        title="Rename resume"
        description="The name is only used to tell your resumes apart. It doesn't appear on the resume itself."
      >
        <form onSubmit={submitRename} className="mt-5">
          <label htmlFor="resume-name" className="block text-sm font-medium text-ink-soft">
            Resume name
          </label>
          <input
            id="resume-name"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            maxLength={120}
            autoFocus
            autoComplete="off"
            className={`${inputClass} mt-2 h-11`}
          />
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDialog(null)} className={dialogButtonClass.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={!nameDraft.trim()} className={`${dialogButtonClass.primary} disabled:opacity-50`}>
              Save
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={dialog?.type === "delete" && !!dialogResume}
        onClose={() => setDialog(null)}
        title={`Delete “${dialogResume?.name ?? ""}”?`}
        description="This permanently removes the resume from this browser. It can't be undone."
      >
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus onClick={() => setDialog(null)} className={dialogButtonClass.secondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (dialog && "id" in dialog) store.deleteResume(dialog.id);
              setDialog(null);
            }}
            className={dialogButtonClass.danger}
          >
            Delete resume
          </button>
        </div>
      </Dialog>
    </div>
  );
}

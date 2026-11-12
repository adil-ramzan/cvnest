"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageSize, ProfilePhoto, Resume, ResumeCustomization } from "@/data/resume";
import type { TemplateSlug } from "@/data/templates";
import { dataUrlToBlob, deletePhoto, deleteUnusedPhotos, listPhotoIds, savePhoto } from "@/lib/photo-store";
import { commitRestore, prepareRestored, type RestoreMode, type RestoreOutcome, undoReplace as undoReplaceList } from "@/lib/restore";
import {
  loadResumes,
  loadSettings,
  parseResumes,
  photoIdsInStoredText,
  RESUMES_STORAGE_KEY,
  saveResumes,
  saveSettings,
  writeResumes,
  type Zoom,
} from "@/lib/resume-storage";
import { createResume, defaultPageSize, duplicateResume, isResumeEmpty } from "@/lib/resumes";
import { loadUndoableSnapshot, readSnapshot, saveSnapshot, type Snapshot, snapshotPhotoIds, writeSnapshot } from "@/lib/snapshot-store";

/** `held`: saving is paused because stored data couldn't be read and no copy of it could be kept. */
export type SaveStatus = "saved" | "saving" | "error" | "unavailable" | "blocked" | "held";

const AUTOSAVE_DELAY = 400;

const mostRecent = (resumes: Resume[]) =>
  resumes.reduce<Resume | undefined>((best, r) => (!best || r.updatedAt > best.updatedAt ? r : best), undefined);

const photoIds = (resumes: Resume[]) =>
  new Set(resumes.map((r) => r.profile.photo?.id).filter((id): id is string => !!id));

/** A snapshot read back from IndexedDB goes through the same validation as any stored data. */
const readValidSnapshot = async (): Promise<Snapshot | null> => {
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  const { resumes } = parseResumes(JSON.stringify({ resumes: snapshot.resumes }));
  return resumes.length ? { ...snapshot, resumes } : null;
};

/**
 * Removes stored photos that nothing refers to: not the resumes, not the stored text
 * (which includes unreadable resumes and the copy kept of them), and not the undo
 * snapshot. If any of those can't be read, nothing is removed.
 */
async function cleanUpPhotos(resumes: Resume[]) {
  const inText = photoIdsInStoredText();
  const inSnapshot = await snapshotPhotoIds();
  if (inText === null || inSnapshot === null) return;
  await deleteUnusedPhotos(new Set([...photoIds(resumes), ...inText, ...inSnapshot]));
}

export function useResumeStore(initialTemplate?: TemplateSlug) {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [recovered, setRecovered] = useState(false);
  /** When the last "replace all" restore happened, while it can still be undone. */
  const [replacedAt, setReplacedAt] = useState<number | null>(null);

  const storageAvailable = useRef(true);
  const skipNextSave = useRef(false);
  const pendingSave = useRef(false);
  const latest = useRef<Resume[] | null>(null);
  const movingPhotos = useRef(new Set<string>());

  // Load saved resumes once, on the client. Older data is migrated by loadResumes.
  useEffect(() => {
    const result = loadResumes();
    const settings = loadSettings();
    storageAvailable.current = result.available;

    let list = result.resumes;
    let active = list.find((r) => r.id === settings.activeResumeId) ?? mostRecent(list);
    let changed = !result.persisted && result.available;

    if (initialTemplate) {
      // Arriving from "Use Template": reuse a blank active resume, otherwise start a new one.
      if (active && isResumeEmpty(active)) {
        const updated = { ...active, design: { ...active.design, templateId: initialTemplate } };
        list = list.map((r) => (r.id === updated.id ? updated : r));
        active = updated;
      } else {
        active = createResume(initialTemplate, defaultPageSize());
        list = [...list, active];
      }
      changed = true;
      // Drop ?template so a refresh doesn't create another resume.
      window.history.replaceState(null, "", "/editor");
    } else if (!active) {
      active = createResume(undefined, defaultPageSize());
      list = [active];
      changed = true;
    }

    skipNextSave.current = !changed;
    // Browser storage doesn't exist during server rendering, so this can only run after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumes(list);
    setActiveId(active.id);
    setZoom(settings.zoom);
    // The "recovered" notice says a copy was kept, so it only shows when one was.
    setRecovered(result.recovered && !result.unreadableNotCopied);
    if (!result.available) setSaveStatus("unavailable");
    if (result.unreadableNotCopied) {
      // The stored text is the only copy of what couldn't be read; keep it until the person downloads it.
      storageAvailable.current = false;
      setSaveStatus("held");
    }
    if (result.newerData) {
      // Never write over data this version can't fully read.
      storageAvailable.current = false;
      setSaveStatus("blocked");
    }

    // Remove photos nothing uses any more (kept for a day in case another tab is mid-save).
    // Only after a load that could read storage: otherwise every photo would look unused.
    if (result.available && !result.newerData) cleanUpPhotos(list).catch(() => {});
    loadUndoableSnapshot(new Set(list.map((r) => r.id)))
      .then((snapshot) => setReplacedAt(snapshot?.createdAt ?? null))
      .catch(() => {});
  }, [initialTemplate]);

  // Debounced autosave.
  useEffect(() => {
    if (resumes === null) return;
    latest.current = resumes;
    if (skipNextSave.current) {
      // This state came from storage (load or another tab), so any save still scheduled is obsolete.
      skipNextSave.current = false;
      pendingSave.current = false;
      if (storageAvailable.current) setSaveStatus("saved");
      return;
    }
    if (!storageAvailable.current) return;

    pendingSave.current = true;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      pendingSave.current = false;
      setSaveStatus(saveResumes(resumes) ? "saved" : "error");
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [resumes]);

  // Move photos still stored inline (migrated from schema v1) into IndexedDB.
  useEffect(() => {
    if (!resumes) return;
    for (const resume of resumes) {
      const photo = resume.profile.photo;
      if (!photo?.inlineData || movingPhotos.current.has(photo.id)) continue;
      movingPhotos.current.add(photo.id);
      savePhoto(photo.id, dataUrlToBlob(photo.inlineData))
        .then(() => {
          // Moved, so a later inline copy of the same photo (another restore) is moved too.
          movingPhotos.current.delete(photo.id);
          // Not a content change, so updatedAt is left alone.
          setResumes((list) =>
            list?.map((r) =>
              r.profile.photo?.id === photo.id && r.profile.photo.inlineData
                ? { ...r, profile: { ...r.profile, photo: { ...r.profile.photo, inlineData: undefined } } }
                : r,
            ) ?? list,
          );
        })
        .catch(() => {
          // IndexedDB unavailable: the photo simply stays inline.
        });
    }
  }, [resumes]);

  /** Writes any pending change straight away. */
  const flushSave = useCallback(() => {
    if (pendingSave.current && latest.current && storageAvailable.current) {
      pendingSave.current = false;
      saveResumes(latest.current);
    }
  }, []);

  useEffect(() => flushSave, [flushSave]);

  /** Ends a `held` state once the person has a copy of the stored data, and saves straight away. */
  const resumeSaving = useCallback(() => {
    if (!latest.current) return;
    storageAvailable.current = true;
    pendingSave.current = false;
    setSaveStatus(saveResumes(latest.current) ? "saved" : "error");
  }, []);

  useEffect(() => {
    if (resumes !== null && storageAvailable.current) saveSettings({ activeResumeId: activeId, zoom });
  }, [resumes, activeId, zoom]);

  // Keep in sync with edits made in another tab of this browser (last write wins).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== RESUMES_STORAGE_KEY) return;
      const { resumes: incoming, newerData } = parseResumes(event.newValue);
      if (newerData) {
        storageAvailable.current = false;
        setSaveStatus("blocked");
        return;
      }
      const next = incoming.length > 0 ? incoming : [createResume(undefined, defaultPageSize())];
      skipNextSave.current = incoming.length > 0;
      setResumes(next);
      setActiveId((current) => (next.some((r) => r.id === current) ? current : (mostRecent(next)?.id ?? null)));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Deletes a stored photo once no remaining resume, and no undo snapshot, refers to it (duplicates share photos). */
  const releasePhoto = useCallback((id: string | undefined, remaining: Resume[]) => {
    if (!id || remaining.some((r) => r.profile.photo?.id === id)) return;
    snapshotPhotoIds()
      .then((kept) => (kept === null || kept.includes(id) ? undefined : deletePhoto(id)))
      .catch(() => {});
  }, []);

  const updateResume = useCallback((id: string, update: (resume: Resume) => Resume) => {
    setResumes((list) => list?.map((r) => (r.id === id ? { ...update(r), updatedAt: Date.now() } : r)) ?? list);
  }, []);

  /** Applies a content change to the active resume. */
  const updateActive = useCallback(
    (update: (resume: Resume) => Resume) => {
      if (activeId) updateResume(activeId, update);
    },
    [activeId, updateResume],
  );

  const setTemplate = useCallback(
    (templateId: TemplateSlug) => updateActive((r) => ({ ...r, design: { ...r.design, templateId } })),
    [updateActive],
  );

  const setPageSize = useCallback(
    (pageSize: PageSize) => updateActive((r) => ({ ...r, design: { ...r.design, pageSize } })),
    [updateActive],
  );

  const setCustomization = useCallback(
    (customization: ResumeCustomization) => updateActive((r) => ({ ...r, design: { ...r.design, ...customization } })),
    [updateActive],
  );

  const setPhoto = useCallback(
    (photo: ProfilePhoto | undefined) => {
      if (!resumes || !activeId) return;
      const previous = resumes.find((r) => r.id === activeId)?.profile.photo?.id;
      updateActive((r) => {
        const profile = { ...r.profile };
        if (photo) profile.photo = photo;
        else delete profile.photo;
        return { ...r, profile };
      });
      if (previous && previous !== photo?.id) {
        releasePhoto(previous, resumes.filter((r) => r.id !== activeId));
      }
    },
    [resumes, activeId, updateActive, releasePhoto],
  );

  const renameResume = useCallback(
    (id: string, name: string) => updateResume(id, (r) => ({ ...r, name })),
    [updateResume],
  );

  const createNewResume = useCallback((template?: TemplateSlug) => {
    const resume = createResume(template, defaultPageSize());
    setResumes((list) => [...(list ?? []), resume]);
    setActiveId(resume.id);
  }, []);

  const duplicate = useCallback(
    (id: string) => {
      const source = resumes?.find((r) => r.id === id);
      if (!source) return;
      const copy = duplicateResume(source, `${source.name} (copy)`.slice(0, 120));
      setResumes((list) => {
        if (!list) return list;
        const index = list.findIndex((r) => r.id === id);
        return [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
      });
      setActiveId(copy.id);
    },
    [resumes],
  );

  /**
   * Removes a resume and returns what's needed to put it back. Its photo is left in
   * storage so undo can bring it back; cleanup on a later visit removes it if unused.
   */
  const deleteResume = useCallback(
    (id: string): { resume: Resume; index: number; placeholderId?: string; activeAfter: string } | undefined => {
      if (!resumes) return undefined;
      const index = resumes.findIndex((r) => r.id === id);
      if (index === -1) return undefined;
      let remaining = resumes.filter((r) => r.id !== id);
      let placeholderId: string | undefined;
      if (remaining.length === 0) {
        remaining = [createResume(undefined, defaultPageSize())];
        placeholderId = remaining[0].id;
      }
      const activeAfter = id === activeId || !remaining.some((r) => r.id === activeId) ? mostRecent(remaining)!.id : activeId!;
      setResumes(remaining);
      setActiveId(activeAfter);
      return { resume: resumes[index], index, placeholderId, activeAfter };
    },
    [resumes, activeId],
  );

  /** Undo for deleteResume. Drops the blank resume that took its place, if it's still untouched. */
  const reinsertResume = useCallback((resume: Resume, index: number, placeholderId?: string) => {
    setResumes((list) => {
      if (!list || list.some((r) => r.id === resume.id)) return list;
      const kept = list.filter((r) => !(r.id === placeholderId && isResumeEmpty(r)));
      return [...kept.slice(0, index), resume, ...kept.slice(index)];
    });
    setActiveId(resume.id);
  }, []);

  /** Records that a copy now exists outside this browser, without counting as an edit. */
  const markCopied = useCallback((field: "lastBackupAt" | "lastExportAt", id?: string) => {
    const now = Date.now();
    setResumes((list) => list?.map((r) => (!id || r.id === id ? { ...r, [field]: now } : r)) ?? list);
  }, []);

  /**
   * Adds restored resumes to the list, or replaces the list, all or nothing (see lib/restore).
   * The new list is written before the editor shows it; if it can't be, nothing changes.
   */
  const restoreResumes = useCallback(async (incoming: Resume[], mode: RestoreMode): Promise<RestoreOutcome> => {
    const current = latest.current ?? [];
    if (!storageAvailable.current) {
      // Not saving (blocked, held or unavailable): the restore stays in this tab only, as before.
      // Nothing is written, so stored data that must not be overwritten stays as it is.
      const restored = prepareRestored(incoming, Date.now());
      const next = mode === "merge" ? [...current, ...restored] : restored;
      setResumes(next);
      setActiveId(restored[0].id);
      return { ok: true, resumes: next, restoredIds: restored.map((r) => r.id), undoAvailable: false };
    }
    // Read at commit time, so edits made while photos are being stored are kept.
    const outcome = await commitRestore(() => latest.current ?? current, incoming, mode, {
      listPhotoIds,
      savePhoto,
      deletePhoto,
      readSnapshot,
      saveSnapshot,
      writeSnapshot,
      writeResumes,
    });
    if (outcome.ok) {
      // Already written, so the autosave this state change would trigger is skipped.
      skipNextSave.current = true;
      setResumes(outcome.resumes);
      setActiveId(outcome.restoredIds[0]);
      if (outcome.undoAvailable) setReplacedAt(Date.now());
    }
    return outcome;
  }, []);

  /** Puts back the resumes a "replace all" restore removed. Changes made since then are replaced. */
  const undoReplace = useCallback(async () => {
    if (!storageAvailable.current) return { ok: false as const, message: "Saving is paused in this browser, so the resumes can't be put back right now." };
    const outcome = await undoReplaceList({ readSnapshot: readValidSnapshot, writeSnapshot, writeResumes });
    if (outcome.ok) {
      skipNextSave.current = true;
      setResumes(outcome.resumes);
      setActiveId(mostRecent(outcome.resumes)?.id ?? null);
      setReplacedAt(null);
    }
    return outcome;
  }, []);

  const activeResume = resumes?.find((r) => r.id === activeId) ?? null;

  return {
    ready: resumes !== null && activeResume !== null,
    resumes: resumes ?? [],
    activeResume,
    saveStatus,
    recovered,
    dismissRecovered: () => setRecovered(false),
    zoom,
    setZoom,
    selectResume: setActiveId,
    restoreResumes,
    replacedAt,
    undoReplace,
    reinsertResume,
    markCopied,
    flushSave,
    resumeSaving,
    updateActive,
    setTemplate,
    setPageSize,
    setCustomization,
    setPhoto,
    renameResume,
    createNewResume,
    duplicateResume: duplicate,
    deleteResume,
  };
}

export type ResumeStore = ReturnType<typeof useResumeStore>;

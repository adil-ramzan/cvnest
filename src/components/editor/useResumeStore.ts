"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageSize, ProfilePhoto, Resume, ResumeCustomization } from "@/data/resume";
import type { TemplateSlug } from "@/data/templates";
import { dataUrlToBlob, deletePhoto, deleteUnusedPhotos, savePhoto } from "@/lib/photo-store";
import {
  loadResumes,
  loadSettings,
  parseResumes,
  RESUMES_STORAGE_KEY,
  saveResumes,
  saveSettings,
  type Zoom,
} from "@/lib/resume-storage";
import { createResume, defaultPageSize, duplicateResume, isResumeEmpty } from "@/lib/resumes";

/** `held`: saving is paused because stored data couldn't be read and no copy of it could be kept. */
export type SaveStatus = "saved" | "saving" | "error" | "unavailable" | "blocked" | "held";

const AUTOSAVE_DELAY = 400;

const mostRecent = (resumes: Resume[]) =>
  resumes.reduce<Resume | undefined>((best, r) => (!best || r.updatedAt > best.updatedAt ? r : best), undefined);

const photoIds = (resumes: Resume[]) =>
  new Set(resumes.map((r) => r.profile.photo?.id).filter((id): id is string => !!id));

export function useResumeStore(initialTemplate?: TemplateSlug) {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [recovered, setRecovered] = useState(false);

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

    // Remove photos no resume uses any more (kept for a day in case another tab is mid-save).
    deleteUnusedPhotos(photoIds(list)).catch(() => {});
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

  /** Deletes a stored photo once no remaining resume refers to it (duplicates share photos). */
  const releasePhoto = useCallback((id: string | undefined, remaining: Resume[]) => {
    if (id && !remaining.some((r) => r.profile.photo?.id === id)) deletePhoto(id).catch(() => {});
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

  const deleteResume = useCallback(
    (id: string) => {
      if (!resumes) return;
      const removed = resumes.find((r) => r.id === id);
      let remaining = resumes.filter((r) => r.id !== id);
      releasePhoto(removed?.profile.photo?.id, remaining);
      if (remaining.length === 0) remaining = [createResume(undefined, defaultPageSize())];
      setResumes(remaining);
      if (id === activeId || !remaining.some((r) => r.id === activeId)) setActiveId(mostRecent(remaining)!.id);
    },
    [resumes, activeId, releasePhoto],
  );

  /** Records that a copy now exists outside this browser, without counting as an edit. */
  const markCopied = useCallback((field: "lastBackupAt" | "lastExportAt", id?: string) => {
    const now = Date.now();
    setResumes((list) => list?.map((r) => (!id || r.id === id ? { ...r, [field]: now } : r)) ?? list);
  }, []);

  /** Adds restored resumes to the list, or replaces the list. Ids are renewed so they can't clash. */
  const restoreResumes = useCallback((incoming: Resume[], mode: "merge" | "replace") => {
    // These just came from a backup file, so a copy already exists.
    const restored = incoming.map((resume) => ({ ...duplicateResume(resume, resume.name), lastBackupAt: Date.now() }));
    setResumes((list) => (mode === "merge" ? [...(list ?? []), ...restored] : restored));
    setActiveId(restored[0].id);
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

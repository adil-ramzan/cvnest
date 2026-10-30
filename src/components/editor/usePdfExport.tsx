"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ResumePreview } from "@/components/resume/ResumePreview";
import type { PageSize, Resume } from "@/data/resume";
import { getTemplate, templates } from "@/data/templates";

/**
 * Browser-based PDF export.
 *
 * Renders a print-only copy of the resume at true page size and opens the
 * browser's print dialog, whose "Save as PDF" destination writes a vector PDF
 * with real, selectable text and embedded fonts. The resume is rendered by the
 * same template components as the preview, and nothing leaves the browser.
 * Print styles live in globals.css under "PDF export".
 */

export type PdfExportStatus = "idle" | "preparing" | "warning" | "error";

const IMAGE_TIMEOUT_MS = 8000;
/** Fallback cleanup if the browser never fires `afterprint`. */
const PRINT_FALLBACK_MS = 120_000;

/** "Maya Chen" → "Maya-Chen-Resume". Used as the document title, which browsers suggest as the PDF file name. */
export function pdfFileName(fullName: string): string {
  const base = fullName
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#%{}^~[\]`\u0000-\u001f]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .replace(/-+$/, "");
  return base ? `${base}-Resume` : "CVNest-Resume";
}

const pageRule = (size: PageSize) => `
@page { size: ${size === "a4" ? "A4" : "letter"}; margin: 0; }
/* Without block-level padding cloning (Safari), use page margins so continuation pages don't start at the very edge. */
@supports not (box-decoration-break: clone) {
  @page { margin: 12mm 0; }
  @page :first { margin-top: 0; }
}`;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Waits for every image in `root` to load; resolves to false if any failed or timed out. */
async function imagesReady(root: HTMLElement): Promise<boolean> {
  const images = [...root.querySelectorAll("img")];
  const results = await Promise.all(
    images.map(
      (img) =>
        new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), IMAGE_TIMEOUT_MS);
          img
            .decode()
            .then(() => resolve(img.naturalWidth > 0))
            .catch(() => resolve(false))
            .finally(() => clearTimeout(timer));
        }),
    ),
  );
  return results.every(Boolean);
}

type Job = { id: number; resume: Resume; photoUrl: string };

export function usePdfExport() {
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<PdfExportStatus>("idle");
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const start = useCallback((resume: Resume, photoUrl: string) => {
    if (typeof window.print !== "function") {
      setStatus("error");
      setMessage("This browser can't save PDFs from a web page. Try Chrome, Edge, Firefox or Safari.");
      return;
    }
    setMessage("");
    setStatus("preparing");
    setJob({ id: Date.now(), resume, photoUrl });
  }, []);

  const dismiss = useCallback(() => {
    setStatus("idle");
    setMessage("");
  }, []);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    const previousTitle = document.title;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let photoFailed = false;

    const finish = () => {
      window.removeEventListener("afterprint", finish);
      clearTimeout(timer);
      document.title = previousTitle;
      setJob(null);
      setStatus((current) => (current === "preparing" ? (photoFailed ? "warning" : "idle") : current));
    };

    (async () => {
      try {
        // Let the print copy lay out so any template fonts it needs start loading, then wait for them.
        await nextFrame();
        await nextFrame();
        await document.fonts.ready;
        const root = rootRef.current;
        if (!root) throw new Error("Print view missing");
        const photoOk = await imagesReady(root);
        if (cancelled) return;

        if (!photoOk) {
          photoFailed = true;
          setMessage("Your photo couldn't be loaded, so it may be missing from the PDF.");
        }
        document.title = pdfFileName(job.resume.profile.fullName);
        window.addEventListener("afterprint", finish);
        timer = setTimeout(finish, PRINT_FALLBACK_MS);
        window.print();
      } catch {
        if (cancelled) return;
        document.title = previousTitle;
        setJob(null);
        setStatus("error");
        setMessage("The PDF couldn't be prepared. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job]);

  let printView: ReactNode = null;
  if (job && typeof document !== "undefined") {
    const template = getTemplate(job.resume.design.templateId) ?? templates[0];
    printView = createPortal(
      <div ref={rootRef} className="print-root" aria-hidden="true">
        <style>{pageRule(job.resume.design.pageSize)}</style>
        <ResumePreview
          template={template}
          resume={job.resume}
          photoUrl={job.photoUrl}
          size={job.resume.design.pageSize}
          flow
        />
      </div>,
      document.body,
    );
  }

  return { start, status, message, dismiss, printView, fileName: job ? `${pdfFileName(job.resume.profile.fullName)}.pdf` : "" };
}

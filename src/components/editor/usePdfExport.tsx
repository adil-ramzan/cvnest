"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { customizeDesign, modernSidebar } from "@/components/resume/engine/customize";
import { pageInset } from "@/components/resume/engine/design";
import { DesignEdges, designVars } from "@/components/resume/engine/DesignTemplate";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { geckoFooterTrim } from "@/components/resume/paginate";
import type { PageSize, Resume, ResumeCustomization } from "@/data/resume";
import { SITE_NAME } from "@/data/site";
import { getTemplate, type ResumeTemplate, templates } from "@/data/templates";
import { loadStaticFonts, needsStaticFonts, staticFontCss } from "./printFonts";

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
  return base ? `${base}-Resume` : `${SITE_NAME}-Resume`;
}

// No page margins: they would leave white bands across sidebars and page colors.
const pageRule = (size: PageSize) => `@page { size: ${size === "a4" ? "A4" : "letter"}; margin: 0; }`;

/**
 * Firefox only, because it doesn't repeat padding across pages as Chrome does (see
 * `.paged` in globals.css). It repeats a table's header and footer on every page, so
 * these empty rows give each page the same space, and colors behind them run to the
 * paper's edge. Chrome can't use this: it sizes the row before page breaks, so
 * content they push down falls outside the table and loses its margins.
 */
function PrintFrame({ children }: { children: ReactNode }) {
  const spacer = (
    <tr>
      <td>
        <div className="print-spacer" />
      </td>
    </tr>
  );
  return (
    <table role="presentation" className="print-frame">
      <thead>{spacer}</thead>
      <tfoot>{spacer}</tfoot>
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Page colors, sidebars and edge stripes, repeated on every page. They stay outside
 * the page content, so one fixed layer covers each whole page.
 */
function PrintLayers({ template, customization }: { template: ResumeTemplate; customization: ResumeCustomization }) {
  const { slug } = template;
  const design = template.design && customizeDesign(template.design, customization);
  // Modern is hand-written, so its sidebar isn't described by a design.
  const side = slug === "modern" ? { bg: modernSidebar(customization.accentColor), width: "34%", position: "left" } : design?.layout === "sidebar" ? design.side : undefined;
  const sideEdge = (side?.position ?? "left") === "left" ? "left" : "right";

  return (
    <div style={design && designVars(design)}>
      {design?.colors.paper && <div className="print-page-layer" style={{ backgroundColor: design.colors.paper, left: 0, width: "100%" }} />}
      {side?.bg && <div className="print-page-layer" style={{ backgroundColor: side.bg, [sideEdge]: 0, width: side.width ?? "33%" }} />}
      {design && <DesignEdges design={design} />}
    </div>
  );
}

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

type Job = { id: number; resume: Resume; photoUrl: string; onPrinted?: () => void };

export function usePdfExport() {
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<PdfExportStatus>("idle");
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  /** `onPrinted` runs when the print window closes. Browsers don't say whether a PDF was actually saved. */
  const start = useCallback((resume: Resume, photoUrl: string, onPrinted?: () => void) => {
    if (typeof window.print !== "function") {
      setStatus("error");
      setMessage("This browser can't save PDFs from a web page. Try Chrome, Edge or Firefox on a computer.");
      return;
    }
    setMessage("");
    setStatus("preparing");
    setJob({ id: Date.now(), resume, photoUrl, onPrinted });
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

    const finish = (event?: Event) => {
      if (event) job.onPrinted?.();
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
        if (needsStaticFonts()) {
          const template = getTemplate(job.resume.design.templateId);
          const { fontFamily } = job.resume.design;
          await loadStaticFonts(fontFamily ? [fontFamily] : template?.design ? [template.design.fonts.heading, template.design.fonts.body] : ["inter", "sourceSerif"]);
        }
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
        timer = setTimeout(() => finish(), PRINT_FALLBACK_MS);
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
    const gecko = needsStaticFonts();
    const inset = pageInset(template.slug, template.design) * 4;
    const preview = (
      <ResumePreview
        template={template}
        resume={job.resume}
        photoUrl={job.photoUrl}
        size={job.resume.design.pageSize}
        flow
        printCopy
        asideFirst={gecko}
      />
    );
    printView = createPortal(
      <div
        ref={rootRef}
        className={gecko ? "print-root print-root--gecko paged paged--gecko" : "print-root paged"}
        aria-hidden="true"
        style={{ "--page-inset": `${inset}px`, "--footer-trim": `${geckoFooterTrim(inset)}px` } as CSSProperties}
      >
        <style>{pageRule(job.resume.design.pageSize) + (gecko ? staticFontCss : "")}</style>
        <PrintLayers template={template} customization={job.resume.design} />
        <div className="print-page-content">{gecko ? <PrintFrame>{preview}</PrintFrame> : preview}</div>
      </div>,
      document.body,
    );
  }

  return { start, status, message, dismiss, printView, fileName: job ? `${pdfFileName(job.resume.profile.fullName)}.pdf` : "" };
}

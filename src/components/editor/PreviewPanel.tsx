"use client";

import { ChevronDown, Maximize, Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { pageSizes } from "@/components/resume/ResumePaper";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { buttonClass } from "@/components/ui/styles";
import { getTemplate, type TemplateSlug, templateCategories, templates } from "@/data/templates";
import { isResumeEmpty } from "@/lib/resumes";
import type { Zoom } from "@/lib/resume-storage";
import type { Resume } from "@/data/resume";

const ZOOM_STEPS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5];
const MIN_FIT = 0.3;
const MAX_FIT = 1.25;

type PreviewPanelProps = {
  resume: Resume;
  photoUrl: string;
  zoom: Zoom;
  onZoomChange: (zoom: Zoom) => void;
  onTemplateChange: (template: TemplateSlug) => void;
  onLoadSample: () => void;
};

const toolbarButton =
  "inline-flex h-9 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-35";

export function PreviewPanel({ resume, photoUrl, zoom, onZoomChange, onTemplateChange, onLoadSample }: PreviewPanelProps) {
  const selectId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageElement, setPageElement] = useState<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const page = pageSizes[resume.design.pageSize];

  // Track the space available for the page so "Fit" can size it.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const padding = entry.contentRect.width < 640 ? 32 : 96;
      setAvailableWidth(entry.contentRect.width - padding);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Count how many pages the content fills.
  useEffect(() => {
    if (!pageElement) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = pageElement.getBoundingClientRect();
      if (width > 0) setPageCount(Math.max(1, Math.ceil(height / (width * page.ratio) - 0.01)));
    });
    observer.observe(pageElement);
    return () => observer.disconnect();
  }, [pageElement, page.ratio]);

  const fitScale = availableWidth === null ? null : Math.min(MAX_FIT, Math.max(MIN_FIT, availableWidth / page.width));
  const scale = zoom === "fit" ? (fitScale ?? 1) : zoom;
  const zoomOut = [...ZOOM_STEPS].reverse().find((step) => step < scale - 0.001);
  const zoomIn = ZOOM_STEPS.find((step) => step > scale + 0.001);
  const template = getTemplate(resume.design.templateId) ?? templates[0];
  const empty = isResumeEmpty(resume);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-5">
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="text-[0.875rem] text-muted">
            Template
          </label>
          <div className="relative">
            <select
              id={selectId}
              value={template.slug}
              onChange={(event) => onTemplateChange(event.target.value)}
              className="h-9 appearance-none rounded-lg border border-line bg-transparent pr-8 pl-2.5 text-[0.875rem] text-ink-soft hover:border-ink/35 focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent"
            >
              {templateCategories.map((category) => (
                <optgroup key={category.id} label={category.label}>
                  {templates
                    .filter((item) => item.category === category.id)
                    .map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 hidden text-[0.875rem] text-muted sm:inline">
            {page.label} · about {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
          <button
            type="button"
            onClick={() => zoomOut && onZoomChange(zoomOut)}
            disabled={!zoomOut}
            aria-label="Zoom out"
            className={`${toolbarButton} w-10`}
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <span className="w-11 text-center text-[0.875rem] text-muted tabular-nums" aria-label={`Zoom ${Math.round(scale * 100)}%`}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomIn && onZoomChange(zoomIn)}
            disabled={!zoomIn}
            aria-label="Zoom in"
            className={`${toolbarButton} w-10`}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onZoomChange("fit")}
            aria-pressed={zoom === "fit"}
            className={`${toolbarButton} gap-1.5 px-2.5 text-[0.875rem] aria-pressed:bg-ink/5 aria-pressed:text-ink`}
          >
            <Maximize aria-hidden="true" className="size-3.5" />
            Fit
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="editor-scroll min-h-0 flex-1 overflow-auto px-4 pt-2 pb-6 sm:px-12 sm:pb-12" role="region" aria-label="Resume preview">
        {fitScale !== null && (
          <div className="mx-auto" style={{ width: page.width * scale }}>
            {empty && (
              <div className="sticky top-2 z-10 mx-auto mb-3 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-surface px-4 py-2 shadow-pop">
                <p className="text-[0.875rem] text-muted">Sample shown until you add your details</p>
                <button type="button" onClick={onLoadSample} className={buttonClass("secondary", "sm", "h-9 px-3.5")}>
                  Load sample data
                </button>
              </div>
            )}
            {/* The sample stands in here only; PDF export always renders the real resume. */}
            <div aria-hidden={empty || undefined}>
              <ResumePreview
                template={template}
                resume={empty ? undefined : resume}
                photoUrl={empty ? undefined : photoUrl}
                size={resume.design.pageSize}
                flow
                pageRef={setPageElement}
                className={`shadow-sheet ${empty ? "[&_.resume-page]:opacity-35" : ""}`}
              />
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              {pageCount > 1 ? `Your content runs to about ${pageCount} pages. ` : ""}The PDF is the final check, because page breaks can differ slightly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

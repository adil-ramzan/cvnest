"use client";

import { ChevronDown, Maximize, Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { pageSizes } from "@/components/resume/ResumePaper";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { getTemplate, type TemplateSlug, templateCategories, templates } from "@/data/templates";
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
};

const toolbarButton =
  "inline-flex h-10 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-35";

export function PreviewPanel({ resume, photoUrl, zoom, onZoomChange, onTemplateChange }: PreviewPanelProps) {
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-sheet">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="text-sm font-medium text-muted">
            Template
          </label>
          <div className="relative">
            <select
              id={selectId}
              value={template.slug}
              onChange={(event) => onTemplateChange(event.target.value)}
              className="h-10 appearance-none rounded-lg border border-line-strong bg-surface pr-9 pl-3 text-sm font-medium text-ink hover:border-[#c4beb2] focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent/25"
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
          <span className="mr-3 hidden text-sm text-muted sm:inline">
            {page.label} · {pageCount} {pageCount === 1 ? "page" : "pages"}
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
          <span className="w-12 text-center text-sm font-medium text-ink tabular-nums" aria-label={`Zoom ${Math.round(scale * 100)}%`}>
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
            className={`${toolbarButton} gap-1.5 px-3 text-sm font-medium aria-pressed:bg-ink/5 aria-pressed:text-ink`}
          >
            <Maximize aria-hidden="true" className="size-3.5" />
            Fit
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-12 sm:py-12" role="region" aria-label="Resume preview">
        {fitScale !== null && (
          <div className="mx-auto" style={{ width: page.width * scale }}>
            <ResumePreview
              template={template}
              resume={resume}
              photoUrl={photoUrl}
              size={resume.design.pageSize}
              flow
              pageRef={setPageElement}
              className="shadow-sheet"
            />
            {pageCount > 1 && (
              <p className="mt-4 text-center text-sm text-muted">
                Your content runs to {pageCount} pages. Faint lines mark where each page ends.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

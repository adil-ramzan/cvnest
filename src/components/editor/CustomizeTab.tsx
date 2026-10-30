"use client";

import { useState } from "react";
import { type PageSize, pageSizes } from "@/components/resume/ResumePaper";
import { ResumePreview } from "@/components/resume/ResumePreview";
import type { Resume } from "@/data/resume";
import { getCategory, getTemplate, type TemplateCategory, type TemplateSlug, templateCategories, templates } from "@/data/templates";

type CustomizeTabProps = {
  resume: Resume;
  photoUrl: string;
  template: TemplateSlug;
  pageSize: PageSize;
  onTemplateChange: (template: TemplateSlug) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
};

const groupClass = "border-b border-line px-4 py-6 sm:px-6";
const chipClass =
  "inline-flex h-9 items-center rounded-full border border-line px-3.5 text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white";

export function CustomizeTab({ resume, photoUrl, template, pageSize, onTemplateChange, onPageSizeChange }: CustomizeTabProps) {
  const current = getTemplate(template);
  const [category, setCategory] = useState<TemplateCategory | "all">(() => current?.category ?? "all");
  const shown = category === "all" ? templates : templates.filter((item) => item.category === category);

  return (
    <div>
      <section className={groupClass} aria-labelledby="customize-template">
        <h2 id="customize-template" className="text-lg font-semibold text-ink">
          Template
        </h2>
        {current && (
          <p className="mt-1 text-base text-muted">
            <span className="font-medium text-ink">{current.name}</span> · {getCategory(current.category).label} · {current.layout}
          </p>
        )}
        <p className="mt-2 text-sm text-muted">
          Fonts, colors and spacing are part of each template. Switch any time; your content stays the same.
          {current?.photo === "always" && !resume.profile.photo && " This template shows your initials until you add a photo."}
        </p>

        <div role="group" aria-label="Template category" className="mt-5 flex flex-wrap gap-2">
          {[{ id: "all" as const, label: "All" }, ...templateCategories].map((option) => (
            <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)} className={chipClass}>
              {option.label}
            </button>
          ))}
        </div>

        <fieldset className="mt-6">
          <legend className="sr-only">Choose a template</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => {
              const selected = item.slug === template;
              return (
                <label key={item.slug} className="group cursor-pointer [contain-intrinsic-block-size:auto_280px] [content-visibility:auto]">
                  <input
                    type="radio"
                    name="template"
                    value={item.slug}
                    checked={selected}
                    onChange={() => onTemplateChange(item.slug)}
                    className="peer sr-only"
                  />
                  <span
                    className={`block rounded-xl bg-sheet p-2.5 ring-1 transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${selected ? "ring-2 ring-accent" : "ring-line group-hover:ring-line-strong"}`}
                  >
                    <ResumePreview template={item} resume={resume} photoUrl={photoUrl} thumbnail className="rounded-[2px] shadow-sm" />
                  </span>
                  <span className="mt-2.5 block text-base font-medium text-ink">{item.name}</span>
                  <span className="block text-sm text-muted">{item.layout}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className={groupClass}>
        <fieldset>
          <legend className="text-lg font-semibold text-ink">Page settings</legend>
          <p className="mt-1 text-base text-muted">Paper size used for the preview and page breaks.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(Object.keys(pageSizes) as PageSize[]).map((size) => (
              <label
                key={size}
                className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 has-checked:border-accent has-checked:bg-accent-soft/50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name="page-size"
                  value={size}
                  checked={pageSize === size}
                  onChange={() => onPageSizeChange(size)}
                  className="size-4 accent-accent"
                />
                <span>
                  <span className="block text-base font-medium text-ink">{pageSizes[size].label}</span>
                  <span className="block text-sm text-muted">{pageSizes[size].detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
}

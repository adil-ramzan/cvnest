"use client";

import { type ReactNode, useState } from "react";
import { buttonClass, siteButtonMotion } from "@/components/ui/styles";
import { categoryDetails, type GalleryCategory, type GalleryTemplate, INITIAL_CARDS } from "./gallery";
import { GalleryCard } from "./GalleryCard";

type TemplateSectionProps = {
  category: GalleryCategory;
  items: GalleryTemplate[];
  /** Server-rendered thumbnails for cards in view on load. */
  eager: Record<string, ReactNode>;
  onPreview: (template: GalleryTemplate) => void;
};

export function TemplateSection({ category, items, eager, onPreview }: TemplateSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, INITIAL_CARDS);
  const hiddenCount = items.length - INITIAL_CARDS;
  const headingId = `${category.id}-heading`;

  return (
    <section id={category.id} aria-labelledby={headingId} className="scroll-mt-40 pt-(--section-y)">
      <h2 id={headingId} className="text-h2 text-balance text-ink">
        {category.label} templates
      </h2>
      <p className="mt-3 max-w-2xl text-body text-muted">{categoryDetails[category.id].idealFor}</p>

      <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
        {shown.map((template) => (
          <li key={template.slug}>
            <GalleryCard template={template} thumbnail={eager[template.slug]} onPreview={onPreview} />
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className={buttonClass("secondary", "lg", `${siteButtonMotion.secondary} mt-10`)}>
          {expanded ? "See fewer" : `See ${hiddenCount} more`}
          <span className="sr-only"> {category.label.toLowerCase()} templates</span>
        </button>
      )}
    </section>
  );
}

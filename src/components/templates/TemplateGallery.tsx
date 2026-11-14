"use client";

import { Search, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Container } from "@/components/ui/Container";
import { buttonClass, siteButtonMotion } from "@/components/ui/styles";
import { CategoryChips } from "./CategoryChips";
import type { GalleryCategory, GalleryTemplate } from "./gallery";
import { GalleryCard } from "./GalleryCard";
import { PreviewModal } from "./PreviewModal";
import { TemplateSection } from "./TemplateSection";

type TemplateGalleryProps = {
  categories: GalleryCategory[];
  items: GalleryTemplate[];
  eager: Record<string, ReactNode>;
  total: string;
};

export function TemplateGallery({ categories, items, eager, total }: TemplateGalleryProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<GalleryTemplate | null>(null);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  const matches = searching ? items.filter((template) => terms.every((term) => template.search.includes(term))) : [];

  // Template pages link here with ?category=photo.
  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category) document.getElementById(category)?.scrollIntoView();
  }, []);

  return (
    <>
      <Container>
        <div className="relative mt-8 max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Search templates
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: serif, sidebar, photo…"
            className="h-12 w-full rounded-[14px] border border-line-strong bg-surface pr-4 pl-11 text-base text-ink placeholder:text-placeholder focus:border-accent focus:outline-3 focus:outline-offset-0 focus:outline-accent/20"
          />
        </div>
      </Container>

      {searching ? (
        <Container className="pt-8 pb-(--section-y)">
          <p role="status" className="text-small text-muted">
            {matches.length} of {total} templates
          </p>
          {matches.length > 0 ? (
            <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
              {matches.map((template) => (
                <li key={template.slug}>
                  <GalleryCard template={template} thumbnail={eager[template.slug]} onPreview={setPreviewing} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-3xl bg-surface px-6 py-14 text-center shadow-soft">
              <p className="text-title text-ink">No templates match that search</p>
              <p className="mt-2 text-base text-muted">Try a style, a color or a job title.</p>
              <button type="button" onClick={() => setQuery("")} className={buttonClass("secondary", "md", `${siteButtonMotion.secondary} mt-6`)}>
                <X aria-hidden="true" className="size-4" />
                Clear search
              </button>
            </div>
          )}
        </Container>
      ) : (
        <div className="mt-8 pb-(--section-y)">
          <CategoryChips categories={categories} />
          <Container>
            {categories.map((category) => (
              <TemplateSection
                key={category.id}
                category={category}
                items={items.filter((template) => template.category === category.id)}
                eager={eager}
                onPreview={setPreviewing}
              />
            ))}
          </Container>
        </div>
      )}

      <PreviewModal
        template={previewing}
        categoryLabel={categories.find((category) => category.id === previewing?.category)?.label ?? ""}
        onClose={() => setPreviewing(null)}
      />
    </>
  );
}

"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

type CategoryOption = { id: string; label: string; count: number };

type TemplateFiltersProps = {
  categories: CategoryOption[];
  total: number;
  /** id of the server-rendered list whose items carry data-category and data-search attributes. */
  gridId: string;
};

/**
 * Search and category filters for the template gallery. The cards are rendered
 * on the server; this only toggles their visibility, so the 45 thumbnails never
 * need to hydrate.
 */
export function TemplateFilters({ categories, total, gridId }: TemplateFiltersProps) {
  const searchId = useId();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(total);

  // Allow linking to a category, e.g. /templates?category=photo.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("category");
    if (initial && categories.some((c) => c.id === initial)) setCategory(initial);
  }, [categories]);

  useEffect(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const items = document.querySelectorAll<HTMLElement>(`#${CSS.escape(gridId)} > [data-category]`);
    let count = 0;
    items.forEach((item) => {
      const search = item.dataset.search ?? "";
      const match =
        (category === "all" || item.dataset.category === category) && terms.every((term) => search.includes(term));
      item.hidden = !match;
      if (match) count++;
    });
    setVisible(count);

    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    window.history.replaceState(null, "", url);
  }, [category, query, gridId]);

  const options = [{ id: "all", label: "All", count: total }, ...categories];
  const clear = () => {
    setCategory("all");
    setQuery("");
  };

  return (
    <div className="mt-10">
      <div className="flex flex-col-reverse gap-5">
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={category === option.id}
              onClick={() => setCategory(option.id)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
            >
              {option.label}
              <span className="text-sm font-normal opacity-60">{option.count}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Search templates
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: serif, sidebar, photo…"
            className="h-11 w-full rounded-lg border border-line-strong bg-surface pr-3.5 pl-10 text-base text-ink placeholder:text-placeholder focus:border-accent focus:outline-3 focus:outline-offset-0 focus:outline-accent/20"
          />
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" role="status">
        {visible === total ? `${total} templates` : `${visible} of ${total} templates`}
      </p>

      {visible === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <p className="text-base font-medium text-ink">No templates match your search.</p>
          <button
            type="button"
            onClick={clear}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            <X aria-hidden="true" className="size-4" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

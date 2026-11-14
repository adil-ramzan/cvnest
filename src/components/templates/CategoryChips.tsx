"use client";

import { useEffect, useRef, useState } from "react";
import { focusRing } from "@/components/ui/styles";
import { categoryDetails, type GalleryCategory } from "./gallery";

/** Links rather than buttons: the browser scrolls to each section, smoothly unless reduced motion is set. */
export function CategoryChips({ categories }: { categories: GalleryCategory[] }) {
  const [active, setActive] = useState(categories[0]?.id);
  const barRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = categories.map(({ id }) => document.getElementById(id)).filter((section) => section !== null);
    // The band sits just below the sticky bars, so whichever section crosses it is the one being read.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((item) => item.isIntersecting);
        if (entry) setActive(entry.target.id as GalleryCategory["id"]);
      },
      { rootMargin: "-170px 0px -70% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  // Keep the active chip in view when the row scrolls sideways on small screens.
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>("[aria-current]");
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.offsetLeft - 16 });
  }, [active]);

  return (
    <nav aria-label="Template categories" className="sticky top-18 z-30 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl">
        <ul
          ref={barRef}
          // Chrome doesn't scroll a partly visible chip into view when it gets keyboard focus.
          onFocus={(event) => (event.target as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" })}
          className="flex scroll-px-4 gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
          {categories.map(({ id, label, count }) => {
            const Icon = categoryDetails[id].icon;
            return (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  aria-current={active === id ? "true" : undefined}
                  className={`inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-base font-medium text-ink-soft transition-colors duration-150 ease-out hover:border-ink/35 hover:bg-canvas hover:text-ink active:bg-canvas aria-[current]:border-ink aria-[current]:bg-ink aria-[current]:text-white ${focusRing}`}
                >
                  <Icon aria-hidden="true" className="size-4.5" />
                  {label}
                  <span className="font-normal opacity-80">{count}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

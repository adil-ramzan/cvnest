"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { focusRing } from "@/components/ui/styles";
import type { TemplateCategory } from "@/data/templates";

export type CarouselCard = { slug: string; category: TemplateCategory; inAll: boolean; node: ReactNode };
type Filter = TemplateCategory | "all";

const arrowClass = `inline-flex size-12 items-center justify-center rounded-[14px] bg-surface text-ink shadow-soft transition-colors hover:bg-panel disabled:opacity-40 ${focusRing}`;
const chipClass = `h-11 rounded-full border border-line px-5 text-base font-medium text-ink-soft transition-colors hover:border-ink/35 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white ${focusRing}`;

/**
 * Cards are rendered on the server and passed in, like the gallery's, so the
 * template registry stays out of the homepage's client bundle.
 */
export function TemplateCarousel({ cards, filters }: { cards: CarouselCard[]; filters: { id: TemplateCategory; label: string }[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);

  const isShown = (card: CarouselCard) => (filter === "all" ? card.inAll : card.category === filter);
  const shownCount = cards.filter(isShown).length;

  const visibleItems = useCallback(
    () => [...(trackRef.current?.children ?? [])].filter((item): item is HTMLElement => item instanceof HTMLElement && !item.hidden),
    [],
  );

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const items = visibleItems();
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    const nearest = items.reduce(
      (best, item, index) => (Math.abs(item.offsetLeft - track.offsetLeft - track.scrollLeft) < Math.abs(items[best].offsetLeft - track.offsetLeft - track.scrollLeft) ? index : best),
      0,
    );
    setActive(atEnd ? items.length - 1 : nearest);
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const item = visibleItems()[index];
    if (!track || !item) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: item.offsetLeft - track.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  };

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  };

  return (
    <div className="mt-10">
      <div role="group" aria-label="Filter templates by category" className="flex flex-wrap gap-2">
        {[{ id: "all" as const, label: "All" }, ...filters].map((option) => (
          <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => changeFilter(option.id)} className={chipClass}>
            {option.label}
          </button>
        ))}
      </div>

      <ul
        ref={trackRef}
        onScroll={onScroll}
        aria-label="Template previews"
        className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card) => (
          <li key={card.slug} hidden={!isShown(card)} className="w-[82%] shrink-0 snap-start [contain-intrinsic-block-size:auto_480px] [content-visibility:auto] sm:w-[46%] lg:w-[30.5%]">
            {card.node}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-wrap">
          {Array.from({ length: shownCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to template ${index + 1} of ${shownCount}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => goTo(index)}
              className={`group flex size-6 items-center justify-center rounded-full ${focusRing}`}
            >
              <span className={`size-2.5 rounded-full transition-colors ${index === active ? "bg-ink" : "bg-ink/25 group-hover:bg-ink/50"}`} />
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Previous template" disabled={active === 0} onClick={() => goTo(active - 1)} className={arrowClass}>
            <ChevronLeft aria-hidden="true" className="size-6" />
          </button>
          <button type="button" aria-label="Next template" disabled={active >= shownCount - 1} onClick={() => goTo(active + 1)} className={arrowClass}>
            <ChevronRight aria-hidden="true" className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

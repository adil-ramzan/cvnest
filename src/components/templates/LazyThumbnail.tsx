"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";

const Thumbnail = dynamic(() => import("./TemplateThumbnail"), { ssr: false });

/** Starts loading before the card scrolls into view. */
const LOAD_MARGIN = "400px";

/** Reserves the page's shape, then renders the resume once it's near the viewport, so nothing shifts. */
export function LazyThumbnail({ slug, eager }: { slug: string; eager?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || eager) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: LOAD_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <div ref={ref} className="aspect-[8.5/11] overflow-hidden rounded-2xl bg-surface shadow-soft">
      {eager ?? (near && <Thumbnail slug={slug} />)}
    </div>
  );
}

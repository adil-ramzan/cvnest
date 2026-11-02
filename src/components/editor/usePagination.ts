"use client";

import { useEffect, useState } from "react";
import { type PageLayout, paginate, type PageSpec } from "@/components/resume/paginate";

/** Waits for a pause in typing, so measuring never slows a keystroke. */
const SETTLE_MS = 250;

/** Lays the preview out in pages whenever `version` or the page size changes. */
export function usePagination(page: HTMLElement | null, spec: PageSpec, scale: number, version: unknown) {
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const { width, height, inset, gap, gecko } = spec;

  useEffect(() => {
    const sheet = page?.closest<HTMLElement>(".resume-paper");
    if (!sheet) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await document.fonts.ready;
      if (!cancelled) setLayout(paginate(sheet, { width, height, inset, gap, gecko }));
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, width, height, inset, gap, gecko, scale, version]);

  return layout;
}

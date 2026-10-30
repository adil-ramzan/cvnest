"use client";

import { useEffect, useState } from "react";
import type { ProfilePhoto } from "@/data/resume";
import { photoUrl } from "@/lib/photo-store";

/** Resolves a resume's photo metadata to a displayable URL (from IndexedDB, or inline data). */
export function usePhotoUrl(photo: ProfilePhoto | undefined): string {
  const id = photo?.id;
  const inline = photo?.inlineData;
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!id || inline) return;
    let cancelled = false;
    photoUrl(id).then((url) => {
      if (!cancelled) setResolved({ id, url: url ?? "" });
    });
    return () => {
      cancelled = true;
    };
  }, [id, inline]);

  if (!id) return "";
  if (inline) return inline;
  return resolved?.id === id ? resolved.url : "";
}

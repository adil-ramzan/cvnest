"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { focusRing } from "@/components/ui/styles";
import type { GalleryTemplate } from "./gallery";
import { photoLabel } from "./GalleryCard";

const Thumbnail = dynamic(() => import("./TemplateThumbnail"), { ssr: false });

type PreviewModalProps = {
  template: GalleryTemplate | null;
  categoryLabel: string;
  onClose: () => void;
};

/** Built on the native <dialog>, which provides focus trapping, Escape and returning focus to the card. */
export function PreviewModal({ template, categoryLabel, onClose }: PreviewModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (template && !dialog.open) dialog.showModal();
    if (!template && dialog.open) dialog.close();
  }, [template]);

  const photoTag = template && photoLabel(template.photo);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-3xl bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/50"
    >
      {template && (
        <div className="grid max-h-[90dvh] overflow-y-auto md:grid-cols-[minmax(0,1fr)_20rem] md:overflow-hidden">
          <div className="bg-panel p-4 sm:p-6 md:max-h-[90dvh] md:overflow-y-auto">
            <div className="mx-auto aspect-[8.5/11] max-w-xl overflow-hidden rounded-xl bg-surface shadow-soft">
              <Thumbnail slug={template.slug} />
            </div>
          </div>

          <div className="relative p-6 md:overflow-y-auto">
            <button
              type="button"
              aria-label="Close preview"
              onClick={onClose}
              className={`absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-[14px] text-ink hover:bg-ink/5 ${focusRing}`}
            >
              <X aria-hidden="true" className="size-6" />
            </button>
            <p className="pr-10 text-base font-medium text-accent-ink">
              {categoryLabel} · {template.layout}
            </p>
            <h2 id={titleId} className="mt-1 text-3xl font-bold tracking-tight">
              {template.name}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">{template.description}</p>
            <p className="mt-4 text-base text-muted">
              <span className="font-medium text-ink">Best for:</span> {template.bestFor}
            </p>
            {photoTag && <p className="mt-2 text-base text-muted">{photoTag}</p>}
            <ButtonLink href={`/editor?template=${template.slug}`} size="lg" className="mt-6 w-full">
              Use This Template
            </ButtonLink>
            <Link href={`/templates/${template.slug}`} className="mt-3 block rounded-lg py-2 text-center text-base font-medium text-ink underline underline-offset-4 hover:text-muted">
              Open full page
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}

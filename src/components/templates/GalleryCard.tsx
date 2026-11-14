import Link from "next/link";
import type { ReactNode } from "react";
import type { GalleryTemplate } from "./gallery";
import { LazyThumbnail } from "./LazyThumbnail";

type GalleryCardProps = {
  template: GalleryTemplate;
  thumbnail?: ReactNode;
  onPreview: (template: GalleryTemplate) => void;
};

// Both buttons tint, and lift 1px with motion allowed, on hover. White focus ring on the dark overlay (teal is under 3:1 there). Marked important: the global
// :focus-visible rule in globals.css sits outside the layers, so it outranks plain utilities.
const overlayButton = "inline-flex h-11 flex-1 items-center justify-center rounded-[14px] px-4 text-base font-bold transition-[color,background-color,border-color,box-shadow,translate] duration-200 ease-out motion-safe:hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white!";

export function photoLabel(photo: GalleryTemplate["photo"]) {
  return photo === "always" ? "With photo" : photo === "optional" ? "Photo optional" : null;
}

export function GalleryCard({ template, thumbnail, onPreview }: GalleryCardProps) {
  const { name, slug, structure, layout, description, photo } = template;
  const photoTag = photoLabel(photo);

  return (
    <article className="group relative rounded-2xl has-[.card-open:focus-visible]:outline-2 has-[.card-open:focus-visible]:outline-offset-4 has-[.card-open:focus-visible]:outline-accent">
      {/* Covers the whole card, including the name. The overlay's controls sit above it. */}
      <button type="button" aria-label={`Preview ${name} template`} onClick={() => onPreview(template)} className="card-open absolute inset-0 z-10 cursor-pointer rounded-2xl outline-none" />

      {/* Lifts with a deeper shadow and a border ring on hover. The overlay fades in on the same 200ms ease-out; with reduced motion the lift goes but the fade stays.
          The lift makes this a stacking layer, so it sits above the card button (z-20) and lets clicks
          through to it; only the overlay buttons take the pointer. */}
      <div className="pointer-events-none relative z-20 rounded-2xl ring-1 ring-transparent transition-[translate,box-shadow] duration-200 ease-out group-hover:shadow-pop group-hover:ring-line-strong motion-safe:group-hover:-translate-y-1">
        <LazyThumbnail slug={slug} eager={thumbnail} />

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end gap-3 rounded-2xl bg-ink/92 p-5 text-white opacity-0 transition-opacity duration-200 ease-out group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden">
          <p className="flex flex-wrap gap-1.5 text-base">
            <span className="rounded-full border border-white/40 px-3 py-0.5">{structure}</span>
            {layout !== structure && <span className="rounded-full border border-white/40 px-3 py-0.5">{layout}</span>}
            {photoTag && <span className="rounded-full border border-white/40 px-3 py-0.5">{photoTag}</span>}
          </p>
          <p className="line-clamp-4 text-base leading-relaxed">{description}</p>
          <div className="pointer-events-auto flex gap-2">
            <button type="button" aria-label={`Preview ${name} template`} onClick={() => onPreview(template)} className={`${overlayButton} border border-white/60 text-white hover:border-white hover:bg-white/20 active:bg-white/25`}>
              Preview
            </button>
            <Link href={`/editor?template=${slug}`} aria-label={`Use ${name} template`} className={`${overlayButton} bg-surface text-ink hover:bg-accent-soft hover:shadow-pop active:bg-accent-soft`}>
              Use Template
            </Link>
          </div>
        </div>

        {/* Touch screens have no hover, so this stays visible there. */}
        <span aria-hidden="true" className="absolute right-3 bottom-3 z-0 hidden rounded-full bg-ink px-4 py-1.5 text-base font-bold text-white shadow-pop [@media(hover:none)]:block">
          Preview
        </span>
      </div>

      <h3 className="mt-4 text-title text-ink">{name}</h3>
    </article>
  );
}

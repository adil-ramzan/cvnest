import { ResumePreview } from "@/components/resume/ResumePreview";
import { getTemplate } from "@/data/templates";

/**
 * One upright resume (Professional) with a sliver of Canvas's cream banner peeking out behind
 * it: a thin strip above its top edge and along its right edge. Only the banner colour is
 * drawn for Canvas, so none of its text can ever show. The parent sets the width; the resume
 * is a full Letter page.
 *
 * The strip is a page-shaped block tilted 3° clockwise around its bottom-left corner. Its
 * offset is a percentage of its own size (cancelling the tilt's drift: the top-right corner
 * moves 6.63% of the width right and 4.18% of the height down) plus a fixed gap, so its
 * top-right corner sits about 22px right of and 18px above the resume's (12px and 10px below
 * 1024px) at every size.
 *
 * Decorative and static (the hero describes it in words for screen readers).
 */
export function HeroTemplateFan({ className = "" }: { className?: string }) {
  const front = getTemplate("professional")!;
  const strip = getTemplate("canvas")!.design?.colors.banner?.bg;

  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      {/* Clipped to the resume's left and bottom edges: pivoting on its bottom-left corner, the
          strip's lower left edge would otherwise lean about 16px out past the resume. */}
      <div className="absolute inset-0 [clip-path:inset(-4rem_-3rem_0_0)]">
        <div
          className="absolute inset-x-0 top-0 aspect-[8.5/11] origin-bottom-left translate-x-[calc(0.75rem-6.63%)] translate-y-[calc(-0.625rem-4.18%)] rotate-3 rounded-xl border border-line lg:translate-x-[calc(1.375rem-6.63%)] lg:translate-y-[calc(-1.125rem-4.18%)]"
          style={{ backgroundColor: strip }}
        />
      </div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
        <ResumePreview template={front} customization={{}} thumbnail />
      </div>
    </div>
  );
}

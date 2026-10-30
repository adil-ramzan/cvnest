import type { ReactNode, Ref } from "react";
import type { PageSize } from "@/data/resume";

export type { PageSize };

/** Page width in CSS pixels (96 dpi) and height-to-width ratio. */
export const pageSizes: Record<PageSize, { label: string; detail: string; width: number; ratio: number }> = {
  letter: { label: "US Letter", detail: "8.5 × 11 in", width: 816, ratio: 11 / 8.5 },
  a4: { label: "A4", detail: "210 × 297 mm", width: 794, ratio: 297 / 210 },
};

type ResumePaperProps = {
  children: ReactNode;
  /** Accessible name for miniature previews. When set, the document is exposed as a single image. */
  label?: string;
  /** Let content run past the first page (editor preview) instead of cropping to one page. */
  flow?: boolean;
  size?: PageSize;
  /** Ref to the page content element, e.g. to measure how many pages the content fills. */
  pageRef?: Ref<HTMLDivElement>;
  className?: string;
};

export function ResumePaper({ children, label, flow = false, size = "letter", pageRef, className = "" }: ResumePaperProps) {
  const imageProps = label ? { role: "img", "aria-label": label } : {};
  const classes = ["resume-paper", flow && "resume-paper--flow", size === "a4" && "resume-paper--a4", "w-full", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...imageProps}>
      <div ref={pageRef} className="resume-page">
        {children}
      </div>
    </div>
  );
}

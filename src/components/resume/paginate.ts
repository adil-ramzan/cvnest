/**
 * Page breaks for the editor preview. The preview is one long sheet, so a hidden copy
 * of it is laid out in columns one page tall. The browser fragments those with the
 * same engine and the same `.paged` rules as a PDF, so the breaks come from there
 * rather than from a guess, and the sheet is then spaced out to match.
 */

/** Elements a page can begin with. Matched by position between the sheet and its copy. */
const BLOCKS = "h1, h2, h3, p, li, span, img";

/** Past this, spacing every page would slow typing, so the sheet stays continuous. */
const MAX_NODES = 6000;
export const MAX_SPACED_PAGES = 40;

const SPACER = "data-page-spacer";

/** How much shorter Firefox's footer row is than its header row. See `.print-frame` in globals.css. Compact insets keep it full. */
export const geckoFooterTrim = (inset: number) => (inset < 40 ? 0 : 16);

export type PageSpec = {
  /** Printed page size and top and bottom space, in CSS pixels. */
  width: number;
  height: number;
  inset: number;
  /** Gap between pages in the preview, in screen pixels. */
  gap: number;
  gecko: boolean;
};

/** How full the content area of the last page is, 0 to 1: its top and bottom margins don't count. */
export type PageLayout = { pages: number; lastPageFill: number; spaced: boolean };

/** A last page this full holds only a few lines: up to about five lines of text in any template. */
export const FEW_LINES_FILL = 0.12;

/**
 * How much of a page's content area is used down to `bottom`, measured from the top of the
 * page's column. Chrome's columns include the page's top and bottom padding, so that padding
 * is left out here; Firefox's hold only what its print frame leaves. Measuring from the page
 * edge instead made the same few lines count as fuller in templates with deeper margins (T-05).
 */
export function contentFill(bottom: number, { height, inset, gecko }: Pick<PageSpec, "height" | "inset" | "gecko">) {
  const top = gecko ? 0 : inset;
  const usable = gecko ? height - inset * 2 + geckoFooterTrim(inset) : height - inset * 2;
  return Math.max(0, (bottom - top) / usable);
}

type Placement = { element: HTMLElement; column: number; top: number; bottom: number; parts: { column: number; height: number; top: number }[] };

/** Where each block lands in the hidden columns. `sheet` is cloned, so it is never touched here. */
function measure(sheet: HTMLElement, spec: PageSpec) {
  // Chrome's columns hold each page's padding themselves. Firefox's hold what its print frame leaves.
  const columnHeight = spec.gecko ? spec.height - spec.inset * 2 + geckoFooterTrim(spec.inset) : spec.height;
  const host = document.createElement("div");
  host.className = spec.gecko ? "pagination-host paged paged--gecko" : "pagination-host paged";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `--page-inset:${spec.inset}px;width:${spec.width}px;height:${columnHeight}px;column-width:${spec.width}px`;
  host.append(sheet.cloneNode(true));
  document.body.append(host);

  const origin = host.getBoundingClientRect();
  const columnOf = (rect: DOMRect) => Math.max(0, Math.floor((rect.left - origin.left + 1) / spec.width));
  const originals = [...sheet.querySelectorAll<HTMLElement>(BLOCKS)];
  const placements: Placement[] = [];
  host.querySelectorAll<HTMLElement>(BLOCKS).forEach((copy, index) => {
    const rects = [...copy.getClientRects()].filter((rect) => rect.height > 0);
    if (rects.length === 0) return;
    const parts = new Map<number, { column: number; height: number; top: number }>();
    for (const rect of rects) {
      const column = columnOf(rect);
      const part = parts.get(column) ?? { column, height: 0, top: rect.top - origin.top };
      parts.set(column, { ...part, height: part.height + rect.height });
    }
    placements.push({
      element: originals[index],
      column: columnOf(rects[0]),
      top: rects[0].top - origin.top,
      bottom: rects.at(-1)!.bottom - origin.top,
      parts: [...parts.values()],
    });
  });
  host.remove();

  const pages = Math.max(1, ...placements.map((p) => p.parts.at(-1)!.column + 1));
  const onLast = placements.filter((p) => p.parts.at(-1)!.column === pages - 1);
  const lastPageFill = pages > 1 ? contentFill(Math.max(0, ...onLast.map((p) => p.bottom)), spec) : 1;
  return { placements, pages, lastPageFill };
}

/** The outermost box starting with this element, so a whole section or entry moves, rule included. */
function outermost(element: HTMLElement, flow: HTMLElement) {
  let box = element;
  while (box.parentElement && box.parentElement !== flow && box.parentElement.firstElementChild === box) box = box.parentElement;
  return box;
}

/** Holds a block's next lines below the gap: a float as tall as the lines before it, then one as wide as the block. */
function splitBlock(block: HTMLElement, linesBefore: number, gap: number) {
  const anchor = [...block.childNodes].find((node) => !(node instanceof HTMLElement && node.hasAttribute(SPACER))) ?? null;
  for (const css of [`width:0;height:${linesBefore}px`, `width:100%;height:${gap}px`]) {
    const span = document.createElement("span");
    span.setAttribute(SPACER, "");
    span.style.cssText = `float:left;clear:left;${css}`;
    block.insertBefore(span, anchor);
  }
}

function clearSpacing(sheet: HTMLElement) {
  sheet.querySelectorAll(`[${SPACER}]`).forEach((span) => span.remove());
  sheet.querySelectorAll<HTMLElement>("[data-page-pushed]").forEach((element) => {
    element.style.marginTop = "";
    element.removeAttribute("data-page-pushed");
  });
  (sheet.querySelector(".resume-page") as HTMLElement | null)?.style.removeProperty("min-height");
}

/** Spaces the sheet so each page's first block sits where it would in print. */
function applySpacing(sheet: HTMLElement, placements: Placement[], pages: number, spec: PageSpec) {
  const scale = sheet.getBoundingClientRect().width / spec.width;
  const pageHeight = spec.height * scale;
  const pageTop = (page: number) => page * (pageHeight + spec.gap);
  const page = sheet.querySelector<HTMLElement>(".resume-page")!;
  page.style.minHeight = `${pageTop(pages) - spec.gap}px`;

  const flows = [...sheet.querySelectorAll<HTMLElement>("aside"), page];
  for (const flow of flows) {
    const inFlow = placements.filter(({ element }) => flow.contains(element) && (flow === page ? !element.closest("aside") : true));
    const splits = new Map<HTMLElement, { lines: number; gaps: number }>();
    for (let index = 1; index < pages; index++) {
      const target = pageTop(index) + (spec.gecko ? spec.inset : 0) * scale;
      const split = inFlow.find((p) => p.parts[0].column < index && p.parts.some((part) => part.column === index));
      if (split) {
        const { element } = split;
        const resumes = split.parts.find((part) => part.column === index)!;
        const so = splits.get(element) ?? { lines: 0, gaps: 0 };
        const top = element.getBoundingClientRect().top - sheet.getBoundingClientRect().top;
        const lines = split.parts.filter((part) => part.column < index).reduce((sum, part) => sum + part.height, 0) * scale;
        const gap = Math.max(0, target + resumes.top * scale - (top + lines + so.gaps));
        splitBlock(element, lines - so.lines, gap);
        splits.set(element, { lines, gaps: so.gaps + gap });
        continue;
      }
      const first = inFlow.find((p) => p.column === index);
      if (!first) continue;
      const box = outermost(first.element, flow);
      const current = box.getBoundingClientRect().top - sheet.getBoundingClientRect().top;
      const delta = target + first.top * scale - current;
      box.style.marginTop = `${parseFloat(getComputedStyle(box).marginTop) + delta}px`;
      box.setAttribute("data-page-pushed", "");
    }
  }
}

/** Measures `sheet` (a `.resume-paper`) and spaces it into pages. */
export function paginate(sheet: HTMLElement, spec: PageSpec): PageLayout | null {
  clearSpacing(sheet);
  if (sheet.querySelectorAll("*").length > MAX_NODES) return null;
  const { placements, pages, lastPageFill } = measure(sheet, spec);
  const spaced = pages > 1 && pages <= MAX_SPACED_PAGES;
  if (spaced) applySpacing(sheet, placements, pages, spec);
  return { pages, lastPageFill, spaced };
}

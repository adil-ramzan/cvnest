/**
 * Shared by the section cards and the Add section panel, which open and close with the
 * .accordion-body rules in globals.css.
 */

/** --accordion-duration from globals.css, in milliseconds. */
export function accordionDuration() {
  if (typeof window === "undefined") return 700;
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accordion-duration").trim();
  const ms = value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
  return Number.isFinite(ms) ? ms : 700;
}

/** No movement for people who ask for less of it. */
export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Keeps something that is opening steady and in view while it grows. Its top stays where
 * it was on screen, even as a card above it closes (so what's inside doesn't slide away
 * from the pointer), and the page scrolls only when its growing end would be cut off, never
 * past its own top. Something starting out of view is brought into view. Runs every frame
 * for the length of the animation, so the page moves with the height instead of jumping at
 * the start or end, and stops if the person scrolls. The sticky bars are left clear through
 * the page's scroll padding. Returns a cleanup.
 */
export function keepInView(element: HTMLElement, duration = prefersReducedMotion() ? 0 : accordionDuration()) {
  const root = getComputedStyle(document.documentElement);
  const padTop = parseFloat(root.scrollPaddingTop) || 0;
  const padBottom = parseFloat(root.scrollPaddingBottom) || 0;
  const started = performance.now();
  let frame = 0;
  let anchor: number | null = null;
  const step = () => {
    const box = element.getBoundingClientRect();
    const top = padTop;
    const bottom = window.innerHeight - padBottom;
    // Where its top should sit: where it started (inside the free area), raised only as far as its end needs.
    anchor ??= Math.min(Math.max(box.top, top), Math.max(top, bottom - 64));
    anchor = Math.max(top, Math.min(anchor, anchor - Math.max(0, box.bottom - bottom)));
    const delta = box.top - anchor;
    // "instant": the page itself scrolls smoothly, and that would restart a smooth scroll every frame.
    if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: "instant" });
    if (performance.now() - started < duration + 50) frame = requestAnimationFrame(step);
  };
  const stop = () => cancelAnimationFrame(frame);
  const events = ["wheel", "touchmove", "keydown"] as const;
  events.forEach((type) => window.addEventListener(type, stop, { once: true, passive: true }));
  step();
  return () => {
    stop();
    events.forEach((type) => window.removeEventListener(type, stop));
  };
}

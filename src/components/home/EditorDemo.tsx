"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { homeCopy } from "@/data/copy";

const { demo } = homeCopy.features;
const NAME = demo.name;
const TITLE = demo.jobTitle;
/** One step per typed character; the last step is the finished state. */
const FINISHED = NAME.length + TITLE.length;

const TYPE_MS = 110;
const START_MS = 1600;
const BETWEEN_MS = 1000;
const HOLD_MS = 2400;

/** How long to wait at `step` before moving on. One loop is about 8 seconds. */
function delayAt(step: number) {
  if (step === 0) return START_MS;
  if (step === NAME.length) return BETWEEN_MS;
  if (step === FINISHED) return HOLD_MS;
  return TYPE_MS;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeToMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

function Caret() {
  return <span className="ml-px inline-block h-[1.1em] w-px translate-y-[0.15em] bg-ink motion-safe:animate-pulse" />;
}

function Field({ label, focused = false, children }: { label: string; focused?: boolean; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
      <div
        className={`mt-1 flex h-9 items-center overflow-hidden rounded-[10px] border bg-surface px-3 text-sm whitespace-nowrap text-ink sm:h-10 sm:text-base ${
          focused ? "border-accent ring-4 ring-accent-soft" : "border-line"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const bar = "block h-2 rounded-full bg-ink/10";

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 sm:mt-4">
      <p className="text-xs font-bold text-ink uppercase">{title}</p>
      <span className="mt-1.5 block h-px bg-line" />
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/**
 * The home page's editor demo: a name and job title are typed into the form and appear
 * on the resume beside it. Display only and hidden from screen readers (the section
 * describes it in words). It renders the finished state first, so it reads the same
 * without JavaScript, and stays that way with reduced motion. The loop runs only while
 * the card is on screen. Every box has a fixed height, so typing never moves the page.
 */
export function EditorDemo({ className = "" }: { className?: string }) {
  const card = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(FINISHED);
  const [onScreen, setOnScreen] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, prefersReducedMotion, () => false);

  useEffect(() => {
    const element = card.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const animating = onScreen && !reducedMotion;

  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => setStep((current) => (current >= FINISHED ? 0 : current + 1)), delayAt(step));
    return () => clearTimeout(timer);
  }, [animating, step]);

  const shown = reducedMotion ? FINISHED : step;
  const name = NAME.slice(0, Math.min(shown, NAME.length));
  const jobTitle = TITLE.slice(0, Math.max(0, shown - NAME.length));
  const typingTitle = shown > NAME.length && shown < FINISHED;

  return (
    <div ref={card} data-editor-demo aria-hidden="true" className={`overflow-hidden rounded-3xl bg-surface shadow-soft ${className}`}>
      <div className="flex gap-1.5 px-4 pt-3.5 pb-1 sm:px-5">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="grid content-start gap-2.5 px-4 pt-3 pb-4 sm:p-6 lg:gap-5 lg:p-10">
          <Field label={demo.labels.name} focused={!typingTitle}>
            {name}
            {animating && !typingTitle && <Caret />}
          </Field>
          <Field label={demo.labels.jobTitle} focused={typingTitle}>
            {jobTitle}
            {animating && typingTitle && <Caret />}
          </Field>
          <div>
            <p className="text-xs font-medium text-muted sm:text-sm">{demo.labels.summary}</p>
            <div className="mt-1 grid gap-2 rounded-[10px] border border-line px-3 py-2.5 sm:py-3.5">
              <span className={`${bar} w-full`} />
              <span className={`${bar} w-3/5`} />
            </div>
          </div>
        </div>
        <div className="bg-panel p-3 sm:p-6 lg:p-10">
          <div className="rounded-xl bg-surface p-3.5 shadow-soft sm:p-6">
            <p className="h-7 truncate text-lg font-bold text-ink sm:text-xl">{name}</p>
            <p className="h-5 truncate text-sm font-medium text-accent">{jobTitle}</p>
            <ResumeSection title={demo.sections[0]}>
              <div className="grid gap-1.5">
                <span className={`${bar} w-2/5 bg-ink/20`} />
                <span className={`${bar} w-full`} />
                <span className={`${bar} w-5/6`} />
                <span className={`${bar} hidden w-4/6 lg:block`} />
              </div>
            </ResumeSection>
            <ResumeSection title={demo.sections[1]}>
              <div className="flex flex-wrap gap-1.5">
                <span className={`${bar} w-14`} />
                <span className={`${bar} w-10`} />
                <span className={`${bar} w-16`} />
                <span className={`${bar} w-12`} />
              </div>
            </ResumeSection>
          </div>
        </div>
      </div>
    </div>
  );
}

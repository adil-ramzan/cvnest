"use client";

import { ArrowRight } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { homeCopy } from "@/data/copy";

const { demo } = homeCopy.features;
const NAME = demo.name;
const TITLE = demo.jobTitle;
/** One step per typed character, then one more step that fills in the profile: the finished state. */
const TYPED = NAME.length + TITLE.length;
const FINISHED = TYPED + 1;

const TYPE_MS = 110;
const START_MS = 1400;
const BETWEEN_MS = 900;
const PROFILE_MS = 500;
const HOLD_MS = 2000;

/** How long to wait at `step` before moving on. One loop is about 8.4 seconds. */
function delayAt(step: number) {
  if (step === 0) return START_MS;
  if (step === NAME.length) return BETWEEN_MS;
  if (step === TYPED) return PROFILE_MS;
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

const bar = "block h-2 rounded-full";
const light = `${bar} bg-ink/10`;

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 sm:mt-4">
      <p className="text-xs font-bold text-ink uppercase">{title}</p>
      <span className="mt-1.5 block h-px bg-line" />
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * The home page's editor demo: a name and job title are typed into the form and appear
 * on the resume beside it, then the profile fills in. Until a field is typed into, it and
 * the resume show a muted placeholder, so the resume never starts blank.
 *
 * The animated parts are decorative and hidden from screen readers (the section describes
 * the demo in words); only the "Try it yourself" link is a real control. The demo renders
 * the finished state first, so it reads the same without JavaScript, and stays that way
 * with reduced motion. The loop runs only while the card is on screen. Every box has a
 * fixed height, so typing never moves the page.
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
  const jobTitle = TITLE.slice(0, Math.max(0, Math.min(shown, TYPED) - NAME.length));
  const typingTitle = shown > NAME.length && shown < TYPED;
  const profileShown = shown >= FINISHED;

  return (
    <div ref={card} data-editor-demo className={`overflow-hidden rounded-3xl bg-surface shadow-soft ${className}`}>
      <div aria-hidden="true" className="flex gap-1.5 px-4 pt-3.5 pb-1 sm:px-5">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
      </div>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="px-4 pt-3 pb-4 sm:p-6 lg:p-10">
          <div aria-hidden="true" className="grid gap-2.5 lg:gap-5">
            <Field label={demo.labels.name} focused={!typingTitle}>
              {name}
              {animating && !typingTitle && shown < TYPED && <Caret />}
              {!name && <span className="text-placeholder">{demo.placeholders.name}</span>}
            </Field>
            <Field label={demo.labels.jobTitle} focused={typingTitle}>
              {jobTitle}
              {animating && typingTitle && <Caret />}
              {!jobTitle && <span className="text-placeholder">{demo.placeholders.jobTitle}</span>}
            </Field>
            <div>
              <p className="text-xs font-medium text-muted sm:text-sm">{demo.labels.summary}</p>
              <div className="mt-1 grid gap-2 rounded-[10px] border border-line px-3 py-2.5 sm:py-3.5">
                <span className={`${light} w-full`} />
                <span className={`${light} w-3/5`} />
              </div>
            </div>
          </div>
          <ButtonLink href="/editor" size="sm" className="mt-4 lg:mt-6">
            {demo.action}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
        <div aria-hidden="true" className="bg-panel p-3 sm:p-6 lg:p-10">
          <div className="rounded-xl bg-surface px-4 py-3.5 shadow-soft sm:p-6">
            <div className="text-center">
              <p className={`h-7 truncate text-lg font-bold sm:text-xl ${name ? "text-ink" : "text-placeholder"}`}>{name || demo.placeholders.name}</p>
              <p className={`h-4 truncate text-[11px] font-medium tracking-[0.18em] uppercase ${jobTitle ? "text-accent" : "text-placeholder"}`}>
                {jobTitle || demo.placeholders.jobTitle}
              </p>
              <span className={`${bar} mx-auto mt-2 h-1.5 w-1/2 bg-ink/10`} />
            </div>
            <ResumeSection title={demo.sections.profile}>
              <div className={`grid gap-1.5 transition-opacity duration-300 motion-reduce:transition-none ${profileShown ? "opacity-100" : "opacity-0"}`}>
                <span className={`${light} w-full`} />
                <span className={`${light} w-4/5`} />
              </div>
            </ResumeSection>
            <ResumeSection title={demo.sections.experience}>
              <div className="flex items-center justify-between gap-3">
                <span className={`${bar} w-1/3 bg-ink/25`} />
                <span className={`${light} w-1/6`} />
              </div>
              <div className="mt-2 grid gap-1.5">
                <span className={`${light} w-full`} />
                <span className={`${light} w-11/12`} />
                <span className={`${light} w-3/4`} />
              </div>
            </ResumeSection>
            <ResumeSection title={demo.sections.skills}>
              <div className="flex flex-wrap gap-1.5">
                <span className="block h-3.5 w-14 rounded-full bg-ink/10" />
                <span className="block h-3.5 w-10 rounded-full bg-ink/10" />
                <span className="block h-3.5 w-16 rounded-full bg-ink/10" />
                <span className="block h-3.5 w-12 rounded-full bg-ink/10" />
              </div>
            </ResumeSection>
          </div>
        </div>
      </div>
    </div>
  );
}

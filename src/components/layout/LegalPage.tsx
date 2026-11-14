import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

export type LegalSection = { id: string; title: string; content: ReactNode };

type LegalPageProps = {
  title: string;
  intro: string;
  /** Shown as a small line under the intro, e.g. "Last updated: …". */
  meta?: string;
  sections: LegalSection[];
  /** Number the sections (1., 2., …) in the list and the headings. On by default. */
  numbered?: boolean;
};

/**
 * Long-form legal page: header, then a sticky list of sections beside the text from 1024px
 * (the list is hidden below that). The text sits in a white card, numbered to match the list.
 */
export function LegalPage({ title, intro, meta, sections, numbered = true }: LegalPageProps) {
  return (
    <Container className="pt-14 pb-[clamp(3.5rem,8vw,5.5rem)] md:pt-20">
      <header className="max-w-3xl">
        <p className="text-small font-bold tracking-wide text-muted uppercase">Legal</p>
        <h1 className="mt-4 text-[clamp(2.5rem,1.5rem+3.5vw,4rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-ink">
          {title}
        </h1>
        <p className="mt-6 text-lead text-pretty text-muted">{intro}</p>
        {meta && (
          <p className="mt-6 inline-flex rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-soft">
            {meta}
          </p>
        )}
      </header>

      <div className="mt-12 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-12">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-small font-bold tracking-wide text-muted uppercase">On this page</p>
            <ol className="mt-4 space-y-1 border-l border-line">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted underline-offset-4 transition-colors duration-150 ease-out hover:border-ink hover:text-ink hover:underline active:text-ink"
                  >
                    {numbered && `${index + 1}. `}
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="rounded-3xl bg-surface px-6 py-4 shadow-soft md:px-10 md:py-6">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-28 border-b border-line py-8 last:border-b-0"
            >
              <h2
                id={`${section.id}-heading`}
                className="flex gap-3 text-xl leading-snug font-bold text-ink md:text-2xl"
              >
                {numbered && <span className="text-accent tabular-nums">{index + 1}.</span>}
                {section.title}
              </h2>
              <div className="mt-4 max-w-[68ch] space-y-4 text-base leading-relaxed text-ink-soft [&_li]:pl-1 [&_li::marker]:text-accent [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Container>
  );
}

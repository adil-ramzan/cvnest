import { ArrowRight, Check } from "lucide-react";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { homeCopy } from "@/data/copy";
import { getTemplate } from "@/data/templates";

export function Hero() {
  const template = getTemplate("professional")!;
  const { hero } = homeCopy;

  return (
    <section aria-labelledby="hero-heading">
      <Container className="grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
        <div>
          <p className="text-small font-bold tracking-wide text-muted uppercase">{hero.eyebrow}</p>
          <h1 id="hero-heading" className="mt-4 text-display text-balance text-ink">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lead text-muted">
            {hero.lines[0]}
            <br />
            {hero.lines[1]}
          </p>
          <ButtonLink href="/editor" size="xl" className="mt-9">
            {hero.action}
            <ArrowRight aria-hidden="true" className="size-5" />
          </ButtonLink>
          <p className="mt-4 text-base text-muted">{hero.reassurance}</p>
        </div>

        <div className="relative mx-auto w-full max-w-md pb-6 lg:max-w-lg">
          <ResumePreview template={template} thumbnail className="overflow-hidden rounded-2xl shadow-pop" />
          <p className="absolute right-3 bottom-0 flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 text-base font-medium text-ink shadow-pop sm:-right-4">
            <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
            </span>
            {hero.badge}
          </p>
        </div>
      </Container>
    </section>
  );
}

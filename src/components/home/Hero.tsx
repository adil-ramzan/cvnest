import { ArrowRight } from "lucide-react";
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
      <Container className="grid items-center gap-12 pt-16 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-24">
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

        <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
          <ResumePreview template={template} thumbnail className="overflow-hidden rounded-2xl shadow-pop" />
        </div>
      </Container>
    </section>
  );
}

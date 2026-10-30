import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { homeCopy } from "@/data/copy";

export function FinalCta() {
  const { cta } = homeCopy;

  return (
    <section aria-labelledby="cta-heading" className="pb-16 md:pb-24 lg:pb-32">
      <Container>
        <div className="rounded-[28px] bg-surface px-6 py-14 text-center shadow-soft md:py-20">
          <h2 id="cta-heading" className="mx-auto max-w-3xl text-h2 text-balance text-ink">
            {cta.title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body text-muted">{cta.description}</p>
          <ButtonLink href="/editor" size="xl" className="mt-8">
            {cta.action}
            <ArrowRight aria-hidden="true" className="size-5" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

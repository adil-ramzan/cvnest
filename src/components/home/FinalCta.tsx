import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="pb-16 md:pb-24 lg:pb-32">
      <Container>
        <div className="rounded-[28px] bg-surface px-6 py-14 text-center shadow-soft md:py-20">
          <h2 id="cta-heading" className="mx-auto max-w-3xl text-h2 text-balance text-ink">
            Your next application can start today
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body text-muted">Open the editor and see your first page take shape.</p>
          <ButtonLink href="/editor" size="xl" className="mt-8">
            Start your resume
            <ArrowRight aria-hidden="true" className="size-5" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

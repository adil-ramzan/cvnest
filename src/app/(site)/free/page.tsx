import { ArrowRight, Ban, LayoutTemplate, Lock, PenLine, Save, SlidersHorizontal, UserX } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { sectionSpaceY } from "@/components/ui/Section";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { freeFeatures, site, socialImage } from "@/data/site";
import { TEMPLATE_COUNT_LABEL } from "@/data/template-count";

const description = `Everything in ${site.name} is free: all ${TEMPLATE_COUNT_LABEL} resume templates, editing, customization and browser autosave, with no watermarks, subscription or account.`;

export const metadata: Metadata = {
  title: "What's Free",
  description,
  alternates: { canonical: "/free" },
  openGraph: { images: [socialImage], title: `What's Free | ${site.name}`, description, url: "/free" },
};

/** One icon per entry in `freeFeatures`, in the same order. */
const icons = [LayoutTemplate, PenLine, SlidersHorizontal, Save, UserX, Ban];

const card = "rounded-3xl bg-surface shadow-soft";

export default function FreePage() {
  const features = freeFeatures(TEMPLATE_COUNT_LABEL);

  return (
    <>
      <section aria-labelledby="free-heading" className="pt-14 md:pt-20">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <p className="text-small font-bold tracking-wide text-muted uppercase">Free resume builder</p>
            <h1 id="free-heading" className="mt-4 text-display text-balance text-ink">
              What&apos;s free
            </h1>
            <p className="mt-6 max-w-xl text-lead text-pretty text-muted">
              {site.name} is free to use.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/editor" size="xl">
                Create Your Free Resume
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
              <ButtonLink href="/templates" variant="secondary" size="xl">
                Browse Free Templates
              </ButtonLink>
            </div>
          </div>

          {/* Price summary: the same facts as the intro, at a glance. */}
          <div className={`${card} p-8 md:p-10`}>
            <p className="text-small font-bold tracking-wide text-muted uppercase">Price</p>
            <p className="mt-3 text-[clamp(3.5rem,2.5rem+4vw,5.5rem)] leading-none font-bold tracking-[-0.04em] text-ink">
              $0
            </p>
            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-base text-ink">
              {/* ACCOUNTS: "No account needed" */}
              {["No subscription or paid plan", "No hidden fees", "No account needed"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section aria-labelledby="included-heading" className="pt-[clamp(3.5rem,8vw,5.5rem)]">
        <Container>
          <h2 id="included-heading" className={`${sectionTitle} max-w-3xl text-balance text-ink`}>
            Everything is included
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {features.map((feature, index) => {
              const Icon = icons[index] ?? LayoutTemplate;
              return (
                <li key={feature.title} className={`${card} p-6 md:p-7`}>
                  <span className="flex size-11 items-center justify-center rounded-[14px] bg-accent-soft text-accent">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl leading-snug font-bold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-base text-pretty text-muted">{feature.description}</p>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 flex max-w-3xl gap-3 text-base text-muted">
            <Lock aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <span>
              This list only includes features that are available today. Your resume content is stored in your browser
              and is never uploaded to our servers.
            </span>
          </p>
        </Container>
      </section>

      <section aria-labelledby="free-cta-heading" className={sectionSpaceY}>
        <Container>
          <div className={`${card} px-6 py-14 text-center md:py-20`}>
            <h2 id="free-cta-heading" className={`mx-auto max-w-3xl ${sectionTitle} text-balance text-ink`}>
              Start your resume now
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/editor" size="xl">
                Create Your Free Resume
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
              <ButtonLink href="/templates" variant="secondary" size="xl">
                Browse Free Templates
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

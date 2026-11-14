import { ArrowRight, Lock, PenLine, Printer } from "lucide-react";
import type { Metadata } from "next";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { sectionSpaceY } from "@/components/ui/Section";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { site, socialImage } from "@/data/site";
import { getTemplate } from "@/data/templates";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${site.name}, a free resume builder and CV maker focused on clear, professional documents.`,
  alternates: { canonical: "/about" },
  openGraph: { images: [socialImage], url: "/about" },
};

const card = "rounded-3xl bg-surface shadow-soft";

/** What the builder stands for, taken from the two paragraphs this page used to have. */
const principles = [
  {
    icon: PenLine,
    title: "Your experience comes first",
    description: "Writing a resume should be about your experience, not about fighting with formatting.",
  },
  {
    icon: Printer,
    title: "Templates that read well",
    description: "We design templates that are easy to read, print cleanly, and work across industries.",
  },
  // ACCOUNTS
  {
    icon: Lock,
    title: "Free and private",
    description: "Create a resume online for free. Your resume stays in your browser, and you don't need an account.",
  },
];

export default function AboutPage() {
  const template = getTemplate("canvas") ?? getTemplate("professional")!;

  return (
    <>
      <section aria-labelledby="about-heading" className="pt-14 md:pt-20">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <p className="text-small font-bold tracking-wide text-muted uppercase">About</p>
            <h1 id="about-heading" className="mt-4 text-display text-balance text-ink">
              About {site.name}
            </h1>
            <p className="mt-6 max-w-xl text-lead text-pretty text-muted">
              {site.name} is a free online resume builder and CV maker focused on clear, professional documents.
            </p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
              Pick any of our templates, fill in your details and see the result as you type.
            </p>
          </div>

          <div aria-hidden="true" className="mx-auto w-full max-w-sm lg:max-w-md">
            <ResumePreview template={template} thumbnail className="overflow-hidden rounded-2xl shadow-pop" />
          </div>
        </Container>
      </section>

      <section aria-labelledby="principles-heading" className="pt-[clamp(3.5rem,8vw,5.5rem)]">
        <Container>
          <h2 id="principles-heading" className={`${sectionTitle} max-w-3xl text-balance text-ink`}>
            What we care about
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-6">
            {principles.map(({ icon: Icon, title, description }) => (
              <li key={title} className={`${card} p-6 md:p-7`}>
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-accent-soft text-accent">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-xl leading-snug font-bold text-ink">{title}</h3>
                <p className="mt-2 text-base text-pretty text-muted">{description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="about-cta-heading" className={sectionSpaceY}>
        <Container>
          <div className={`${card} px-6 py-14 text-center md:py-20`}>
            <h2 id="about-cta-heading" className={`mx-auto max-w-3xl ${sectionTitle} text-balance text-ink`}>
              Start your resume now
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/editor" size="xl">
                Create Your Free Resume
                <ArrowRight aria-hidden="true" className="size-5" />
              </ButtonLink>
              <ButtonLink href="/free" variant="secondary" size="xl">
                See what&apos;s free
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

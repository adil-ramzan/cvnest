import { ArrowRight, Check } from "lucide-react";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { getTemplate } from "@/data/templates";

const benefits = [
  "45 free resume templates",
  "No watermarks",
  "No hidden fees",
  "No subscription required",
  "ATS-friendly resume designs",
];

export function Hero() {
  const professional = getTemplate("professional")!;
  const modern = getTemplate("modern")!;

  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden border-b border-line">
      <Container className="grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-24">
        <div>
          <p className="inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-1 text-sm font-medium text-ink-soft">
            Free Online Resume Builder
          </p>
          <h1
            id="hero-heading"
            className="mt-6 font-serif text-4xl leading-[1.1] font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]"
          >
            Create a Professional Resume for Free
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Build a polished, job-ready resume for free with 45 professionally designed templates. Customize your content
            and preview every change as you type, without paying or registering.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/editor" size="lg">
              Create Your Free Resume
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink href="/templates" variant="secondary" size="lg">
              Explore Templates
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">No account required. Your resume stays in your browser.</p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-base font-medium text-ink-soft">
                <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div aria-hidden="true" className="absolute inset-x-6 top-6 bottom-0 hidden sm:block">
            <ResumePreview
              template={professional}
              className="w-[82%] translate-x-[22%] rotate-[4deg] rounded-sm border border-line opacity-90 shadow-sm"
            />
          </div>
          <ResumePreview
            template={modern}
            thumbnail
            className="relative w-full rounded-sm border border-line shadow-[0_2px_4px_rgba(0,0,0,0.04),0_24px_48px_-20px_rgba(0,0,0,0.25)] sm:w-[82%]"
          />
        </div>
      </Container>
    </section>
  );
}

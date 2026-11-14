import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";
import { DetailsCard, LayoutCard, SaveCard } from "./StepVisuals";

const visuals = [<DetailsCard key="details" />, <LayoutCard key="layout" />, <SaveCard key="save" />];

/** Three steps side by side on desktop, stacked below 1024px. Each has a small decorative mock above it. */
export function HowItWorks() {
  const { steps } = homeCopy;

  return (
    <Section id="how-it-works" labelledBy="how-heading">
      <SectionHeading id="how-heading" eyebrow={steps.eyebrow} title={steps.title} />
      <ol className="mt-12 grid gap-12 lg:grid-cols-3 lg:gap-8">
        {steps.items.map((step, index) => (
          <li key={step.title} className="group">
            <div aria-hidden="true" className="h-[132px] max-w-md transition-[translate] duration-200 ease-out motion-safe:group-hover:-translate-y-0.5 lg:max-w-none">
              {visuals[index]}
            </div>
            <p className="mt-6 text-small font-bold tracking-wide text-accent uppercase">
              {steps.label} {index + 1}
            </p>
            <h3 className="mt-2 text-xl leading-snug font-bold text-balance text-ink">{step.title}</h3>
            <p className="mt-2 max-w-md text-base text-pretty text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

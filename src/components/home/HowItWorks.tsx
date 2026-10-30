import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";
import { StepRow } from "./StepRow";
import { DetailsCard, LayoutCard, SaveCard } from "./StepVisuals";

const visuals = [<DetailsCard key="details" />, <LayoutCard key="layout" />, <SaveCard key="save" />];

export function HowItWorks() {
  const { steps } = homeCopy;

  return (
    <Section id="how-it-works" labelledBy="how-heading">
      <SectionHeading id="how-heading" eyebrow={steps.eyebrow} title={steps.title} />
      <ol className="mt-12 space-y-14 md:mt-16 md:space-y-20">
        {steps.items.map((step, index) => (
          <StepRow key={step.title} step={index + 1} label={steps.label} reverse={index % 2 === 1} visual={visuals[index]} {...step} />
        ))}
      </ol>
    </Section>
  );
}

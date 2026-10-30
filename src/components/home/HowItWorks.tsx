import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StepRow } from "./StepRow";
import { DetailsCard, LayoutCard, SaveCard } from "./StepVisuals";

const steps = [
  {
    title: "Start with what you’ve done",
    description: "Add your work history, education and skills in plain form fields. Everything saves as you type.",
    visual: <DetailsCard />,
  },
  {
    title: "Try on a layout",
    description: "Switch templates as often as you like. Your words stay put while the design changes around them.",
    visual: <LayoutCard />,
  },
  {
    title: "Keep your PDF",
    description: "Open the print window from the editor and save a PDF with selectable text, created on your own device.",
    visual: <SaveCard />,
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-heading">
      <SectionHeading id="how-heading" eyebrow="How it works" title="From blank page to finished PDF" />
      <ol className="mt-12 space-y-14 md:mt-16 md:space-y-20">
        {steps.map((step, index) => (
          <StepRow key={step.title} step={index + 1} reverse={index % 2 === 1} {...step} />
        ))}
      </ol>
    </Section>
  );
}

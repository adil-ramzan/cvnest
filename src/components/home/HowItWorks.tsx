import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    title: "Enter your information",
    description: "Add your contact details, work history, education, and skills in a simple, guided form.",
  },
  {
    title: "Choose a professional template",
    description: "Pick the layout that suits your field. You can switch templates at any time without retyping.",
  },
  {
    title: "Preview and refine",
    description: "See every change in the live preview as you type. Your resume saves automatically in your browser.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-16 border-y border-line bg-surface py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title="Three steps to a finished resume"
          align="center"
        />

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="relative border-t border-line-strong pt-6">
              <span className="font-serif text-sm font-semibold text-accent">Step {index + 1}</span>
              <h3 className="mt-2 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

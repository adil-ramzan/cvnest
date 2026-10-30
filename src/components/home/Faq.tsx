import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";
import { FaqItem } from "./FaqItem";

export function Faq() {
  const { faq } = homeCopy;

  return (
    <Section labelledBy="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading id="faq-heading" eyebrow={faq.eyebrow} title={faq.title} />
        <div className="divide-y divide-line border-y border-line">
          {faq.items.map((item) => (
            <FaqItem key={item.question} {...item} />
          ))}
        </div>
      </div>
    </Section>
  );
}

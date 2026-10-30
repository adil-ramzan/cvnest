import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";
import { site } from "@/data/site";
import { templates } from "@/data/templates";
import { FaqItem } from "./FaqItem";

export function Faq() {
  const { faq } = homeCopy(templates.length, site.name);

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

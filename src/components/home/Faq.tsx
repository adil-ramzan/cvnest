import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { templates } from "@/data/templates";
import { FaqItem } from "./FaqItem";

const faqs = [
  {
    question: "Is the resume builder free?",
    answer: `Yes. All ${templates.length} templates, editing, customization, autosave and PDF export are free, with no subscription, hidden fees or watermark.`,
  },
  {
    question: "Can I download my resume as PDF?",
    answer: "Yes. Choose Download PDF in the editor, then pick Save as PDF in your browser’s print window. The PDF is created on your device, keeps your template’s layout and has selectable text.",
  },
  {
    question: "Can I change templates?",
    answer: "Yes. Your content is kept separate from the design, so you can switch between templates at any time without retyping anything.",
  },
  {
    question: "Do I need an account?",
    answer: "No. You can start straight away without signing up, and your resume stays in your browser.",
  },
  {
    question: "Are the templates ATS-friendly?",
    answer: "Single-column templates use one reading order with standard headings, which applicant tracking systems parse reliably. Most modern systems also handle two columns well, but if you’re applying through an older system, a single-column template is the safest choice.",
  },
];

export function Faq() {
  return (
    <Section labelledBy="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading id="faq-heading" eyebrow="FAQ" title="Good to know" />
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
      </div>
    </Section>
  );
}

import { Plus } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const faqs = [
  {
    question: "Is the resume builder free?",
    answer:
      "Yes. All 45 templates, resume creation and editing, template customization and browser autosave are free. There is no subscription, no hidden fees and no watermark, and you don't need an account.",
  },
  {
    question: "Can I download my resume as PDF?",
    answer:
      "Yes. Choose Download PDF in the editor, then pick Save as PDF in your browser's print window. The PDF is created on your device, keeps your template's layout and has selectable text.",
  },
  {
    question: "Can I change templates?",
    answer:
      "Yes. Your content is kept separate from the design, so you can switch between templates at any time without retyping anything.",
  },
  {
    question: "Do I need an account?",
    answer: "No. You can start building your resume straight away without signing up, and your resume stays in your browser.",
  },
  {
    question: "Are the templates ATS-friendly?",
    answer:
      "The Professional and Minimal templates use a single reading order with standard headings, which applicant tracking systems parse reliably. The Modern template uses two columns; most modern systems handle it well, but if you are applying through an older system, a single-column template is the safest choice.",
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="border-t border-line bg-surface py-20 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading
          id="faq-heading"
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Quick answers about how the resume builder works."
        />

        <div className="divide-y divide-line border-y border-line">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted transition-transform group-open:rotate-45"
                />
              </summary>
              <p className="-mt-1 pr-10 pb-6 text-base leading-relaxed text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

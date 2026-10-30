import { Eye, FileText, LayoutTemplate, ListOrdered, ShieldCheck, UserRoundCheck } from "lucide-react";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { templates } from "@/data/templates";

const features = [
  { icon: Eye, title: "Live preview", description: "Your page updates beside the form as you type." },
  { icon: LayoutTemplate, title: `${templates.length} templates`, description: "Simple, modern, creative, photo, compact, first-job and executive designs." },
  { icon: ListOrdered, title: "Your section order", description: "Rename, hide and reorder sections to suit your story." },
  { icon: FileText, title: "Letter or A4", description: "Pick the page size your employer expects, then save a PDF." },
  { icon: UserRoundCheck, title: "No sign-up", description: "Open the editor and begin. Autosave keeps your work in this browser." },
  { icon: ShieldCheck, title: "No watermark", description: "Nothing is added to your document. It’s entirely yours." },
];

export function Features() {
  return (
    <Section labelledBy="features-heading">
      <SectionHeading id="features-heading" eyebrow="Features" title="The parts that matter, and nothing extra" />
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title}>
            <FeatureCard {...feature} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

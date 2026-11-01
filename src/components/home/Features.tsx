import {
  ArchiveRestore,
  CopyPlus,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  LayoutTemplate,
  ListOrdered,
  type LucideIcon,
  PanelTop,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";

/** In the same order as the feature list in copy.ts. */
const icons: LucideIcon[] = [Eye, LayoutTemplate, ListOrdered, CopyPlus, EyeOff, PanelTop, ImageIcon, Sparkles, ArchiveRestore, FileText, UserRoundCheck, ShieldCheck];

export function Features() {
  const { features } = homeCopy;

  return (
    <Section id="features" labelledBy="features-heading">
      <SectionHeading id="features-heading" eyebrow={features.eyebrow} title={features.title} />
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.items.map((feature, index) => (
          <li key={feature.title}>
            <FeatureCard icon={icons[index]} {...feature} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

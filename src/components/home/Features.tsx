import { ArchiveRestore, CopyPlus, EyeOff, FileText, ImageIcon, LayoutTemplate, ListOrdered, type LucideIcon, PanelTop } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";
import { EditorDemo } from "./EditorDemo";

/** In the same order as the chips in copy.ts, with the icons the feature cards used. */
const icons: LucideIcon[] = [LayoutTemplate, ListOrdered, CopyPlus, EyeOff, PanelTop, ImageIcon, ArchiveRestore, FileText];

export function Features() {
  const { features } = homeCopy;

  return (
    <Section id="features" labelledBy="features-heading">
      <SectionHeading id="features-heading" eyebrow={features.eyebrow} title={features.title} />
      <p className="sr-only">{features.demoDescription}</p>
      <EditorDemo className="mt-8 lg:mt-10" />
      <ul className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {features.chips.map((chip, index) => {
          const Icon = icons[index];
          return (
            <li key={chip} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink transition-[translate,box-shadow] duration-200 ease-out hover:shadow-soft motion-safe:hover:-translate-y-0.5 sm:px-4 sm:text-base">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-ink" />
              <span className="min-w-0">{chip}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

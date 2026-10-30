import Link from "next/link";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { homeCopy } from "@/data/copy";
import { type TemplateCategory, templateCategories, templates } from "@/data/templates";
import { type CarouselCard, TemplateCarousel } from "./TemplateCarousel";

const CARDS_PER_FILTER = 8;
const CARDS_FOR_ALL = 3;
const filters: TemplateCategory[] = ["simple", "modern", "creative"];

export function Templates() {
  const copy = homeCopy.templates;
  const cards: CarouselCard[] = filters.flatMap((category) =>
    templates
      .filter((template) => template.category === category)
      .slice(0, CARDS_PER_FILTER)
      .map((template, index) => ({
        slug: template.slug,
        category,
        inAll: index < CARDS_FOR_ALL,
        node: (
          <Link href={`/templates/${template.slug}`} className="group block rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            <span className="block rounded-[20px] bg-panel p-4 transition-colors group-hover:bg-surface">
              <ResumePreview template={template} thumbnail className="overflow-hidden rounded-lg shadow-soft" />
            </span>
            <span className="mt-4 flex items-center justify-between gap-3">
              <span className="text-title text-ink">{template.name}</span>
              <span className="shrink-0 rounded-full bg-surface px-3 py-0.5 text-base text-muted">{template.layout}</span>
            </span>
          </Link>
        ),
      })),
  );

  return (
    <Section id="templates" labelledBy="templates-heading">
      <SectionHeading
        id="templates-heading"
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <TemplateCarousel
        cards={cards}
        filters={templateCategories.filter((category) => filters.includes(category.id)).map(({ id, label }) => ({ id, label }))}
      />
      <div className="mt-10">
        <ButtonLink href="/templates" variant="secondary" size="lg">
          {copy.action}
        </ButtonLink>
      </div>
    </Section>
  );
}

import { ArrowRight } from "lucide-react";
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
            {/* The ring is a shadow, so the border color shift doesn't move anything. The resume
                lifts inside the panel's padding: the carousel item clips anything outside it. */}
            <span className="relative block rounded-[20px] bg-panel p-4 ring-1 ring-transparent transition-[background-color,box-shadow] duration-200 ease-out group-hover:bg-surface group-hover:ring-line-strong group-active:bg-surface group-active:ring-line-strong">
              <span className="block rounded-lg shadow-soft transition-[translate,box-shadow] duration-200 ease-out group-hover:shadow-pop motion-safe:group-hover:-translate-y-1">
                <ResumePreview template={template} thumbnail className="overflow-hidden rounded-lg" />
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-7 bottom-7 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-base font-bold text-white opacity-0 shadow-pop transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {copy.cardHover}
                <ArrowRight className="size-4" />
              </span>
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
      <div className="mt-8">
        <ButtonLink href="/templates" variant="secondary" size="lg">
          {copy.action}
        </ButtonLink>
      </div>
    </Section>
  );
}

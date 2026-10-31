import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ResumePreview } from "@/components/resume/ResumePreview";
import type { GalleryTemplate } from "@/components/templates/gallery";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { Container } from "@/components/ui/Container";
import { site, socialImage } from "@/data/site";
import { TEMPLATE_COUNT } from "@/data/template-count";
import { templateStructure } from "@/data/template-tags";
import { getCategory, templateCategories, templates } from "@/data/templates";

const title = `${TEMPLATE_COUNT} Free Resume Templates`;
const description = `Browse ${TEMPLATE_COUNT} free resume templates, from clean single-column designs to modern, creative, photo and executive layouts. Customize any of them online without an account.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/templates" },
  openGraph: { images: [socialImage], title: `${title} | ${site.name}`, description, url: "/templates" },
};

/** Cards in view on load are rendered here, so the first thumbnails don't wait for JavaScript. */
const EAGER_CARDS = 3;

export default function TemplatesPage() {
  const categories = templateCategories.map(({ id, label }) => ({
    id,
    label,
    count: templates.filter((template) => template.category === id).length,
  }));

  const items: GalleryTemplate[] = templates.map(({ slug, name, category, layout, description, bestFor, photo, tags, design }) => ({
    slug,
    name,
    category,
    layout,
    description,
    bestFor,
    photo,
    structure: templateStructure({ slug, design }),
    search: [name, layout, templateStructure({ slug, design }), description, bestFor, getCategory(category).label, photo !== "none" ? "photo picture" : "no photo", ...tags]
      .join(" ")
      .toLowerCase(),
  }));

  const eager = Object.fromEntries(
    templates
      .filter((template) => template.category === templateCategories[0].id)
      .slice(0, EAGER_CARDS)
      .map((template) => [template.slug, <ResumePreview key={template.slug} template={template} thumbnail />]),
  );

  return (
    <>
      <Container className="pt-8 md:pt-12">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-base text-muted">
            <li>
              <Link href="/" className="underline-offset-4 hover:text-ink hover:underline">
                Home
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight aria-hidden="true" className="size-4" />
              <span aria-current="page" className="font-medium text-ink">
                Templates
              </span>
            </li>
          </ol>
        </nav>
        <h1 className="mt-5 text-display text-balance text-ink">{TEMPLATE_COUNT} free resume templates</h1>
        <p className="mt-5 max-w-xl text-lead text-muted">
          Pick a design and make it yours.
          <br />
          Switch any time; your words stay put.
        </p>
        <p className="mt-5 text-small text-ink-soft">Free to use · No watermark · No account needed</p>
      </Container>
      <TemplateGallery categories={categories} items={items} eager={eager} total={TEMPLATE_COUNT} />
    </>
  );
}

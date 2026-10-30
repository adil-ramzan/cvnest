import type { Metadata } from "next";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateFilters } from "@/components/templates/TemplateFilters";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";
import { getCategory, templateCategories, templates } from "@/data/templates";

const description = `Browse ${templates.length} free resume templates, from free ATS-friendly single-column designs to modern, creative, photo and executive layouts. Customize any of them online without an account.`;

export const metadata: Metadata = {
  title: "Free Resume Templates",
  description,
  alternates: { canonical: "/templates" },
  openGraph: { title: `Free Resume Templates | ${site.name}`, description, url: "/templates" },
};

const GRID_ID = "template-grid";

export default function TemplatesPage() {
  const categories = templateCategories.map((category) => ({
    id: category.id,
    label: category.label,
    count: templates.filter((template) => template.category === category.id).length,
  }));

  return (
    <Container className="py-16 sm:py-20">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Template gallery</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Free resume templates</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          All {templates.length} templates are free. Explore and customize any of them without paying or creating an
          account, and switch designs whenever you like; your content stays the same.
        </p>
      </header>

      <TemplateFilters categories={categories} total={templates.length} gridId={GRID_ID} />

      <ul id={GRID_ID} className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
        {templates.map((template) => (
          <li
            key={template.slug}
            data-category={template.category}
            data-search={[
              template.name,
              template.layout,
              template.description,
              template.bestFor,
              getCategory(template.category).label,
              template.photo !== "none" ? "photo picture" : "no photo",
              ...template.tags,
            ]
              .join(" ")
              .toLowerCase()}
            className="[contain-intrinsic-block-size:auto_620px] [content-visibility:auto]"
          >
            <TemplateCard template={template} detailed />
          </li>
        ))}
      </ul>
    </Container>
  );
}

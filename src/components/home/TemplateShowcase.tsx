import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { featuredTemplateSlugs, getTemplate } from "@/data/templates";

export function TemplateShowcase() {
  return (
    <section aria-labelledby="templates-heading" className="py-20 sm:py-24">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="templates-heading"
            eyebrow="Templates"
            title="Start with a layout that works"
            description="All 45 templates are free to use. Each is designed for readability first, so recruiters can find what matters quickly."
          />
          <Link
            href="/templates"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            View All Templates
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {featuredTemplateSlugs.map((slug) => (
            <TemplateCard key={slug} template={getTemplate(slug)!} />
          ))}
        </div>
      </Container>
    </section>
  );
}

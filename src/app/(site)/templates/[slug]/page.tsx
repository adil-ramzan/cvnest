import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";
import { getCategory, getTemplate, templates } from "@/data/templates";

type TemplatePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return templates.map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({ params }: TemplatePageProps): Promise<Metadata> {
  const template = getTemplate((await params).slug);
  if (!template) return {};

  const title = `Free ${template.name} Resume Template`;
  const description = `${template.description} Free to use and customize online, with no account required.`;
  return {
    title,
    description,
    alternates: { canonical: `/templates/${template.slug}` },
    openGraph: { title: `${title} | ${site.name}`, description, url: `/templates/${template.slug}` },
  };
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const template = getTemplate((await params).slug);
  if (!template) notFound();

  const category = getCategory(template.category);
  const related = templates.filter((item) => item.category === template.category && item.slug !== template.slug).slice(0, 5);

  return (
    <Container className="py-10 sm:py-14">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-base text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" />
        All templates
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="rounded-lg border border-line bg-[#f1eee8] p-4 sm:p-8 lg:p-10">
          <ResumePreview
            template={template}
            className="mx-auto max-w-[816px] rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.25)]"
          />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-medium text-accent">
            {category.label} · {template.layout}
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-ink">{template.name}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">{template.description}</p>

          <dl className="mt-6 space-y-4 border-t border-line pt-5 text-base">
            <div>
              <dt className="font-medium text-ink">Best for</dt>
              <dd className="mt-1 text-muted">{template.bestFor}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Profile photo</dt>
              <dd className="mt-1 text-muted">
                {template.photo === "always"
                  ? "Shows your photo, or your initials if you don't add one."
                  : template.photo === "optional"
                    ? "Shows your photo if you add one."
                    : "No photo."}
              </dd>
            </div>
          </dl>

          <ButtonLink href={`/editor?template=${template.slug}`} size="lg" className="mt-8 w-full">
            Use This Free Template
          </ButtonLink>
          <p className="mt-3 text-sm text-muted">
            Free to use, with no account required. The sample content shown is fictional and for preview only.
          </p>

          <div className="mt-10 border-t border-line pt-6">
            <h2 className="text-base font-semibold text-ink">More {category.label.toLowerCase()} templates</h2>
            <ul className="mt-3 space-y-2.5">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link href={`/templates/${item.slug}`} className="text-base text-muted underline-offset-4 hover:text-ink hover:underline">
                    {item.name} — {item.layout}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/templates?category=${template.category}`}
              className="mt-4 inline-block text-base font-medium text-ink underline-offset-4 hover:underline"
            >
              View all {category.label.toLowerCase()} templates
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}

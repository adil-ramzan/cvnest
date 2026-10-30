import Link from "next/link";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { getCategory, type ResumeTemplate } from "@/data/templates";

type TemplateCardProps = {
  template: ResumeTemplate;
  /** Show the description, labels and the Use Template action (gallery view). */
  detailed?: boolean;
};

export function TemplateCard({ template, detailed = false }: TemplateCardProps) {
  const previewHref = `/templates/${template.slug}`;

  return (
    <article className="flex h-full flex-col">
      <Link
        href={previewHref}
        tabIndex={-1}
        aria-hidden="true"
        className="group block rounded-lg border border-line bg-[#f1eee8] p-5 transition-colors hover:border-line-strong sm:p-6"
      >
        <ResumePreview
          template={template}
          thumbnail
          className="rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.18)] transition-transform duration-200 group-hover:-translate-y-0.5"
        />
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl font-semibold text-ink">{template.name}</h3>
          <span className="text-sm text-muted">{template.layout}</span>
        </div>
        {detailed && (
          <>
            <p className="mt-2 text-base leading-relaxed text-muted">{template.description}</p>
            <p className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-line px-2.5 py-0.5 text-sm text-ink-soft">
                {getCategory(template.category).label}
              </span>
              {template.photo !== "none" && (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm text-accent">
                  {template.photo === "always" ? "With photo" : "Photo optional"}
                </span>
              )}
            </p>
          </>
        )}

        <div className={`mt-5 flex gap-2.5 ${detailed ? "mt-auto pt-5" : ""}`}>
          <ButtonLink
            href={previewHref}
            variant="secondary"
            size="sm"
            aria-label={`Preview ${template.name} template`}
          >
            Preview
          </ButtonLink>
          {detailed && (
            <ButtonLink
              href={`/editor?template=${template.slug}`}
              size="sm"
              aria-label={`Use ${template.name} template`}
            >
              Use Template
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}

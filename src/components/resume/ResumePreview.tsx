import type { ComponentType, Ref } from "react";
import type { PageSize, Resume } from "@/data/resume";
import type { ResumeTemplate } from "@/data/templates";
import { DesignTemplate } from "./engine/DesignTemplate";
import { MinimalTemplate } from "./MinimalTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { type PreparedResume, prepareResume } from "./prepareResume";
import { ProfessionalTemplate } from "./ProfessionalTemplate";
import { ResumePaper } from "./ResumePaper";

/** Hand-written templates; every other template is rendered from its design. */
const customComponents: Record<string, ComponentType<{ resume: PreparedResume }>> = {
  professional: ProfessionalTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
};

type TemplateRendererProps = { template: ResumeTemplate; resume: Resume; photoUrl?: string; links?: boolean };

/** Renders resume content with a template. Templates only ever read content; they never change it. */
export function TemplateRenderer({ template, resume, photoUrl, links }: TemplateRendererProps) {
  const prepared = { ...prepareResume(resume, photoUrl), links };
  if (template.design) return <DesignTemplate resume={prepared} design={template.design} />;
  const Component = customComponents[template.slug] ?? ProfessionalTemplate;
  return <Component resume={prepared} />;
}

type ResumePreviewProps = {
  template: ResumeTemplate;
  /** Resume to render. Defaults to the template's sample person. */
  resume?: Resume;
  /** Resolved photo URL for `resume`. */
  photoUrl?: string;
  /** Render as a single labelled image (for thumbnails) instead of readable document content. */
  thumbnail?: boolean;
  /** Let content flow past the first page instead of cropping it. */
  flow?: boolean;
  size?: PageSize;
  pageRef?: Ref<HTMLDivElement>;
  className?: string;
};

export function ResumePreview({ template, resume, photoUrl, thumbnail = false, flow, size, pageRef, className }: ResumePreviewProps) {
  return (
    <ResumePaper
      label={
        thumbnail
          ? resume
            ? `Your resume in the ${template.name} template`
            : `Sample resume using the ${template.name} template`
          : undefined
      }
      flow={flow}
      size={size}
      pageRef={pageRef}
      className={className}
    >
      <TemplateRenderer
        template={template}
        resume={resume ?? template.sample}
        photoUrl={resume ? photoUrl : template.samplePhoto}
        links={flow}
      />
    </ResumePaper>
  );
}

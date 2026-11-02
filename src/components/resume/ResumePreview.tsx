import type { ComponentType, CSSProperties, Ref } from "react";
import type { PageSize, Resume, ResumeCustomization } from "@/data/resume";
import type { ResumeTemplate } from "@/data/templates";
import { customizationVars, customizeDesign } from "./engine/customize";
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

type TemplateRendererProps = { template: ResumeTemplate; resume: Resume; photoUrl?: string; links?: boolean; printCopy?: boolean; asideFirst?: boolean; customization?: ResumeCustomization };

/** Renders resume content with a template. Templates only ever read content; they never change it. */
export function TemplateRenderer({ template, resume, photoUrl, links, printCopy, asideFirst, customization = {} }: TemplateRendererProps) {
  const prepared = { ...prepareResume(resume, photoUrl), links, nameTag: printCopy ? ("h1" as const) : ("div" as const), asideFirst: printCopy && asideFirst };
  if (template.design) return <DesignTemplate resume={prepared} design={customizeDesign(template.design, customization)} />;
  const Component = customComponents[template.slug] ?? ProfessionalTemplate;
  return <Component resume={prepared} />;
}

type ResumePreviewProps = {
  template: ResumeTemplate;
  /** Resume to render. Defaults to the template's sample person. */
  resume?: Resume;
  /** Resolved photo URL for `resume`. */
  photoUrl?: string;
  /** Color, font and size choices. Defaults to those saved with `resume`, so a sample can show them too. */
  customization?: ResumeCustomization;
  /** Render as a single labelled image (for thumbnails) instead of readable document content. */
  thumbnail?: boolean;
  /** Let content flow past the first page instead of cropping it. */
  flow?: boolean;
  /** This copy becomes the PDF, so the name is a real heading in its structure. */
  printCopy?: boolean;
  /** See PreparedResume. */
  asideFirst?: boolean;
  size?: PageSize;
  pageRef?: Ref<HTMLDivElement>;
  className?: string;
};

export function ResumePreview({ template, resume, photoUrl, customization = resume?.design ?? {}, thumbnail = false, flow, printCopy, asideFirst, size, pageRef, className }: ResumePreviewProps) {
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
      className={customization.fontFamily ? `resume-paper--font ${className ?? ""}` : className}
      style={customizationVars(customization) as CSSProperties}
    >
      <TemplateRenderer
        template={template}
        resume={resume ?? template.sample}
        photoUrl={resume ? photoUrl : template.samplePhoto}
        links={flow && !!resume}
        printCopy={printCopy}
        asideFirst={asideFirst}
        customization={customization}
      />
    </ResumePaper>
  );
}

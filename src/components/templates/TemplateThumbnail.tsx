import { ResumePreview } from "@/components/resume/ResumePreview";
import { getTemplate } from "@/data/templates";

/** Loaded on demand: it brings the template registry and sample resumes with it. */
export default function TemplateThumbnail({ slug }: { slug: string }) {
  const template = getTemplate(slug);
  return template ? <ResumePreview template={template} thumbnail /> : null;
}

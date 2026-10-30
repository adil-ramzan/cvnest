import type { Metadata } from "next";
import { ResumeEditor } from "@/components/editor/ResumeEditor";
import { isTemplateSlug } from "@/lib/resumes";

export const metadata: Metadata = {
  title: "Free Resume Editor",
  description: "Write and preview your resume for free. Your resume data is stored locally in your browser.",
  robots: { index: false },
};

type EditorPageProps = {
  searchParams: Promise<{ template?: string | string[] }>;
};

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const { template } = await searchParams;
  return <ResumeEditor initialTemplate={isTemplateSlug(template) ? template : undefined} />;
}

import type { Metadata } from "next";
import { ResumeEditor } from "@/components/editor/ResumeEditor";
import { isTemplateSlug } from "@/lib/resumes";

export const metadata: Metadata = {
  title: "Free Resume Editor",
  description: "Write and preview your resume for free. Your resume data is stored locally in your browser.",
  robots: { index: false, follow: false },
};

type EditorPageProps = {
  searchParams: Promise<{ template?: string | string[] }>;
};

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const { template } = await searchParams;
  return (
    <>
      <noscript>
        <div style={{ maxWidth: "36rem", margin: "4rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>The resume editor needs JavaScript</h1>
          <p>Turn on JavaScript for this site in your browser settings, then reload this page. Any resumes you saved in this browser are still here.</p>
        </div>
      </noscript>
      <ResumeEditor initialTemplate={isTemplateSlug(template) ? template : undefined} />
    </>
  );
}

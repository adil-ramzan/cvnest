import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/layout/SimplePage";
import { site, socialImage } from "@/data/site";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${site.name}, a free resume builder and CV maker focused on clear, professional documents.`,
  alternates: { canonical: "/about" },
  openGraph: { images: [socialImage], url: "/about" },
};

export default function AboutPage() {
  return (
    <SimplePage
      eyebrow="About"
      title={`About ${site.name}`}
      intro={`${site.name} is a free online resume builder and CV maker focused on clear, professional documents.`}
    >
      <p>
        Writing a resume should be about your experience, not about fighting with formatting. We design templates that
        are easy to read, print cleanly, and work across industries.
      </p>
      <p>
        You can create a resume online for free: pick any of our templates, fill in your details and see the result
        as you type. Your resume stays in your browser, and you don&apos;t need an account.
      </p>
      <p>
        <Link href="/free" className="font-medium text-ink underline underline-offset-4">
          See what&apos;s free
        </Link>
      </p>
    </SimplePage>
  );
}

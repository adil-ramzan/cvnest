import type { Metadata } from "next";
import Link from "next/link";
import { textLinkClass } from "@/components/ui/styles";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${site.name}.`,
  alternates: { canonical: "/terms" },
};

// Source: docs/legal/terms-of-service-draft.md. Draft, not legally reviewed. Bracketed
// [OWNER] and [LEGAL] items are deliberately left visible until they are supplied.

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About these terms",
    content: (
      <>
        <p>
          These terms apply to your use of {site.name}, the online resume builder (the &ldquo;Service&rdquo;), operated
          by [OWNER: legal name] (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the Service, you agree to these terms.
          If you don&apos;t agree, please don&apos;t use the Service.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "The Service",
    content: (
      <>
        <p>{site.name} lets you create, edit, style and download resumes using templates provided on the site.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The Service is free. You don&apos;t need an account, and none is offered today.</li>
          <li>You may download your resume as a PDF as many times as you like, with no watermark.</li>
          <li>
            All templates currently offered are free to use. [OWNER: confirm the commitment that today&apos;s templates
            will remain free.]
          </li>
          <li>
            Your resumes are saved in your own browser on your device, as described in the{" "}
            <Link href="/privacy" className={textLinkClass}>
              Privacy Policy
            </Link>
            . We don&apos;t hold a copy.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>You own the content you enter into {site.name}. We claim no rights over it.</li>
          <li>
            Because your content stays in your browser, you&apos;re responsible for keeping copies. Clearing browser
            data, using a private window, or a browser&apos;s own storage clean-up can permanently delete it, and we
            can&apos;t recover it. Use Download backup regularly.
          </li>
          <li>
            You&apos;re responsible for the accuracy of your resume and for making sure you have the right to include
            any content, including photos.
          </li>
          <li>
            Don&apos;t use the Service to create content that is unlawful, fraudulent (for example impersonating another
            person), or that infringes someone else&apos;s rights.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "templates",
    title: "Templates and site content",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You may use the templates to create and distribute your own resumes, for personal or professional use, with
            no attribution required.
          </li>
          <li>
            You may not resell, redistribute or republish the templates, the site&apos;s design or its code as your own
            product or template collection. [LEGAL: confirm the scope of this licence.]
          </li>
          <li>
            Sample resumes shown on this site are fictional and provided for preview purposes only. Any resemblance to
            real people is coincidental.
          </li>
          <li>Fonts used in templates are licensed under the SIL Open Font License 1.1.</li>
        </ul>
      </>
    ),
  },
  {
    id: "results",
    title: "No guarantee of results",
    content: (
      <>
        <p>
          {site.name} is a tool for formatting documents. We don&apos;t guarantee that a resume created with it will be
          accepted by any employer, recruiter or applicant tracking system, or that it will lead to an interview or job.
          Different browsers and print settings can produce slightly different PDFs, so review your PDF before sending
          it.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    content: (
      <>
        <p>
          We may change, suspend or discontinue any part of the Service. Because your resumes are stored in your
          browser, keep a backup file in case the Service becomes unavailable. If we introduce optional accounts or paid
          services in the future, the free features described in section 2 won&apos;t become paid. [OWNER/LEGAL: confirm
          this commitment.]
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    content: (
      <>
        <p>[LEGAL: warranty disclaimer appropriate to the jurisdiction.]</p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          [LEGAL: limitation clause appropriate to the jurisdiction and to consumer-protection law in the target
          markets.]
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    content: (
      <>
        <p>
          These terms are governed by the laws of [OWNER/LEGAL: country or state]. [LEGAL: dispute venue and
          consumer-rights carve-outs.]
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <>
        <p>
          We may update these terms. Significant changes, such as the introduction of accounts or paid services, will be
          reflected here before they take effect.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>[OWNER: email address], [OWNER: postal address, if required].</p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="This is a draft of our terms of service. It describes how CVNest works today, but it hasn't been legally reviewed or approved yet. Items in square brackets are still to be confirmed."
      meta="Last updated: [OWNER: date of approval]"
      sections={sections}
    />
  );
}

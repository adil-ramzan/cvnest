import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/layout/LegalPage";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${site.name}.`,
  alternates: { canonical: "/privacy" },
};

// Source: docs/legal/privacy-policy-draft.md. Draft, not legally reviewed. Bracketed
// [OWNER] and [LEGAL] items are deliberately left visible until they are supplied.

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <>
        <p>
          {site.name} is a free online resume builder. It is operated by [OWNER: legal name of the individual or
          company], [OWNER: postal address, if required]. For privacy questions, contact [OWNER: email address].
        </p>
      </>
    ),
  },
  {
    id: "short-version",
    title: "The short version",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>You don&apos;t need an account to use {site.name}, and we don&apos;t offer accounts today.</li>
          <li>
            The resumes you create are stored in your own browser on your device. {site.name} doesn&apos;t send your
            resume content or photos to our servers.
          </li>
          <li>PDFs are created by your own browser. Your resume isn&apos;t uploaded to make them.</li>
          <li>We don&apos;t use cookies, analytics or advertising trackers.</li>
          <li>
            Like any website, our hosting provider processes basic technical information, such as your IP address, to
            deliver pages to you.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "browser-storage",
    title: "Information stored in your browser",
    content: (
      <>
        <p>
          When you use the resume editor, {site.name} saves the following only in your browser, using your
          browser&apos;s local storage and IndexedDB:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            The resume content you enter, such as your name, job title, contact details, work history, education and
            skills.
          </li>
          <li>An optional profile photo, which your browser resizes before storing.</li>
          <li>
            Editor preferences, such as which resume was last open, the zoom level and when you last downloaded a
            backup.
          </li>
        </ul>
        <p>
          This information stays on your device. We can&apos;t see it, access it, recover it or delete it for you. To
          delete it, clear this site&apos;s data in your browser settings, or delete resumes in the editor. To keep a
          copy, use Download backup in the editor. The backup file is created by your browser and saved to your device;
          it isn&apos;t sent to us.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Browser storage isn&apos;t encrypted. Anyone with access to your browser profile could read it, so avoid
            using {site.name} on shared or public computers.
          </li>
          <li>
            Clearing browsing data, using a private window, or some browsers&apos; automatic storage clean-up can
            permanently remove your saved resumes. Download a backup regularly.
          </li>
          <li>
            Browser extensions you install, browser sync, and any cloud service you save files to are controlled by you
            and those providers, not by {site.name}.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "site-visits",
    title: "Information processed when you visit the site",
    content: (
      <>
        <p>
          {site.name} is hosted on Cloudflare. To deliver the website, the hosting provider processes technical
          information sent by your browser with every request, such as your IP address, browser type, requested page and
          the time of the request. This is needed to serve the site and protect it from abuse. {site.name} doesn&apos;t
          add this information to your resume, and doesn&apos;t use it to identify you or build a profile.
        </p>
        <p>
          [LEGAL: confirm the hosting provider description and whether to name it.] [OWNER/LEGAL: confirm what request
          logs, if any, are available to the operator, how long they&apos;re kept, and the hosting provider&apos;s
          role.]
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    content: (
      <>
        <p>
          {site.name} doesn&apos;t set cookies. We don&apos;t use analytics, advertising or social-media tracking tools,
          and the site loads no third-party scripts or fonts. The browser storage described above is used only to
          provide the editor&apos;s features to you.
        </p>
        <p>
          [LEGAL: confirm whether any notice or consent is required for this browser storage in the target markets.]
        </p>
      </>
    ),
  },
  {
    id: "what-we-dont-do",
    title: "What we don't do",
    content: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>We don&apos;t sell or rent personal information.</li>
          <li>We don&apos;t receive or store the content of your resumes or your photos.</li>
          <li>We don&apos;t use your resume content for advertising, profiling or training any model.</li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-basis",
    title: "Legal basis",
    content: (
      <>
        <p>[LEGAL: legal basis for processing technical request data, where required.]</p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <>
        <p>
          Depending on where you live, you may have rights to access, correct, delete or restrict the use of your
          personal information, and to complain to a data-protection authority. Because resume content is stored only on
          your device, you can view, change or delete it yourself at any time. For questions about technical data
          processed by our hosting provider, contact [OWNER: email address].
        </p>
        <p>[LEGAL: jurisdiction-specific rights and supervisory authority, as applicable.]</p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <>
        <p>{site.name} isn&apos;t directed at children under [OWNER/LEGAL: minimum age].</p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International transfers",
    content: (
      <>
        <p>[LEGAL: describe transfers arising from the hosting provider&apos;s network, if required.]</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We&apos;ll update this policy when {site.name} changes. In particular, it will be revised before optional
          accounts, cloud backup, analytics or paid services are introduced.
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

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This is a draft of our privacy policy. It describes how CVNest works today, but it hasn't been legally reviewed or approved yet. Items in square brackets are still to be confirmed."
      meta="Last updated: [OWNER: date of approval]"
      sections={sections}
      numbered={false}
    />
  );
}

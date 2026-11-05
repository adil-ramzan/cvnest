import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/layout/SimplePage";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to get in touch with the ${site.name} team.`,
  alternates: { canonical: "/contact" },
};

// Source: docs/legal/contact-page-draft.md. The contact address isn't confirmed yet,
// so the [OWNER] placeholder stays visible. Email only: no form, no backend endpoint.
const heading = "pt-4 text-xl font-bold text-ink";
const link = "font-medium text-ink underline underline-offset-4";

export default function ContactPage() {
  return (
    <SimplePage
      eyebrow="Contact"
      title="Get in touch"
      intro={`Questions, problems or feedback about ${site.name}? Our contact address is still being set up and will appear here once it's confirmed.`}
    >
      <p>Email: [OWNER: contact email address]</p>

      <h2 className={heading}>Before you write</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          We can&apos;t see or recover your resumes. They&apos;re stored only in your own browser. If your resumes are
          missing, check that you&apos;re using the same browser, device and web address as before, and not a private
          window. If you downloaded a backup, use Restore from backup in the editor menu.
        </li>
        <li>
          Problems saving a PDF? Choose Download PDF in the editor, then pick Save as PDF as the destination in your
          browser&apos;s print window. Tell us your browser, device and the template you used.
        </li>
        <li>Please don&apos;t email your resume unless we ask for it to investigate a problem.</li>
      </ul>

      <h2 className={heading}>Privacy and legal</h2>
      <p>
        For privacy questions, see the{" "}
        <Link href="/privacy" className={link}>
          Privacy Policy
        </Link>{" "}
        or email [OWNER: privacy contact, may be the same address].
      </p>
      <p>[OWNER: operator legal name and postal address, if required.]</p>
    </SimplePage>
  );
}

import { FileDown, HardDrive, Mail, MailX, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { textLinkClass } from "@/components/ui/styles";
import { Container } from "@/components/ui/Container";
import { sectionSpaceY } from "@/components/ui/Section";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to get in touch with the ${site.name} team.`,
  alternates: { canonical: "/contact" },
};

// Source: docs/legal/contact-page-draft.md. The contact address isn't confirmed yet,
// so the [OWNER] placeholder stays visible. Email only: no form, no backend endpoint.
const card = "rounded-3xl bg-surface shadow-soft";
const iconTile = "flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent";

const tips = [
  // ACCOUNTS
  {
    icon: HardDrive,
    title: "Missing resumes",
    body: (
      <>
        We can&apos;t see or recover your resumes. They&apos;re stored only in your own browser. If your resumes are
        missing, check that you&apos;re using the same browser, device and web address as before, and not a private
        window. If you downloaded a backup, use Restore from backup in the editor menu.
      </>
    ),
  },
  {
    icon: FileDown,
    title: "Problems saving a PDF",
    body: (
      <>
        Choose Save as PDF in the editor, then pick “Save as PDF” as the destination in your browser&apos;s print window.
        Tell us your browser, device and the template you used.
      </>
    ),
  },
  {
    icon: MailX,
    title: "Don't send your resume",
    body: <>Please don&apos;t email your resume unless we ask for it to investigate a problem.</>,
  },
];

export default function ContactPage() {
  return (
    <>
      <section aria-labelledby="contact-heading" className="pt-14 md:pt-20">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <p className="text-small font-bold tracking-wide text-muted uppercase">Contact</p>
            <h1 id="contact-heading" className="mt-4 text-display text-balance text-ink">
              Get in touch
            </h1>
            <p className="mt-6 max-w-xl text-lead text-pretty text-muted">
              Questions, problems or feedback about {site.name}? Our contact address is still being set up and will
              appear here once it&apos;s confirmed.
            </p>
          </div>

          <div className={`${card} p-8 md:p-10`}>
            <span className={iconTile}>
              <Mail aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-6 text-small font-bold tracking-wide text-muted uppercase">Email</p>
            <p className="mt-2 text-xl font-bold break-words text-ink">[OWNER: contact email address]</p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="before-heading" className="pt-[clamp(3.5rem,8vw,5.5rem)]">
        <Container>
          <h2 id="before-heading" className={`${sectionTitle} max-w-3xl text-balance text-ink`}>
            Before you write
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3 lg:gap-6">
            {tips.map(({ icon: Icon, title, body }) => (
              <li key={title} className={`${card} p-6 md:p-7`}>
                <span className={iconTile}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-xl leading-snug font-bold text-ink">{title}</h3>
                <p className="mt-2 text-base text-pretty text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="legal-heading" className={sectionSpaceY}>
        <Container>
          <div className={`${card} flex flex-col gap-5 p-6 sm:flex-row sm:items-start md:p-8`}>
            <span className={iconTile}>
              <Shield aria-hidden="true" className="size-5" />
            </span>
            <div className="space-y-3 text-base leading-relaxed text-ink-soft">
              <h2 id="legal-heading" className="text-xl leading-snug font-bold text-ink">
                Privacy and legal
              </h2>
              <p>
                For privacy questions, see the{" "}
                <Link href="/privacy" className={textLinkClass}>
                  Privacy Policy
                </Link>{" "}
                or email [OWNER: privacy contact, may be the same address].
              </p>
              <p>[OWNER: operator legal name and postal address, if required.]</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

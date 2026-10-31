import { Check } from "lucide-react";
import type { Metadata } from "next";
import { SimplePage } from "@/components/layout/SimplePage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { freeFeatures, site, socialImage } from "@/data/site";
import { TEMPLATE_COUNT } from "@/data/template-count";

const description = `Everything in ${site.name} is free: all ${TEMPLATE_COUNT} resume templates, editing, customization and browser autosave, with no watermarks, subscription or account.`;

export const metadata: Metadata = {
  title: "What's Free",
  description,
  alternates: { canonical: "/free" },
  openGraph: { images: [socialImage], title: `What's Free | ${site.name}`, description, url: "/free" },
};

export default function FreePage() {
  return (
    <SimplePage
      eyebrow="Free resume builder"
      title="What's free"
      intro={`${site.name} is free to use. There is no subscription, no paid plan and no hidden fees, and you don't need an account.`}
    >
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {freeFeatures(TEMPLATE_COUNT).map((feature) => (
          <li key={feature.title} className="flex gap-3 px-5 py-4">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-lg font-medium text-ink">{feature.title}</span>
              <span className="mt-0.5 block text-base text-muted">{feature.description}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-base text-muted">
        This list only includes features that are available today. Your resume content is stored in your browser and is
        never uploaded to our servers.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/editor">Create Your Free Resume</ButtonLink>
        <ButtonLink href="/templates" variant="secondary">
          Browse Free Templates
        </ButtonLink>
      </div>
    </SimplePage>
  );
}

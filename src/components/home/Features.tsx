import { Eye, LayoutTemplate, type LucideIcon, ShieldCheck, SlidersHorizontal, UserRoundCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  comingSoon?: boolean;
};

const features: Feature[] = [
  {
    icon: Eye,
    title: "Live resume preview",
    description: "See your resume update side by side as you type, so you always know how the final result will look.",
  },
  {
    icon: LayoutTemplate,
    title: "45 free templates",
    description: "Carefully spaced layouts with clear hierarchy. Every template is free, with none locked behind a paywall.",
  },
  {
    icon: SlidersHorizontal,
    title: "Easy customization",
    description: "Reorder sections, adjust details, and switch templates without starting over.",
  },
  {
    icon: UserRoundCheck,
    title: "No account required",
    description: "Create your resume without signing up or paying. It stays in your browser and saves as you type.",
  },
  {
    icon: ShieldCheck,
    title: "No watermark",
    description: "Your resume is yours. No logos, badges, or branding added to your document.",
  },
];

export function Features() {
  return (
    <section aria-labelledby="features-heading" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          id="features-heading"
          eyebrow="Features"
          title="Everything you need, nothing you don't"
          description="A focused, free set of tools for writing a clear, professional resume, with no subscription or hidden fees."
        />

        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, comingSoon }) => (
            <li key={title} className="bg-surface p-6 sm:p-8 sm:last:col-span-2 lg:last:col-span-1 lg:nth-4:col-span-2">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-md border border-line text-ink">
                  <Icon aria-hidden="true" className="size-4.5" />
                </span>
                {comingSoon && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

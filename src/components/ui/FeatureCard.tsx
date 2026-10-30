import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="h-full rounded-3xl bg-surface p-7 shadow-soft lg:p-8">
      <span className="flex size-12 items-center justify-center rounded-[14px] bg-ink text-white">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h3 className="mt-6 text-title text-ink">{title}</h3>
      <p className="mt-2 text-body text-pretty text-muted">{description}</p>
    </div>
  );
}

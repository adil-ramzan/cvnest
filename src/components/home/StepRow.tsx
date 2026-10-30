import type { ReactNode } from "react";

type StepRowProps = {
  step: number;
  title: string;
  description: string;
  /** Decorative mock of the product, hidden from assistive technology. */
  visual: ReactNode;
  reverse?: boolean;
};

export function StepRow({ step, title, description, visual, reverse = false }: StepRowProps) {
  return (
    <li className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-20">
      <div aria-hidden="true" className={`rounded-[28px] bg-panel p-5 sm:p-8 lg:p-10 ${reverse ? "md:order-last" : ""}`}>
        {visual}
      </div>
      <div>
        <p className="text-small font-bold text-muted">Step {step}</p>
        <h3 className="mt-2 text-h3 text-balance text-ink">{title}</h3>
        <p className="mt-4 max-w-xl text-body text-pretty text-muted">{description}</p>
      </div>
    </li>
  );
}

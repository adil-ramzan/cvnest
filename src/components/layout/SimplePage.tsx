import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

type SimplePageProps = {
  eyebrow?: string;
  title: string;
  intro: string;
  children?: ReactNode;
};

/** Plain text page used for informational and placeholder routes. */
export function SimplePage({ eyebrow, title, intro, children }: SimplePageProps) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-sm font-medium text-accent-ink">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p>
        {children && <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft">{children}</div>}
      </div>
    </Container>
  );
}

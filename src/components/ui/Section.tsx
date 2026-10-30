import type { ReactNode } from "react";
import { Container } from "./Container";

type SectionProps = {
  id?: string;
  labelledBy: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, labelledBy, children, className = "" }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-28 py-16 md:py-24 lg:py-32 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

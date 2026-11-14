import type { ReactNode } from "react";
import { Container } from "./Container";

type SectionProps = {
  id?: string;
  labelledBy: string;
  children: ReactNode;
  className?: string;
};

/**
 * Space between home page sections: 56px on phones up to 88px on desktop. Written out
 * twice because Tailwind only sees whole class names. (The `--section-y` token is left
 * as it is for the templates page.)
 */
export const sectionSpaceTop = "pt-[clamp(3.5rem,8vw,5.5rem)]";
export const sectionSpaceY = "py-[clamp(3.5rem,8vw,5.5rem)]";

export function Section({ id, labelledBy, children, className = "" }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-28 ${sectionSpaceTop} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

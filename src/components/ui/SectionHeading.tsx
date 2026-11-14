type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

/**
 * The home page's section title: about 30px on phones up to 52px on desktop, so the hero
 * headline stays the largest text. Same weight, line height and tracking as `text-h2`.
 * Used by every home section heading, including ones that don't use this component.
 */
export const sectionTitle = "text-[clamp(1.875rem,1rem+3vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.03em]";

export function SectionHeading({ id, eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p className="text-small font-bold tracking-wide text-muted uppercase">{eyebrow}</p>
      <h2 id={id} className={`mt-3 ${sectionTitle} text-balance text-ink`}>
        {title}
      </h2>
      {description && <p className={`mt-3 max-w-2xl text-body text-pretty text-muted ${align === "center" ? "mx-auto" : ""}`}>{description}</p>}
    </div>
  );
}

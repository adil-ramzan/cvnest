type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** A smaller title (about 32px on phones, 52px on desktop) for a section that needs the room. */
  compact?: boolean;
};

/** Same weight, line height and tracking as `text-h2`, at a smaller size. */
const compactTitle = "text-[clamp(2rem,1rem+3.4vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.03em]";

export function SectionHeading({ id, eyebrow, title, description, align = "left", compact = false }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p className="text-small font-bold tracking-wide text-muted uppercase">{eyebrow}</p>
      <h2 id={id} className={`mt-3 ${compact ? compactTitle : "text-h2"} text-balance text-ink`}>
        {title}
      </h2>
      {description && <p className={`mt-5 max-w-2xl text-body text-pretty text-muted ${align === "center" ? "mx-auto" : ""}`}>{description}</p>}
    </div>
  );
}

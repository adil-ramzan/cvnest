type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({ id, eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p className="text-small font-bold tracking-wide text-muted uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-h2 text-balance text-ink">
        {title}
      </h2>
      {description && <p className={`mt-5 max-w-2xl text-body text-pretty text-muted ${align === "center" ? "mx-auto" : ""}`}>{description}</p>}
    </div>
  );
}

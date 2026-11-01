import { Fragment, type ReactNode } from "react";
import { LinkText } from "./LinkText";
import { joinParts, type PreparedResume, type RenderEntry, type RenderSection } from "./prepareResume";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="border-b border-[#1f2a44] pb-1 font-resume-sans text-2xs font-semibold tracking-[0.18em] text-[#1f2a44] uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EntryHeader({ title, dates }: { title: string; dates: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {dates && <span className="shrink-0 font-resume-sans text-2xs text-[#4b5563]">{dates}</span>}
    </div>
  );
}

function ExperienceEntry({ entry }: { entry: RenderEntry }) {
  return (
    <div>
      <EntryHeader title={entry.title} dates={entry.dates} />
      <p className="text-xs text-[#4b5563] italic">{joinParts([entry.subtitle, entry.location], ", ")}</p>
      {entry.bullets.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed marker:text-[#9ca3af]">
          {entry.bullets.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EducationEntry({ entry }: { entry: RenderEntry }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold">{entry.title}</h3>
        <p className="text-xs text-[#4b5563] italic">
          {entry.subtitle}
          {entry.text ? ` — ${entry.text}` : ""}
        </p>
      </div>
      <span className="shrink-0 font-resume-sans text-2xs text-[#4b5563]">{entry.dates}</span>
    </div>
  );
}

/** Projects, awards and custom entries. */
function DetailEntry({ entry, links }: { entry: RenderEntry; links?: boolean }) {
  return (
    <div>
      <EntryHeader title={entry.title} dates={entry.dates} />
      {(entry.subtitle || entry.link) && (
        <p className="text-xs text-[#4b5563] italic">
          {entry.subtitle}
          {entry.subtitle && entry.link && " — "}
          {entry.link && <LinkText value={entry.link} links={links} />}
        </p>
      )}
      {entry.text && <p className="mt-1 text-xs leading-relaxed whitespace-pre-line">{entry.text}</p>}
    </div>
  );
}

function SectionBody({ section, links }: { section: RenderSection; links?: boolean }) {
  if (section.kind === "text") return <p className="text-xs leading-relaxed whitespace-pre-line">{section.text}</p>;
  if (section.kind === "list") {
    return section.type === "certifications" ? (
      <ul className="space-y-0.5 text-xs">
        {section.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-xs leading-relaxed">{section.items.join("  ·  ")}</p>
    );
  }
  if (section.type === "experience" || section.type === "volunteering") {
    return (
      <div className="space-y-4">
        {section.entries.map((entry) => (
          <ExperienceEntry key={entry.id} entry={entry} />
        ))}
      </div>
    );
  }
  if (section.type === "education") {
    return (
      <div className="space-y-2">
        {section.entries.map((entry) => (
          <EducationEntry key={entry.id} entry={entry} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {section.entries.map((entry) => (
        <DetailEntry key={entry.id} entry={entry} links={links} />
      ))}
    </div>
  );
}

export function ProfessionalTemplate({ resume }: { resume: PreparedResume }) {
  const Name = resume.nameTag ?? "div";
  return (
    <article className="px-14 py-12 font-serif text-[#222326]">
      <header className="text-center">
        <Name className="text-4xl font-semibold tracking-tight text-[#1f2a44]">{resume.name}</Name>
        {resume.title && (
          <p className="mt-1 font-resume-sans text-xs font-medium tracking-[0.22em] text-[#4b5563] uppercase">
            {resume.title}
          </p>
        )}
        {resume.contactItems.length > 0 && (
          <p className="mt-3 font-resume-sans text-2xs text-[#4b5563]">
            {resume.contactItems.map((item, i) => (
              <Fragment key={i}>
                {i > 0 && "  ·  "}
                <LinkText value={item} links={resume.links} />
              </Fragment>
            ))}
          </p>
        )}
      </header>

      {resume.sections.map((section) => (
        <Section key={section.id} title={section.title}>
          <SectionBody section={section} links={resume.links} />
        </Section>
      ))}
    </article>
  );
}

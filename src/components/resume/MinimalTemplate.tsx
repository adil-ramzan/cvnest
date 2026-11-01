import type { ReactNode } from "react";
import { LinkText } from "./LinkText";
import { joinParts, type PreparedResume, type RenderEntry, type RenderSection } from "./prepareResume";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[22%_1fr] gap-6 border-t border-[#e5e5e5] pt-5">
      <h2 className="text-2xs font-medium tracking-[0.14em] text-[#8a8a8a] uppercase">{label}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ExperienceEntry({ entry }: { entry: RenderEntry }) {
  return (
    <div>
      <h3 className="text-sm font-medium">
        {entry.title}
        {entry.title && entry.subtitle && <span className="font-normal text-[#8a8a8a]"> at </span>}
        {entry.subtitle}
      </h3>
      <p className="mt-0.5 text-2xs text-[#8a8a8a]">{joinParts([entry.dates, entry.location], " · ")}</p>
      {entry.bullets.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[#333333]">
          {entry.bullets.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SimpleEntry({ entry, meta, textClass, link, links }: { entry: RenderEntry; meta: string; textClass: string; link?: string; links?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{entry.title}</h3>
      {(meta || link) && (
        <p className="mt-0.5 text-2xs text-[#8a8a8a]">
          {meta}
          {meta && link && " · "}
          {link && <LinkText value={link} links={links} />}
        </p>
      )}
      {entry.text && <p className={`${textClass} text-xs leading-relaxed whitespace-pre-line text-[#333333]`}>{entry.text}</p>}
    </div>
  );
}

function RowBody({ section, links }: { section: RenderSection; links?: boolean }) {
  if (section.kind === "text") {
    return <p className="text-xs leading-relaxed whitespace-pre-line text-[#333333]">{section.text}</p>;
  }
  if (section.kind === "list") {
    return section.type === "certifications" ? (
      <ul className="space-y-0.5 text-xs text-[#333333]">
        {section.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-xs leading-relaxed text-[#333333]">{section.items.join(", ")}</p>
    );
  }

  switch (section.type) {
    case "experience":
    case "volunteering":
      return (
        <div className="space-y-5">
          {section.entries.map((entry) => (
            <ExperienceEntry key={entry.id} entry={entry} />
          ))}
        </div>
      );
    case "education":
      // Education details sit on the meta line rather than below it.
      return (
        <div className="space-y-3">
          {section.entries.map((entry) => (
            <div key={entry.id}>
              <h3 className="text-sm font-medium">{entry.title}</h3>
              <p className="mt-0.5 text-2xs text-[#8a8a8a]">{joinParts([entry.subtitle, entry.dates, entry.text], " · ")}</p>
            </div>
          ))}
        </div>
      );
    case "projects":
      return (
        <div className="space-y-4">
          {section.entries.map((entry) => (
            <SimpleEntry key={entry.id} entry={entry} meta={joinParts([entry.subtitle, entry.dates], " · ")} link={entry.link} links={links} textClass="mt-1.5" />
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-4">
          {section.entries.map((entry) => (
            <SimpleEntry key={entry.id} entry={entry} meta={joinParts([entry.subtitle, entry.dates], " · ")} textClass="mt-1.5" />
          ))}
        </div>
      );
  }
}

export function MinimalTemplate({ resume }: { resume: PreparedResume }) {
  const Name = resume.nameTag ?? "div";
  const { contact } = resume;
  const contactItems = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github, contact.website].filter(
    Boolean,
  );

  return (
    <article className="px-16 py-14 font-resume-sans text-[#1a1a1a]">
      <header className="mb-10">
        <Name className="text-4xl font-light tracking-tight">{resume.name}</Name>
        {resume.title && <p className="mt-1.5 text-base text-[#555555]">{resume.title}</p>}
        {contactItems.length > 0 && (
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-2xs text-[#555555]">
            {contactItems.map((item, i) => (
              <span key={i}>
                <LinkText value={item} links={resume.links} />
              </span>
            ))}
          </p>
        )}
      </header>

      <div className="space-y-6">
        {resume.sections.map((section) => (
          <Row key={section.id} label={section.title}>
            <RowBody section={section} links={resume.links} />
          </Row>
        ))}
      </div>
    </article>
  );
}

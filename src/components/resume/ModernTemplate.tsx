import type { ReactNode } from "react";
import type { SectionType } from "@/data/resume";
import { joinParts, type PreparedResume, type RenderEntry, type RenderSection } from "./prepareResume";

/** Section types shown in the sidebar, in this template's own order. Everything else follows the user's order in the main column. */
const SIDEBAR: SectionType[] = ["skills", "education", "certifications", "languages"];

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-2xs font-semibold tracking-[0.16em] text-[#2c6e66] uppercase">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function MainSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h2 className="flex items-center gap-3 text-2xs font-semibold tracking-[0.16em] text-[#2c6e66] uppercase">
        {title}
        <span className="h-px flex-1 bg-[#d5e2df]" />
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EntryHeader({ title, dates }: { title: string; dates: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {dates && <span className="shrink-0 text-2xs text-[#6b7378]">{dates}</span>}
    </div>
  );
}

function SidebarList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-xs break-words text-[#3f474e]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function SidebarBody({ section }: { section: RenderSection }) {
  if (section.kind === "list") return <SidebarList items={section.items} />;
  if (section.kind === "text") return <p className="text-xs leading-relaxed text-[#3f474e]">{section.text}</p>;
  return (
    <div className="space-y-3">
      {section.entries.map((entry) => (
        <div key={entry.id} className="text-xs">
          <p className="font-semibold text-[#25292e]">{entry.title}</p>
          <p className="mt-0.5 text-[#3f474e]">{entry.subtitle}</p>
          {entry.text && <p className="mt-0.5 text-[#3f474e]">{entry.text}</p>}
          <p className="mt-0.5 text-2xs text-[#6b7378]">{entry.dates}</p>
        </div>
      ))}
    </div>
  );
}

function MainEntry({ entry, type }: { entry: RenderEntry; type: SectionType }) {
  const hasBullets = type === "experience" || type === "volunteering";
  const subtitle = hasBullets ? joinParts([entry.subtitle, entry.location], " · ") : joinParts([entry.subtitle, entry.link], " · ");
  return (
    <div>
      <EntryHeader title={entry.title} dates={entry.dates} />
      {(hasBullets || subtitle) && <p className="text-xs font-medium text-[#2c6e66]">{subtitle}</p>}
      {entry.bullets.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#3f474e]">
          {entry.bullets.map((item, i) => (
            <li key={i} className="relative pl-3.5">
              <span className="absolute top-[0.6em] left-0 size-1 rounded-full bg-[#2c6e66]" />
              {item}
            </li>
          ))}
        </ul>
      )}
      {entry.text && <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-[#3f474e]">{entry.text}</p>}
    </div>
  );
}

function MainBody({ section }: { section: RenderSection }) {
  if (section.kind === "text") {
    return <p className="text-xs leading-relaxed whitespace-pre-line text-[#3f474e]">{section.text}</p>;
  }
  if (section.kind === "list") return <p className="text-xs leading-relaxed text-[#3f474e]">{section.items.join("  ·  ")}</p>;
  const spacing = section.type === "experience" || section.type === "volunteering" ? "space-y-5" : "space-y-4";
  return (
    <div className={spacing}>
      {section.entries.map((entry) => (
        <MainEntry key={entry.id} entry={entry} type={section.type} />
      ))}
    </div>
  );
}

export function ModernTemplate({ resume }: { resume: PreparedResume }) {
  const { contact } = resume;
  const contactItems = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github, contact.website].filter(
    Boolean,
  );
  const sidebar = SIDEBAR.flatMap((type) => resume.sections.filter((section) => section.type === type));
  const main = resume.sections.filter((section) => !SIDEBAR.includes(section.type));

  return (
    <article className="grid grid-cols-[34%_1fr] font-sans text-[#25292e]">
      <aside className="bg-[#eef4f2] px-8 py-12">
        <div className="flex size-20 items-center justify-center rounded-full bg-[#2c6e66] text-2xl font-semibold text-white">
          {resume.initials}
        </div>

        {contactItems.length > 0 && (
          <SidebarSection title="Contact">
            <SidebarList items={contactItems} />
          </SidebarSection>
        )}

        {sidebar.map((section) => (
          <SidebarSection key={section.id} title={section.title}>
            <SidebarBody section={section} />
          </SidebarSection>
        ))}
      </aside>

      <div className="min-w-0 px-10 py-12">
        <header className="mb-8">
          <h1 className="text-4xl leading-tight font-bold tracking-tight">{resume.name}</h1>
          {resume.title && <p className="mt-1 text-base font-medium text-[#2c6e66]">{resume.title}</p>}
        </header>

        {main.map((section) => (
          <MainSection key={section.id} title={section.title}>
            <MainBody section={section} />
          </MainSection>
        ))}
      </div>
    </article>
  );
}

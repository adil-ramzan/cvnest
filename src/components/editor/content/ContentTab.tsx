"use client";

import {
  ArrowDown,
  ArrowUp,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  GraduationCap,
  HandHeart,
  Languages,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { buttonClass, focusRing, iconButtonClass, inputClass } from "@/components/ui/styles";
import {
  DEFAULT_SECTION_TITLES,
  type EntrySection,
  type ProfilePhoto,
  type Resume,
  type ResumeProfile,
  type ResumeSection,
  type SectionType,
} from "@/data/resume";
import {
  createSection,
  newAward,
  newCertification,
  newCustomEntry,
  newEducation,
  newExperience,
  newLanguage,
  newProject,
  newVolunteering,
} from "@/lib/resumes";
import { LIMITS } from "@/lib/resume-limits";
import { Menu, type MenuItem } from "../Menu";
import { EntryList } from "./EntryList";
import { TagInput, TextArea, TextField } from "./fields";
import { PhotoField } from "./PhotoField";
import { ProfileCard } from "./ProfileCard";
import { SectionCard } from "./SectionCard";

type ContentTabProps = {
  resume: Resume;
  photoUrl: string;
  onChange: (update: (resume: Resume) => Resume) => void;
  onPhotoChange: (photo: ProfilePhoto | undefined) => void;
  openSections: Set<string>;
  onToggleSection: (id: string) => void;
  onOpenSection: (id: string) => void;
  /** Offers a just-deleted item for undo. */
  onUndoable: (message: string, restore: () => void) => void;
};

const sectionIcons: Record<SectionType, LucideIcon> = {
  summary: FileText,
  experience: BriefcaseBusiness,
  education: GraduationCap,
  projects: FolderKanban,
  skills: Wrench,
  certifications: BadgeCheck,
  languages: Languages,
  awards: Award,
  volunteering: HandHeart,
  custom: Sparkles,
};

const emptyHints: Record<SectionType, string> = {
  summary: "A short introduction",
  experience: "Jobs, internships and volunteer roles",
  education: "Degrees, courses and schools",
  projects: "Personal, academic or open-source work",
  skills: "Tools, technologies and strengths",
  certifications: "Licenses and certificates",
  languages: "Languages you speak",
  awards: "Honors and recognition",
  volunteering: "Community and volunteer work",
  custom: "Custom section",
};

const entryNouns: Record<Exclude<SectionType, "summary">, [string, string]> = {
  experience: ["position", "positions"],
  education: ["entry", "entries"],
  projects: ["project", "projects"],
  skills: ["skill", "skills"],
  certifications: ["certification", "certifications"],
  languages: ["language", "languages"],
  awards: ["award", "awards"],
  volunteering: ["role", "roles"],
  custom: ["item", "items"],
};

/** Standard sections a resume holds once each; custom sections can repeat. */
const ADDABLE: Exclude<SectionType, "custom">[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "languages",
  "awards",
  "volunteering",
];

const plural = (count: number, [one, many]: [string, string]) => `${count} ${count === 1 ? one : many}`;
const join = (...parts: (string | undefined)[]) => parts.filter((part) => part?.trim()).join(" · ");
const range = (start?: string, end?: string) => [start, end].filter((part) => part?.trim()).join(" – ");

/** Inline heading editor shown in place of a section header. Enter or blur saves; Escape cancels. */
function RenameField({ initial, placeholder, onDone }: { initial: string; placeholder: string; onDone: (title: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onDone(value.trim());
    if (event.key === "Escape") onDone(null);
  };
  return (
    <div className="min-w-0 flex-1 py-3">
      <input
        aria-label="Section heading"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => onDone(value.trim())}
        placeholder={placeholder}
        autoFocus
        maxLength={LIMITS.title}
        className={`${inputClass} h-11 text-lg font-bold`}
      />
    </div>
  );
}

function sectionSummary(section: ResumeSection): string {
  if (section.type === "summary") {
    const words = section.content.trim() ? section.content.trim().split(/\s+/).length : 0;
    return words ? plural(words, ["word", "words"]) : emptyHints.summary;
  }
  return section.entries.length ? plural(section.entries.length, entryNouns[section.type]) : emptyHints[section.type];
}

const sectionHeading = (section: ResumeSection) =>
  section.title.trim() || (section.type === "custom" ? "Untitled section" : DEFAULT_SECTION_TITLES[section.type]);

export function ContentTab({ resume, photoUrl, onChange, onPhotoChange, openSections, onToggleSection, onOpenSection, onUndoable }: ContentTabProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const { profile, sections } = resume;

  const updateProfile = (patch: Partial<ResumeProfile>) => onChange((r) => ({ ...r, profile: { ...r.profile, ...patch } }));
  const updateSection = (id: string, update: (section: ResumeSection) => ResumeSection) =>
    onChange((r) => ({ ...r, sections: r.sections.map((s) => (s.id === id ? update(s) : s)) }));
  const setEntries = <S extends EntrySection>(section: S, entries: S["entries"]) =>
    updateSection(section.id, (s) => ({ ...s, entries }) as ResumeSection);

  /** Removes a section, keeping what's needed to put it back in the same place. */
  const removeSection = (section: ResumeSection, index: number) => {
    const neighbour = sections[index + 1] ?? sections[index - 1];
    onChange((r) => ({ ...r, sections: r.sections.filter((s) => s.id !== section.id) }));
    // The menu that held focus is about to disappear with its section.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[id="section-${neighbour?.id}"] h2 button`)?.focus());
    onUndoable(`“${sectionHeading(section)}” deleted`, () =>
      onChange((r) => ({ ...r, sections: [...r.sections.slice(0, index), section, ...r.sections.slice(index)] })),
    );
  };

  /** Puts a deleted entry back where it was, if its section is still there. */
  const entryDeleted =
    <T,>(section: ResumeSection) =>
    (item: T, index: number, title: string) =>
      onUndoable(`“${title}” deleted`, () =>
        onChange((r) => ({
          ...r,
          sections: r.sections.map((s) =>
            s.id === section.id && "entries" in s ? ({ ...s, entries: [...s.entries.slice(0, index), item, ...s.entries.slice(index)] } as ResumeSection) : s,
          ),
        })),
      );

  const moveSection = (index: number, offset: number) =>
    onChange((r) => {
      const next = [...r.sections];
      const [moved] = next.splice(index, 1);
      next.splice(index + offset, 0, moved);
      return { ...r, sections: next };
    });

  const addSection = (type: SectionType) => {
    const section = createSection(type);
    onChange((r) => ({ ...r, sections: [...r.sections, section] }));
    onOpenSection(section.id);
    // Custom sections start untitled, so ask for a name straight away.
    if (type === "custom") setRenamingId(section.id);
  };

  const present = new Set(sections.map((s) => s.type));
  const addItems: MenuItem[] = [
    ...ADDABLE.filter((type) => !present.has(type)).map((type) => ({
      label: DEFAULT_SECTION_TITLES[type],
      icon: sectionIcons[type],
      onSelect: () => addSection(type),
    })),
    { label: "Custom section", description: "Publications, interests, anything else", icon: Sparkles, onSelect: () => addSection("custom") },
  ];

  function renderBody(section: ResumeSection) {
    switch (section.type) {
      case "summary":
        return (
          <TextArea
            label="Summary"
            value={section.content}
            onChange={(content) => updateSection(section.id, (s) => ({ ...s, content }) as ResumeSection)}
            rows={5}
            placeholder="Two to four sentences about your experience, strengths and what you are looking for."
            hint="Keep it short; recruiters usually skim this first."
          />
        );
      case "experience":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newExperience}
            itemName="position"
            getTitle={(job) => job.role}
            getSubtitle={(job) => join(job.company, range(job.startDate, job.endDate))}
            renderFields={(job, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Job title" value={job.role} onChange={(role) => set({ role })} placeholder="e.g. Product Designer" autoFocus={isNew} />
                <TextField label="Company" value={job.company} onChange={(company) => set({ company })} placeholder="e.g. Acme Inc." />
                <TextField label="Location" value={job.location ?? ""} onChange={(location) => set({ location })} placeholder="City, State or Remote" className="sm:col-span-2" />
                <TextField label="Start date" value={job.startDate ?? ""} onChange={(startDate) => set({ startDate })} placeholder="e.g. Mar 2021" />
                <TextField label="End date" value={job.endDate ?? ""} onChange={(endDate) => set({ endDate })} placeholder="e.g. Present" />
                <TextArea
                  label="Achievements and responsibilities"
                  value={job.highlights.join("\n")}
                  onChange={(value) => set({ highlights: value.split("\n") })}
                  maxLines={LIMITS.lines}
                  rows={5}
                  placeholder={"Led a redesign that increased sign-ups by 20%\nManaged a team of four designers"}
                  hint="One bullet point per line."
                  className="sm:col-span-2"
                />
              </div>
            )}
          />
        );
      case "volunteering":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newVolunteering}
            itemName="role"
            getTitle={(item) => item.role}
            getSubtitle={(item) => join(item.organization, range(item.startDate, item.endDate))}
            renderFields={(item, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Role" value={item.role} onChange={(role) => set({ role })} placeholder="e.g. Volunteer Tutor" autoFocus={isNew} />
                <TextField label="Organization" value={item.organization} onChange={(organization) => set({ organization })} placeholder="e.g. City Library" />
                <TextField label="Location" value={item.location ?? ""} onChange={(location) => set({ location })} className="sm:col-span-2" />
                <TextField label="Start date" value={item.startDate ?? ""} onChange={(startDate) => set({ startDate })} placeholder="e.g. 2022" />
                <TextField label="End date" value={item.endDate ?? ""} onChange={(endDate) => set({ endDate })} placeholder="e.g. Present" />
                <TextArea
                  label="What you did"
                  value={item.highlights.join("\n")}
                  onChange={(value) => set({ highlights: value.split("\n") })}
                  maxLines={LIMITS.lines}
                  rows={4}
                  hint="One bullet point per line."
                  className="sm:col-span-2"
                />
              </div>
            )}
          />
        );
      case "education":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newEducation}
            itemName="education"
            getTitle={(edu) => edu.degree}
            getSubtitle={(edu) => join(edu.school, range(edu.startDate, edu.endDate))}
            renderFields={(edu, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Degree or qualification" value={edu.degree} onChange={(degree) => set({ degree })} placeholder="e.g. B.S. Computer Science" autoFocus={isNew} className="sm:col-span-2" />
                <TextField label="School" value={edu.school} onChange={(school) => set({ school })} placeholder="e.g. University of Michigan" className="sm:col-span-2" />
                <TextField label="Start date" value={edu.startDate ?? ""} onChange={(startDate) => set({ startDate })} placeholder="e.g. 2016" />
                <TextField label="End date" value={edu.endDate ?? ""} onChange={(endDate) => set({ endDate })} placeholder="e.g. 2020" />
                <TextField label="Details" value={edu.details ?? ""} onChange={(details) => set({ details })} placeholder="e.g. Graduated with honors, GPA 3.8" className="sm:col-span-2" />
              </div>
            )}
          />
        );
      case "projects":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newProject}
            itemName="project"
            getTitle={(project) => project.name}
            getSubtitle={(project) => project.role ?? ""}
            renderFields={(project, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Project name" value={project.name} onChange={(name) => set({ name })} placeholder="e.g. Budget tracker app" autoFocus={isNew} />
                <TextField label="Role or technologies" value={project.role ?? ""} onChange={(role) => set({ role })} placeholder="e.g. React, Node.js" />
                <TextField label="Link" value={project.link ?? ""} onChange={(link) => set({ link })} placeholder="e.g. github.com/you/project" className="sm:col-span-2" />
                <TextField label="Start date" value={project.startDate ?? ""} onChange={(startDate) => set({ startDate })} placeholder="e.g. 2023" />
                <TextField label="End date" value={project.endDate ?? ""} onChange={(endDate) => set({ endDate })} placeholder="e.g. 2024" />
                <TextArea label="Description" value={project.description ?? ""} onChange={(description) => set({ description })} rows={3} placeholder="What it does and what you achieved." className="sm:col-span-2" />
              </div>
            )}
          />
        );
      case "skills":
        return (
          <TagInput
            label="Add a skill"
            itemName="skill"
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            placeholder="e.g. Project management"
          />
        );
      case "certifications":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newCertification}
            itemName="certification"
            getTitle={(cert) => cert.name}
            getSubtitle={(cert) => join(cert.issuer, cert.date)}
            renderFields={(cert, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Certification" value={cert.name} onChange={(name) => set({ name })} placeholder="e.g. Google Analytics Certification" autoFocus={isNew} className="sm:col-span-2" />
                <TextField label="Issuer" value={cert.issuer ?? ""} onChange={(issuer) => set({ issuer })} placeholder="e.g. Google" />
                <TextField label="Date" value={cert.date ?? ""} onChange={(date) => set({ date })} placeholder="e.g. 2024" />
              </div>
            )}
          />
        );
      case "languages":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newLanguage}
            itemName="language"
            getTitle={(language) => language.name}
            getSubtitle={(language) => language.proficiency ?? ""}
            renderFields={(language, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Language" value={language.name} onChange={(name) => set({ name })} placeholder="e.g. Spanish" autoFocus={isNew} />
                <TextField label="Proficiency" value={language.proficiency ?? ""} onChange={(proficiency) => set({ proficiency })} placeholder="e.g. Fluent" />
              </div>
            )}
          />
        );
      case "awards":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newAward}
            itemName="award"
            getTitle={(award) => award.title}
            getSubtitle={(award) => join(award.issuer, award.date)}
            renderFields={(award, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Award" value={award.title} onChange={(title) => set({ title })} placeholder="e.g. Employee of the Year" autoFocus={isNew} className="sm:col-span-2" />
                <TextField label="Issuer" value={award.issuer ?? ""} onChange={(issuer) => set({ issuer })} placeholder="e.g. Acme Inc." />
                <TextField label="Date" value={award.date ?? ""} onChange={(date) => set({ date })} placeholder="e.g. 2023" />
                <TextArea label="Description" value={award.description ?? ""} onChange={(description) => set({ description })} rows={2} className="sm:col-span-2" />
              </div>
            )}
          />
        );
      case "custom":
        return (
          <EntryList
            items={section.entries}
            onChange={(entries) => setEntries(section, entries)}
            onDeleted={entryDeleted(section)}
            create={newCustomEntry}
            itemName="item"
            getTitle={(item) => item.title}
            getSubtitle={(item) => join(item.subtitle, item.date)}
            renderFields={(item, set, isNew) => (
              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField label="Title" value={item.title} onChange={(title) => set({ title })} placeholder="e.g. Volunteer Tutor" autoFocus={isNew} />
                <TextField label="Subtitle" value={item.subtitle ?? ""} onChange={(subtitle) => set({ subtitle })} placeholder="e.g. City Library" />
                <TextField label="Date" value={item.date ?? ""} onChange={(date) => set({ date })} placeholder="e.g. 2022 – Present" className="sm:col-span-2" />
                <TextArea label="Description" value={item.description ?? ""} onChange={(description) => set({ description })} rows={3} className="sm:col-span-2" />
              </div>
            )}
          />
        );
    }
  }

  return (
    <div className="space-y-3.5 p-4 sm:p-5">
      <ProfileCard profile={profile} photoUrl={photoUrl} editing={openSections.has("personal")} onToggle={() => onToggleSection("personal")}>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PhotoField value={photoUrl} hasPhoto={!!profile.photo} onChange={onPhotoChange} />
          </div>
          <TextField label="Full name" value={profile.fullName} onChange={(fullName) => updateProfile({ fullName })} placeholder="e.g. Alex Morgan" autoComplete="name" />
          <TextField label="Job title" value={profile.jobTitle} onChange={(jobTitle) => updateProfile({ jobTitle })} placeholder="e.g. Marketing Manager" autoComplete="organization-title" />
          <TextField label="Email" type="email" value={profile.email} onChange={(email) => updateProfile({ email })} placeholder="alex@email.com" autoComplete="email" />
          <TextField label="Phone" type="tel" value={profile.phone} onChange={(phone) => updateProfile({ phone })} placeholder="(555) 123-4567" autoComplete="tel" />
          <TextField label="Location" value={profile.location} onChange={(location) => updateProfile({ location })} placeholder="City, State" className="sm:col-span-2" />
          <TextField label="LinkedIn" value={profile.linkedin ?? ""} onChange={(linkedin) => updateProfile({ linkedin })} placeholder="linkedin.com/in/alexmorgan" />
          <TextField label="GitHub" value={profile.github ?? ""} onChange={(github) => updateProfile({ github })} placeholder="github.com/alexmorgan" />
          <TextField label="Website" value={profile.website ?? ""} onChange={(website) => updateProfile({ website })} placeholder="alexmorgan.com" className="sm:col-span-2" />
        </div>
      </ProfileCard>

      {sections.map((section, index) => {
        const heading = sectionHeading(section);
        const options: MenuItem[] = [
          { label: "Rename section", icon: Pencil, onSelect: () => setRenamingId(section.id) },
          section.visible
            ? { label: "Hide from resume", icon: EyeOff, onSelect: () => updateSection(section.id, (s) => ({ ...s, visible: false })) }
            : { label: "Show on resume", icon: Eye, onSelect: () => updateSection(section.id, (s) => ({ ...s, visible: true })) },
          ...(index > 0 ? [{ label: "Move up", icon: ArrowUp, onSelect: () => moveSection(index, -1) }] : []),
          ...(index < sections.length - 1 ? [{ label: "Move down", icon: ArrowDown, onSelect: () => moveSection(index, 1) }] : []),
          "separator",
          {
            label: "Delete section",
            icon: Trash2,
            danger: true,
            onSelect: () => removeSection(section, index),
          },
        ];
        const renaming = renamingId === section.id;
        return (
          <SectionCard
            key={section.id}
            id={section.id}
            title={heading}
            icon={sectionIcons[section.type]}
            summary={sectionSummary(section)}
            badge={section.visible ? undefined : "Hidden"}
            open={openSections.has(section.id)}
            onToggle={() => onToggleSection(section.id)}
            headerOverride={
              renaming ? (
                <RenameField
                  initial={section.title}
                  placeholder={section.type === "custom" ? "e.g. Publications" : DEFAULT_SECTION_TITLES[section.type]}
                  onDone={(title) => {
                    if (title !== null) updateSection(section.id, (s) => ({ ...s, title }));
                    setRenamingId(null);
                  }}
                />
              ) : undefined
            }
            actions={
              <>
                {openSections.has(section.id) && !renaming && (
                  <button
                    type="button"
                    onClick={() => setRenamingId(section.id)}
                    aria-label={`Rename ${heading} section`}
                    className={`hidden h-8 rounded-full border border-line px-3 text-[0.875rem] font-medium text-ink-soft hover:border-ink/35 min-[400px]:block ${focusRing}`}
                  >
                    Rename
                  </button>
                )}
                <Menu
                  label={`Section options for ${heading}`}
                  align="end"
                  items={options}
                  triggerClassName={iconButtonClass}
                  trigger={<MoreHorizontal aria-hidden="true" className="size-5" />}
                />
              </>
            }
          >
            {renderBody(section)}
          </SectionCard>
        );
      })}

      {sections.length < LIMITS.sections ? (
        <Menu
          label="Add section"
          items={addItems}
          menuClassName="w-72"
          triggerClassName={buttonClass("secondary", "lg", "h-14 w-full")}
          trigger={
            <>
              <Plus aria-hidden="true" className="size-5" />
              Add section
            </>
          }
        />
      ) : (
        <p role="status" className="text-center text-[0.875rem] font-medium text-[#b42318]">
          Limit reached: {LIMITS.sections} sections maximum
        </p>
      )}
    </div>
  );
}

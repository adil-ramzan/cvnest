"use client";

import { Mail, MapPin, Pencil, Phone, X } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/styles";
import type { ResumeProfile } from "@/data/resume";

type ProfileCardProps = {
  profile: ResumeProfile;
  photoUrl: string;
  editing: boolean;
  onToggle: () => void;
  /** The full personal details form. */
  children: ReactNode;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Summary of the personal details; the Edit button expands the full form underneath. */
export function ProfileCard({ profile, photoUrl, editing, onToggle, children }: ProfileCardProps) {
  const name = profile.fullName.trim();
  const rows = [
    { icon: Mail, value: profile.email },
    { icon: Phone, value: profile.phone },
    { icon: MapPin, value: profile.location },
  ].filter((row) => row.value.trim());

  return (
    <section id="section-personal" aria-label="Personal information" className="scroll-mt-2 rounded-[22px] bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-lg font-bold text-accent-ink">
          {photoUrl ? <img src={photoUrl} alt="" className="size-full object-cover" /> : initials(name) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-lg font-bold ${name ? "text-ink" : "text-muted"}`}>{name || "Add your name"}</p>
          <p className="truncate text-[0.875rem] text-muted">{profile.jobTitle.trim() || "Job title and contact details"}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={editing}
          aria-controls="personal-form"
          className={buttonClass("secondary", "sm", "h-9 shrink-0 px-3.5")}
        >
          {editing ? <X aria-hidden="true" className="size-4" /> : <Pencil aria-hidden="true" className="size-4" />}
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {rows.length > 0 && !editing && (
        <ul className="mt-3.5 grid gap-1.5 text-[0.875rem] text-ink-soft">
          {rows.map(({ icon: Icon, value }) => (
            <li key={value} className="flex min-w-0 items-center gap-2.5">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-accent" />
              <span className="truncate">{value}</span>
            </li>
          ))}
        </ul>
      )}

      <div id="personal-form" hidden={!editing} className="mt-5 border-t border-line pt-5">
        {children}
      </div>
    </section>
  );
}

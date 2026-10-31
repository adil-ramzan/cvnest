import { Globe, Link2, type LucideIcon, Mail, MapPin, Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { SectionType } from "@/data/resume";
import { joinParts, type PreparedResume, type RenderSection } from "../prepareResume";
import { fontStacks, type HeadingStyle, type SidebarSection, type TemplateDesign } from "./design";

// Colors and fonts come from CSS variables set on the article (and overridden on
// sidebars and banners), so every part below works on light or dark backgrounds.
const C = {
  ink: "[color:var(--t-ink)]",
  muted: "[color:var(--t-muted)]",
  accent: "[color:var(--t-accent)]",
  onAccent: "[color:var(--t-on-accent)]",
  bgAccent: "[background-color:var(--t-accent)]",
  bgTint: "[background-color:var(--t-tint)]",
  bgRule: "[background-color:var(--t-rule)]",
  rule: "[border-color:var(--t-rule)]",
  accentRule: "[border-color:var(--t-accent)]",
  inkRule: "[border-color:var(--t-ink)]",
  headingFont: "[font-family:var(--t-heading-font)]",
  bodyFont: "[font-family:var(--t-body-font)]",
};

const densities = {
  relaxed: {
    page: "px-16 py-14",
    side: "px-9 py-14",
    sideBleed: "-mx-9 -mt-14 px-9 pt-14 pb-7",
    band: "[&>section:nth-child(even)]:-mx-16 [&>section:nth-child(even)]:px-16 [&>section:nth-child(even)]:py-4",
    banner: "px-16 py-11",
    sections: "gap-7",
    head: "mb-3.5",
    entries: "space-y-5",
    timeline: "pb-5",
    body: "text-sm leading-relaxed",
    small: "text-xs",
    title: "text-base",
    bullets: "space-y-1.5",
    header: "mb-9",
  },
  normal: {
    page: "px-14 py-12",
    side: "px-8 py-12",
    sideBleed: "-mx-8 -mt-12 px-8 pt-12 pb-7",
    band: "[&>section:nth-child(even)]:-mx-14 [&>section:nth-child(even)]:px-14 [&>section:nth-child(even)]:py-4",
    banner: "px-14 py-10",
    sections: "gap-6",
    head: "mb-3",
    entries: "space-y-4",
    timeline: "pb-4",
    body: "text-xs leading-relaxed",
    small: "text-2xs",
    title: "text-sm",
    bullets: "space-y-1",
    header: "mb-8",
  },
  compact: {
    page: "px-10 py-9",
    side: "px-6 py-9",
    sideBleed: "-mx-6 -mt-9 px-6 pt-9 pb-5",
    band: "[&>section:nth-child(even)]:-mx-10 [&>section:nth-child(even)]:px-10 [&>section:nth-child(even)]:py-2.5",
    banner: "px-10 py-7",
    sections: "gap-4",
    head: "mb-2",
    entries: "space-y-2.5",
    timeline: "pb-2.5",
    body: "text-xs leading-snug",
    small: "text-2xs",
    title: "text-xs",
    bullets: "space-y-0.5",
    header: "mb-5",
  },
};

type Density = (typeof densities)[keyof typeof densities];
type Area = "main" | "side";
type Theme = { d: TemplateDesign; r: PreparedResume; dens: Density };

// ---------------------------------------------------------------------------
// Headings

function Heading({ title, style, t }: { title: string; style: HeadingStyle; t: Theme }) {
  const caps = "text-2xs font-semibold tracking-[0.16em] uppercase";
  const mb = t.dens.head;

  switch (style) {
    case "rule":
      return <h2 className={`${mb} border-b ${C.inkRule} pb-1 ${caps} ${C.ink} ${C.headingFont}`}>{title}</h2>;
    case "double":
      return (
        <h2 className={`${mb} border-y ${C.inkRule} py-1 text-center ${caps} tracking-[0.24em] ${C.ink} ${C.headingFont}`}>
          {title}
        </h2>
      );
    case "caps":
      return <h2 className={`${mb} text-2xs font-bold tracking-[0.18em] uppercase ${C.accent} ${C.headingFont}`}>{title}</h2>;
    case "line-after":
      return (
        <h2 className={`${mb} flex items-center gap-3 ${caps} ${C.accent} ${C.headingFont}`}>
          <span className="min-w-0">{title}</span>
          <span className={`h-px min-w-6 flex-1 ${C.bgRule}`} />
        </h2>
      );
    case "bar":
      return (
        <h2 className={`${mb} flex items-stretch gap-2.5 text-sm font-semibold ${C.ink} ${C.headingFont}`}>
          <span className={`w-1 shrink-0 ${C.bgAccent}`} />
          <span>{title}</span>
        </h2>
      );
    case "underline":
      return (
        <h2 className={`${mb} text-sm font-semibold ${C.ink} ${C.headingFont}`}>
          {title}
          <span className={`mt-1.5 block h-0.5 w-8 ${C.bgAccent}`} />
        </h2>
      );
    case "pill":
      return (
        <h2 className={`${mb} ${C.bgTint} px-2.5 py-1 text-2xs font-bold tracking-[0.16em] uppercase ${C.accent} ${C.headingFont}`}>
          {title}
        </h2>
      );
    case "serif":
      return (
        <h2 className={`${mb} border-b ${C.rule} pb-1 text-lg font-semibold ${C.accent} ${C.headingFont}`}>{title}</h2>
      );
    case "boxed":
      return (
        <h2 className={`${mb} ${C.bgAccent} px-2.5 py-1 text-2xs font-semibold tracking-[0.2em] uppercase ${C.onAccent} ${C.headingFont}`}>
          {title}
        </h2>
      );
    case "dot":
      return (
        <h2 className={`${mb} flex items-center gap-2 ${caps} ${C.ink} ${C.headingFont}`}>
          <span className={`size-1.5 shrink-0 rounded-full ${C.bgAccent}`} />
          {title}
        </h2>
      );
    case "band-center":
      return (
        <h2 className={`${mb} ${C.bgTint} py-1 text-center text-2xs font-semibold tracking-[0.2em] uppercase ${C.ink} ${C.headingFont}`}>
          {title}
        </h2>
      );
    case "overline":
      return <h2 className={`${mb} border-t-2 ${C.inkRule} pt-1.5 text-xs font-bold ${C.ink} ${C.headingFont}`}>{title}</h2>;
    case "tab":
      return (
        <h2 className={`${mb} border-b-2 ${C.accentRule} ${C.headingFont}`}>
          <span className={`inline-block ${C.bgAccent} px-3 py-0.5 text-2xs font-semibold tracking-[0.14em] uppercase ${C.onAccent}`}>
            {title}
          </span>
        </h2>
      );
    case "flanked":
      return (
        <h2 className={`${mb} flex items-center gap-3 ${caps} tracking-[0.24em] ${C.accent} ${C.headingFont}`}>
          <span className={`h-px min-w-4 flex-1 ${C.bgRule}`} />
          <span className="min-w-0 text-center">{title}</span>
          <span className={`h-px min-w-4 flex-1 ${C.bgRule}`} />
        </h2>
      );
    case "display":
      return <h2 className={`${mb} text-xl font-light tracking-tight ${C.accent} ${C.headingFont}`}>{title}</h2>;
    case "slab":
      return <h2 className={`${mb} text-base font-black tracking-wide uppercase ${C.ink} ${C.headingFont}`}>{title}</h2>;
    case "right-rule":
      return <h2 className={`${mb} border-b ${C.rule} pb-1 text-right ${caps} ${C.accent} ${C.headingFont}`}>{title}</h2>;
    case "outline-box":
      return (
        <h2 className={`${mb} inline-block border ${C.accentRule} px-2.5 py-0.5 ${caps} ${C.accent} ${C.headingFont}`}>{title}</h2>
      );
    case "dotted":
      return <h2 className={`${mb} border-b-2 border-dotted ${C.accentRule} pb-1 text-sm font-bold ${C.ink} ${C.headingFont}`}>{title}</h2>;
    case "thick-under":
      return <h2 className={`${mb} border-b-4 ${C.accentRule} pb-1 text-sm font-bold ${C.ink} ${C.headingFont}`}>{title}</h2>;
    case "corner":
      return (
        <h2 className={`${mb} border-b-2 border-l-2 ${C.accentRule} py-0.5 pl-2 ${caps} ${C.ink} ${C.headingFont}`}>{title}</h2>
      );
  }
}

function Section({ title, t, area, children }: { title: string; t: Theme; area: Area; children: ReactNode }) {
  if (t.d.layout === "labels" && area === "main") {
    return (
      <section className={`grid grid-cols-[22%_minmax(0,1fr)] gap-5 border-t ${C.rule} pt-4`}>
        <h2 className={`text-2xs font-semibold tracking-[0.14em] uppercase ${C.accent} ${C.headingFont}`}>{title}</h2>
        <div className="min-w-0">{children}</div>
      </section>
    );
  }
  const style = area === "side" ? (t.d.sideHeading ?? t.d.heading) : t.d.heading;
  if (t.d.sectionRules && area === "main") {
    return (
      <section className={`min-w-0 border-l-2 ${C.accentRule} pl-5`}>
        <Heading title={title} style={style} t={t} />
        {children}
      </section>
    );
  }
  if (t.d.sectionCards && area === "main") {
    return (
      <section className={`min-w-0 rounded-md border ${C.rule} px-5 py-4`} style={{ backgroundColor: t.d.colors.card }}>
        <Heading title={title} style={style} t={t} />
        {children}
      </section>
    );
  }
  return (
    <section className="min-w-0">
      <Heading title={title} style={style} t={t} />
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Entries

type EntryData = { key: string; title: string; subtitle: string; dates: string; bullets: string[]; text: string };

function Bullets({ items, t }: { items: string[]; t: Theme }) {
  const { bullets } = t.d;
  const base = `mt-1.5 ${t.dens.body} ${t.dens.bullets}`;

  if (bullets === "disc") {
    return (
      <ul className={`${base} list-disc pl-4 marker:[color:var(--t-muted)]`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  const marker = {
    dash: <span className={`absolute left-0 ${C.muted}`}>–</span>,
    arrow: <span className={`absolute left-0 font-semibold ${C.accent}`}>›</span>,
    square: <span className={`absolute top-[0.6em] left-0 size-1 ${C.bgAccent}`} />,
    ring: <span className={`absolute top-[0.5em] left-0 size-1.5 rounded-full border ${C.accentRule}`} />,
    dot: <span className={`absolute top-[0.6em] left-0 size-1 rounded-full ${C.bgAccent}`} />,
    none: null,
  }[bullets];

  return (
    <ul className={base}>
      {items.map((item, i) => (
        <li key={i} className={marker ? "relative pl-3.5" : ""}>
          {marker && <span aria-hidden="true">{marker}</span>}
          {item}
        </li>
      ))}
    </ul>
  );
}

function Entry({ e, t, area }: { e: EntryData; t: Theme; area: Area }) {
  const { d, dens } = t;
  const placement = area === "side" ? "below" : d.layout === "timeline" ? "timeline" : d.dates;
  const subtitleClass = {
    muted: C.muted,
    accent: `${C.accent} font-medium`,
    italic: `${C.muted} italic`,
  }[d.subtitleStyle ?? "muted"];

  const inline = d.entryStyle === "inline" && area === "main" && !!e.title;
  const datesInline = placement === "inline";
  const subtitleText = datesInline ? [e.subtitle, e.dates].filter(Boolean).join(" · ") : e.subtitle;
  const title = e.title && (
    <h3 className={`${dens.title} font-semibold ${C.ink}`}>
      {e.title}
      {inline && subtitleText && <span className={`font-normal ${subtitleClass}`}>, {subtitleText}</span>}
    </h3>
  );
  const subtitle = !inline && subtitleText && <p className={`${dens.body} ${subtitleClass}`}>{subtitleText}</p>;
  const dates =
    e.dates &&
    (placement === "chip" ? (
      <span className={`${dens.small} shrink-0 rounded-full ${C.bgTint} px-2 py-px ${C.ink} tabular-nums`}>{e.dates}</span>
    ) : (
      <span className={`${dens.small} shrink-0 ${C.muted} tabular-nums`}>{e.dates}</span>
    ));
  const details = (
    <>
      {e.bullets.length > 0 && <Bullets items={e.bullets} t={t} />}
      {e.text && <p className={`mt-1 ${dens.body} whitespace-pre-line${inline ? " entry-detail" : ""}`}>{e.text}</p>}
    </>
  );

  switch (placement) {
    case "right":
    case "chip":
      return (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            {title || subtitle}
            {dates}
          </div>
          {title && subtitle}
          {details}
        </div>
      );
    case "left":
      return (
        <div className="grid grid-cols-[20%_minmax(0,1fr)] gap-4">
          <div className="pt-0.5">{dates}</div>
          <div className="min-w-0">
            {title}
            {subtitle}
            {details}
          </div>
        </div>
      );
    case "inline":
      return (
        <div>
          {title}
          {subtitle}
          {details}
        </div>
      );
    case "timeline":
      return (
        <div className="grid grid-cols-[17%_minmax(0,1fr)] gap-4">
          <div className="pt-0.5 text-right">{dates}</div>
          <div className={`relative min-w-0 border-l ${C.rule} pl-5 ${dens.timeline}`}>
            <span aria-hidden="true" className={`absolute top-1.5 -left-1 size-2 rounded-full ${C.bgAccent}`} />
            {title}
            {subtitle}
            {details}
          </div>
        </div>
      );
    default:
      return (
        <div>
          {title}
          {subtitle}
          {e.dates && <p className={`mt-0.5 ${dens.small} ${C.muted}`}>{e.dates}</p>}
          {details}
        </div>
      );
  }
}

function EntryList({ entries, t, area }: { entries: EntryData[]; t: Theme; area: Area }) {
  const spacing = t.d.layout === "timeline" && area === "main" ? "" : t.dens.entries;
  if (t.d.entryStyle === "ruled" && area === "main") {
    return (
      <div className={`${spacing} [&>*+*]:border-t [&>*+*]:border-[color:var(--t-rule)] [&>*+*]:pt-2.5`}>
        {entries.map((e) => (
          <Entry key={e.key} e={e} t={t} area={area} />
        ))}
      </div>
    );
  }
  return (
    <div className={spacing}>
      {entries.map((e) => (
        <Entry key={e.key} e={e} t={t} area={area} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lists, skills and contact details

function SkillList({ items, t, area }: { items: string[]; t: Theme; area: Area }) {
  const style = area === "side" && (t.d.skills === "inline" || t.d.skills === "columns" || t.d.skills === "grid" || t.d.skills === "pipe") ? "list" : t.d.skills;
  const { body, small } = t.dens;

  switch (style) {
    case "inline":
      return <p className={body}>{items.join("  ·  ")}</p>;
    case "pipe":
      return <p className={body}>{items.join("  |  ")}</p>;
    case "tags":
      return (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li key={i} className={`${C.bgTint} rounded-[3px] px-2 py-0.5 ${small} ${C.ink}`}>
              {item}
            </li>
          ))}
        </ul>
      );
    case "outline":
      return (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li key={i} className={`rounded-full border ${C.accentRule} px-2.5 py-px ${small} ${C.ink}`}>
              {item}
            </li>
          ))}
        </ul>
      );
    case "grid":
      return (
        <ul className={`grid grid-cols-2 gap-x-6 ${body}`}>
          {items.map((item, i) => (
            <li key={i} className={`border-b ${C.rule} py-0.5`}>
              {item}
            </li>
          ))}
        </ul>
      );
    case "columns":
      return (
        <ul className={`grid grid-cols-3 gap-x-4 gap-y-1 ${body}`}>
          {items.map((item, i) => (
            <li key={i} className="relative pl-3">
              <span aria-hidden="true" className={`absolute top-[0.6em] left-0 size-1 rounded-full ${C.bgAccent}`} />
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ul className={`${body} space-y-1`}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
  }
}

const contactEntries = (r: PreparedResume): { icon: LucideIcon; value: string }[] =>
  [
    { icon: Mail, value: r.contact.email },
    { icon: Phone, value: r.contact.phone },
    { icon: MapPin, value: r.contact.location },
    { icon: Link2, value: r.contact.linkedin },
    { icon: Link2, value: r.contact.github },
    { icon: Globe, value: r.contact.website },
  ].filter((item) => item.value);

function ContactDetails({ t, mode, align = "start" }: { t: Theme; mode: "inline" | "stacked"; align?: "start" | "center" | "end" }) {
  if (mode === "inline" && t.d.contactGrid) {
    return (
      <ul className={`grid grid-cols-2 gap-x-6 gap-y-1 ${t.dens.small} ${C.muted}`}>
        {contactEntries(t.r).map(({ icon: Icon, value }, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
            {t.d.contactIcons && <Icon aria-hidden="true" className={`size-[1.1em] shrink-0 ${C.accent}`} />}
            <span className="min-w-0">{value}</span>
          </li>
        ))}
      </ul>
    );
  }
  const items = contactEntries(t.r);
  if (!items.length) return null;
  const icons = t.d.contactIcons;
  const size = mode === "stacked" ? t.dens.body : t.dens.small;

  if (mode === "stacked") {
    return (
      <ul className={`${size} space-y-1.5 ${C.ink} ${align === "end" ? "text-right" : ""}`}>
        {items.map(({ icon: Icon, value }, i) => (
          <li key={i} className={`flex items-start gap-2 [overflow-wrap:anywhere] ${align === "end" ? "justify-end" : ""}`}>
            {icons && <Icon aria-hidden="true" className={`mt-[0.2em] size-[1.05em] shrink-0 ${C.accent}`} />}
            <span>{value}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={`flex flex-wrap gap-x-4 gap-y-1 ${size} ${C.muted} ${align === "center" ? "justify-center" : ""}`}
    >
      {items.map(({ icon: Icon, value }, i) => (
        <li key={i} className="flex items-center gap-1.5 [overflow-wrap:anywhere]">
          {icons ? (
            <Icon aria-hidden="true" className={`size-[1.1em] shrink-0 ${C.accent}`} />
          ) : (
            i > 0 && (
              <span aria-hidden="true" className="-ml-2.5 opacity-60">
                ·
              </span>
            )
          )}
          {value}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Sections

function renderSection(section: RenderSection, t: Theme, area: Area): ReactNode {
  const { dens } = t;
  let body: ReactNode;

  if (section.kind === "text") {
    body = <p className={`${dens.body} whitespace-pre-line`}>{section.text}</p>;
  } else if (section.kind === "list") {
    if (section.type === "skills") {
      body = <SkillList items={section.items} t={t} area={area} />;
    } else if (section.type === "languages" && area === "main") {
      body = <p className={dens.body}>{section.items.join("  ·  ")}</p>;
    } else {
      body = (
        <ul className={`${dens.body} space-y-1`}>
          {section.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
  } else {
    const withLocation = section.type === "experience" || section.type === "volunteering";
    body = (
      <EntryList
        t={t}
        area={area}
        entries={section.entries.map((entry) => ({
          key: entry.id,
          title: entry.title,
          subtitle: withLocation ? joinParts([entry.subtitle, entry.location], ", ") : joinParts([entry.subtitle, entry.link], " · "),
          dates: entry.dates,
          bullets: entry.bullets,
          text: entry.text,
        }))}
      />
    );
  }

  return (
    <Section key={section.id} title={section.title} t={t} area={area}>
      {body}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Header

const photoSizes = { sm: "size-16 text-xl", md: "size-24 text-2xl", lg: "size-32 text-3xl" };
const photoShapes = { circle: "rounded-full", rounded: "rounded-[14%]", square: "rounded-[2%]" };

function Photo({ t, size }: { t: Theme; size: keyof typeof photoSizes }) {
  const photo = t.d.photo;
  if (!photo || (!t.r.photo && photo.mode === "if-present")) return null;
  const className = `${photoSizes[size]} ${photoShapes[photo.shape]} shrink-0`;

  if (t.r.photo) {
    return <img src={t.r.photo} alt="" className={`${className} object-cover`} />;
  }
  return (
    <div
      aria-hidden="true"
      className={`${className} flex items-center justify-center font-semibold ${C.bgAccent} ${C.onAccent} ${C.headingFont}`}
    >
      {t.r.initials}
    </div>
  );
}

function Monogram({ t }: { t: Theme }) {
  return (
    <div
      aria-hidden="true"
      className={`flex size-20 shrink-0 items-center justify-center rounded-full border-2 ${C.accentRule} text-2xl font-semibold ${C.accent} ${C.headingFont}`}
    >
      {t.r.initials}
    </div>
  );
}

function NameBlock({ t, align = "start", compactName = false }: { t: Theme; align?: "start" | "center"; compactName?: boolean }) {
  const { d, r } = t;
  const n = d.name ?? {};
  const size = compactName ? "text-3xl" : { md: "text-3xl", lg: "text-4xl", xl: "text-5xl" }[n.size ?? (d.density === "compact" ? "md" : "lg")];
  const weight = { light: "font-light", normal: "font-normal", semibold: "font-semibold", bold: "font-bold", black: "font-black" }[n.weight ?? "semibold"];
  const tracking = { tight: "tracking-tight", normal: "", wide: "tracking-[0.05em]" }[n.tracking ?? (n.upper ? "wide" : "tight")];
  const titleClass = {
    accent: `mt-1 ${d.density === "compact" ? "text-sm" : "text-base"} font-medium ${C.accent}`,
    muted: `mt-1 ${d.density === "compact" ? "text-sm" : "text-base"} ${C.muted}`,
    caps: `mt-1.5 text-xs font-medium tracking-[0.22em] uppercase ${C.muted}`,
  }[d.titleStyle ?? "muted"];

  const [firstName, ...otherNames] = r.name.split(" ");
  const nameText =
    n.stack && otherNames.length > 0 ? (
      <>
        <span className="block">{firstName}</span> <span className="block">{otherNames.join(" ")}</span>
      </>
    ) : (
      r.name
    );
  const heading = (
    <h1
      className={`${size} ${weight} ${tracking} leading-[1.1] ${n.upper ? "uppercase" : ""} ${n.accent ? C.accent : C.ink} ${C.headingFont} [overflow-wrap:anywhere]${n.smallCaps ? " [font-variant-caps:small-caps]" : ""}`}
    >
      {nameText}
    </h1>
  );

  if (n.inlineTitle) {
    return (
      <div className={`flex min-w-0 flex-wrap items-baseline gap-x-3 ${align === "center" ? "justify-center text-center" : ""}`}>
        {heading}
        {r.title && <p className={`${titleClass} mt-0!`}>{r.title}</p>}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${align === "center" ? "text-center" : ""}`}>
      {heading}
      {r.title && <p className={titleClass}>{r.title}</p>}
    </div>
  );
}

function Header({ t, showContact }: { t: Theme; showContact: boolean }) {
  const { d, dens } = t;
  // Labels layouts already draw a rule above every section, including the first.
  const rule = d.headerRule && d.layout !== "labels" ? `border-b ${C.rule} pb-6` : "";

  if (d.header === "masthead") {
    return (
      <header className={`${dens.header} flex flex-col items-center border-t-4 border-b ${C.inkRule} pt-5 pb-3 text-center`}>
        <div className="mb-4 empty:hidden">
          <Photo t={t} size="md" />
        </div>
        <NameBlock t={t} align="center" />
        {showContact && (
          <div className={`mt-4 w-full border-t ${C.rule} pt-2.5`}>
            <ContactDetails t={t} mode="inline" align="center" />
          </div>
        )}
      </header>
    );
  }

  if (d.header === "plate") {
    return (
      <header className={`${dens.header} border-2 ${C.accentRule} rounded-sm px-5 py-3.5`}>
        <NameBlock t={t} />
        {showContact && (
          <div className="mt-2.5">
            <ContactDetails t={t} mode="inline" />
          </div>
        )}
      </header>
    );
  }

  if (d.header === "center") {
    return (
      <header className={`${dens.header} ${rule} flex flex-col items-center text-center`}>
        <div className="mb-4 empty:hidden">
          <Photo t={t} size="md" />
        </div>
        <NameBlock t={t} align="center" />
        {showContact && (
          <div className="mt-3">
            <ContactDetails t={t} mode="inline" align="center" />
          </div>
        )}
      </header>
    );
  }

  if (d.header === "split") {
    return (
      <header className={`${dens.header} ${rule} flex items-start justify-between gap-8`}>
        <div className="flex min-w-0 items-center gap-5">
          <Photo t={t} size="md" />
          <NameBlock t={t} />
        </div>
        {showContact && (
          <div className={`max-w-[42%] shrink-0${d.contactBox ? ` rounded-lg ${C.bgTint} px-4 py-3` : ""}`}>
            <ContactDetails t={t} mode="stacked" align={d.contactBox ? "start" : "end"} />
          </div>
        )}
      </header>
    );
  }

  return (
    <header className={`${dens.header} ${rule} flex items-center gap-6${d.photoRight ? " flex-row-reverse" : ""}${d.stripe === "corner" ? " pr-24" : ""}`}>
      {d.monogram ? <Monogram t={t} /> : <Photo t={t} size="md" />}
      <div className={d.photoRight || d.monogram ? "min-w-0 flex-1" : "min-w-0"}>
        <NameBlock t={t} />
        {showContact && (
          <div className="mt-3">
            <ContactDetails t={t} mode="inline" />
          </div>
        )}
      </div>
    </header>
  );
}

function Banner({ t, showContact }: { t: Theme; showContact: boolean }) {
  const banner: NonNullable<TemplateDesign["colors"]["banner"]> = t.d.colors.banner ?? { bg: t.d.colors.accent, ink: "#ffffff" };
  const slant = banner.edge === "slant";
  const style = {
    ...(slant ? {} : { backgroundColor: banner.bg }),
    ...(banner.edge === "rule" ? { borderBottom: `calc(var(--spacing) * 1.5) solid ${banner.accent ?? banner.ink}` } : {}),
    "--t-ink": banner.ink,
    "--t-muted": banner.muted ?? banner.ink,
    "--t-accent": banner.accent ?? banner.ink,
  } as CSSProperties;

  return (
    <header
      className={`${t.dens.banner} flex items-center gap-7 ${C.ink}${t.d.photoRight ? " flex-row-reverse" : ""}${slant ? " relative isolate pb-16" : ""}`}
      style={style}
    >
      {slant && (
        // The low side of the cut is on the left, under the text.
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: banner.bg, clipPath: "polygon(0 0, 100% 0, 100% 74%, 0 100%)" }}
        />
      )}
      <Photo t={t} size="md" />
      <div className={t.d.photoRight ? "min-w-0 flex-1" : "min-w-0"}>
        <NameBlock t={t} />
        {showContact && (
          <div className="mt-3">
            <ContactDetails t={t} mode="inline" />
          </div>
        )}
      </div>
    </header>
  );
}

function SidebarHeader({ t }: { t: Theme }) {
  const block = t.d.side?.block;
  if (block) {
    const style = {
      backgroundColor: block.bg,
      "--t-ink": block.ink,
      "--t-muted": block.muted ?? block.ink,
      "--t-accent": block.accent ?? block.ink,
    } as CSSProperties;
    return (
      <div className={`${t.dens.sideBleed} mb-7 flex flex-col gap-4 ${C.ink}`} style={style}>
        <Photo t={t} size="lg" />
        <NameBlock t={t} compactName />
      </div>
    );
  }
  return (
    <div className="mb-8 flex flex-col gap-4">
      <Photo t={t} size="lg" />
      <NameBlock t={t} compactName />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template

function sideStyle(side: TemplateDesign["side"]): CSSProperties {
  if (!side) return {};
  const style: Record<string, string> = {};
  if (side.bg) style.backgroundColor = side.bg;
  if (side.ink) style["--t-ink"] = side.ink;
  if (side.muted) style["--t-muted"] = side.muted;
  if (side.accent) style["--t-accent"] = side.accent;
  if (side.rule) style["--t-rule"] = side.rule;
  if (side.tint ?? side.ink) style["--t-tint"] = side.tint ?? `color-mix(in srgb, ${side.ink} 14%, transparent)`;
  return style as CSSProperties;
}

export function DesignTemplate({ resume: r, design }: { resume: PreparedResume; design: TemplateDesign }) {
  const dens = densities[design.density];
  const t: Theme = { d: design, r, dens };
  const { colors } = design;

  const sideSections: SidebarSection[] =
    design.side?.sections ??
    (design.layout === "sidebar"
      ? ["contact", "skills", "languages", "certifications"]
      : design.layout === "columns"
        ? ["skills", "languages", "certifications"]
        : []);
  const hasSide = design.layout === "sidebar" || design.layout === "columns";
  const contactInSide = hasSide && sideSections.includes("contact");
  // The main column follows the user's section order; the sidebar is arranged by the design.
  const inSide = (type: SectionType) => hasSide && sideSections.includes(type);
  const inLower = (type: SectionType) => !inSide(type) && !!design.lower?.includes(type);
  const inTop = (type: SectionType) => !!design.top?.includes(type);
  const topList = hasSide ? r.sections.filter((section) => inTop(section.type)) : [];
  const mainList = r.sections.filter((section) => !inSide(section.type) && !inLower(section.type) && !(hasSide && inTop(section.type)));
  const lowerList = r.sections.filter((section) => inLower(section.type));
  const inlineHeader = design.header !== "banner" && design.header !== "sidebar";

  const vars = {
    "--t-accent": colors.accent,
    "--t-ink": colors.ink ?? "#1f2328",
    "--t-muted": colors.muted ?? "#5f6368",
    "--t-rule": colors.rule ?? "#d9d9d9",
    "--t-tint": colors.tint ?? `color-mix(in srgb, ${colors.accent} 12%, white)`,
    "--t-on-accent": colors.onAccent ?? "#ffffff",
    "--t-heading-font": fontStacks[design.fonts.heading],
    "--t-body-font": fontStacks[design.fonts.body],
  } as CSSProperties;

  const mainSections = (
    <div className={`flex flex-col ${dens.sections}${design.sectionBands ? ` [&>section:nth-child(even)]:[background-color:var(--t-tint)] ${dens.band}` : ""}`}>
      {mainList.map((section) => renderSection(section, t, "main"))}
      {lowerList.length > 0 && (
        <div className={`resume-lower grid grid-cols-2 ${dens.sections} gap-x-8`}>{lowerList.map((section) => renderSection(section, t, "side"))}</div>
      )}
    </div>
  );

  const sideContent = (
    <div className={`flex flex-col ${dens.sections}`}>
      {sideSections.map((key) =>
        key === "contact" ? (
          contactEntries(r).length > 0 && (
            <Section key="contact" title="Contact" t={t} area="side">
              <ContactDetails t={t} mode="stacked" />
            </Section>
          )
        ) : (
          r.sections.filter((section) => section.type === key).map((section) => renderSection(section, t, "side"))
        ),
      )}
    </div>
  );

  const width = design.side?.width ?? (design.layout === "columns" ? "32%" : "33%");
  const sideLeft = (design.side?.position ?? (design.layout === "sidebar" ? "left" : "right")) === "left";
  const columns = sideLeft ? `${width} minmax(0,1fr)` : `minmax(0,1fr) ${width}`;
  const splitStyle = { gridTemplateColumns: columns, "--side-width": width } as CSSProperties;

  let body: ReactNode;
  if (design.layout === "sidebar") {
    const aside = (
      <aside className={`min-w-0 ${dens.side} ${C.ink}`} style={sideStyle(design.side)}>
        {design.header === "sidebar" && <SidebarHeader t={t} />}
        {sideContent}
      </aside>
    );
    const main = (
      <div className={`min-w-0 ${dens.page}`}>
        {inlineHeader && <Header t={t} showContact={!contactInSide} />}
        {mainSections}
      </div>
    );
    body = (
      <div className="resume-split grid flex-1" data-side={sideLeft ? "left" : "right"} style={splitStyle}>
        {sideLeft ? aside : main}
        {sideLeft ? main : aside}
      </div>
    );
  } else if (design.layout === "columns") {
    const tinted = !!design.side?.bg;
    const aside = (
      <aside
        className={`min-w-0 ${tinted ? "self-start px-5 py-5" : `${sideLeft ? "border-r pr-7" : "border-l pl-7"} ${C.rule}`} ${C.ink}`}
        style={sideStyle(design.side)}
      >
        {sideContent}
      </aside>
    );
    body = (
      <div className={`flex-1 ${dens.page}`}>
        {inlineHeader && <Header t={t} showContact={!contactInSide} />}
        {topList.length > 0 && <div className={`mb-5 flex flex-col ${dens.sections}`}>{topList.map((section) => renderSection(section, t, "main"))}</div>}
        <div className="resume-split grid gap-7" data-side={sideLeft ? "left" : "right"} style={splitStyle}>
          {sideLeft ? aside : mainSections}
          {sideLeft ? mainSections : aside}
        </div>
      </div>
    );
  } else {
    body = (
      <div className={`flex-1 ${dens.page}`}>
        {inlineHeader && <Header t={t} showContact />}
        {mainSections}
      </div>
    );
  }

  return (
    <article
      className={`relative flex min-w-0 flex-col ${C.bodyFont} ${C.ink}`}
      style={colors.paper ? { ...vars, backgroundColor: colors.paper } : vars}
    >
      {colors.paper && (
        // Print only: repeats the page color on every PDF page, under any sidebar background.
        <div aria-hidden="true" className="print-sidebar-bg" style={{ backgroundColor: colors.paper, width: "100%", left: 0 }} />
      )}
      {design.stripe === "top" && <div aria-hidden="true" className={`h-2 shrink-0 ${C.bgAccent}`} />}
      {design.stripe === "ribbon" && (
        <div aria-hidden="true" className="flex h-2.5 shrink-0">
          {(colors.ribbon ?? [colors.accent, colors.accent, colors.accent]).map((color, i) => (
            <span key={i} style={{ backgroundColor: color, flexGrow: 3 - i }} />
          ))}
        </div>
      )}
      {design.stripe === "right" && (
        <div aria-hidden="true" className={`print-fixed-edge absolute inset-y-0 right-0 w-3 ${C.bgAccent}`} />
      )}
      {design.stripe === "bookend" && (
        <>
          <div aria-hidden="true" className={`print-fixed-edge absolute inset-x-0 top-0 h-2.5 ${C.bgAccent}`} />
          <div aria-hidden="true" className={`print-fixed-edge absolute inset-x-0 bottom-0 h-2.5 ${C.bgAccent}`} />
        </>
      )}
      {design.stripe === "corner" && (
        <div aria-hidden="true" className={`absolute top-0 right-0 size-28 ${C.bgAccent}`} style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
      )}
      {design.stripe === "rail" && (
        <div aria-hidden="true" className={`print-fixed-edge absolute inset-y-0 left-0 w-6 ${C.bgAccent}`} />
      )}
      {design.frame && (
        <div
          aria-hidden="true"
          className={`print-fixed-edge resume-frame pointer-events-none absolute inset-4 ${C.accentRule} ${design.frame === "double" ? "border-4 [border-style:double]" : "border"}`}
        />
      )}
      {design.stripe === "left" && (
        <div aria-hidden="true" className={`print-fixed-edge absolute inset-y-0 left-0 w-2 ${C.bgAccent}`} />
      )}
      {design.layout === "sidebar" && design.side?.bg && (
        // Print only: repeats the sidebar color down every PDF page.
        <div
          aria-hidden="true"
          className="print-sidebar-bg"
          style={{ backgroundColor: design.side.bg, width, [sideLeft ? "left" : "right"]: 0 }}
        />
      )}
      {design.header === "banner" && <Banner t={t} showContact={!contactInSide} />}
      {body}
    </article>
  );
}

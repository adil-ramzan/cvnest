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
  inkRule: "[border-color:var(--t-ink)]",
  headingFont: "[font-family:var(--t-heading-font)]",
  bodyFont: "[font-family:var(--t-body-font)]",
};

const densities = {
  relaxed: {
    page: "px-16 py-14",
    side: "px-9 py-14",
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

  const title = e.title && <h3 className={`${dens.title} font-semibold ${C.ink}`}>{e.title}</h3>;
  const subtitle = e.subtitle && <p className={`${dens.body} ${subtitleClass}`}>{e.subtitle}</p>;
  const dates = e.dates && <span className={`${dens.small} shrink-0 ${C.muted} tabular-nums`}>{e.dates}</span>;
  const details = (
    <>
      {e.bullets.length > 0 && <Bullets items={e.bullets} t={t} />}
      {e.text && <p className={`mt-1 ${dens.body} whitespace-pre-line`}>{e.text}</p>}
    </>
  );

  switch (placement) {
    case "right":
      return (
        <div className="break-inside-avoid">
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
  const style = area === "side" && (t.d.skills === "inline" || t.d.skills === "columns") ? "list" : t.d.skills;
  const { body, small } = t.dens;

  switch (style) {
    case "inline":
      return <p className={body}>{items.join("  ·  ")}</p>;
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

function NameBlock({ t, align = "start", compactName = false }: { t: Theme; align?: "start" | "center"; compactName?: boolean }) {
  const { d, r } = t;
  const n = d.name ?? {};
  const size = compactName ? "text-3xl" : { md: "text-3xl", lg: "text-4xl", xl: "text-5xl" }[n.size ?? (d.density === "compact" ? "md" : "lg")];
  const weight = { light: "font-light", normal: "font-normal", semibold: "font-semibold", bold: "font-bold", black: "font-black" }[n.weight ?? "semibold"];
  const tracking = { tight: "tracking-tight", normal: "", wide: "tracking-[0.12em]" }[n.tracking ?? (n.upper ? "wide" : "tight")];
  const titleClass = {
    accent: `mt-1 ${d.density === "compact" ? "text-sm" : "text-base"} font-medium ${C.accent}`,
    muted: `mt-1 ${d.density === "compact" ? "text-sm" : "text-base"} ${C.muted}`,
    caps: `mt-1.5 text-xs font-medium tracking-[0.22em] uppercase ${C.muted}`,
  }[d.titleStyle ?? "muted"];

  return (
    <div className={`min-w-0 ${align === "center" ? "text-center" : ""}`}>
      <h1
        className={`${size} ${weight} ${tracking} leading-[1.1] ${n.upper ? "uppercase" : ""} ${n.accent ? C.accent : C.ink} ${C.headingFont} [overflow-wrap:anywhere]`}
      >
        {r.name}
      </h1>
      {r.title && <p className={titleClass}>{r.title}</p>}
    </div>
  );
}

function Header({ t, showContact }: { t: Theme; showContact: boolean }) {
  const { d, dens } = t;
  // Labels layouts already draw a rule above every section, including the first.
  const rule = d.headerRule && d.layout !== "labels" ? `border-b ${C.rule} pb-6` : "";

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
          <div className="max-w-[42%] shrink-0">
            <ContactDetails t={t} mode="stacked" align="end" />
          </div>
        )}
      </header>
    );
  }

  return (
    <header className={`${dens.header} ${rule} flex items-center gap-6`}>
      <Photo t={t} size="md" />
      <div className="min-w-0">
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
  const banner = t.d.colors.banner ?? { bg: t.d.colors.accent, ink: "#ffffff" };
  const style = {
    backgroundColor: banner.bg,
    "--t-ink": banner.ink,
    "--t-muted": banner.muted ?? banner.ink,
    "--t-accent": banner.accent ?? banner.ink,
  } as CSSProperties;

  return (
    <header className={`${t.dens.banner} flex items-center gap-7 ${C.ink}`} style={style}>
      <Photo t={t} size="md" />
      <div className="min-w-0">
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
  const mainList = r.sections.filter((section) => !inSide(section.type));
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
    <div className={`flex flex-col ${dens.sections}`}>{mainList.map((section) => renderSection(section, t, "main"))}</div>
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
      <div className="grid flex-1" style={{ gridTemplateColumns: columns }}>
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
        <div className="grid gap-7" style={{ gridTemplateColumns: columns }}>
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
    <article className={`relative flex min-w-0 flex-col ${C.bodyFont} ${C.ink}`} style={vars}>
      {design.stripe === "top" && <div aria-hidden="true" className={`h-2 shrink-0 ${C.bgAccent}`} />}
      {design.stripe === "left" && <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-2 ${C.bgAccent}`} />}
      {design.header === "banner" && <Banner t={t} showContact={!contactInSide} />}
      {body}
    </article>
  );
}

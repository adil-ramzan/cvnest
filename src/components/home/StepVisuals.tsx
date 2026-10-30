import { Check, FileDown } from "lucide-react";
import { homeCopy } from "@/data/copy";

const { details, layout, save } = homeCopy.steps.visuals;

const card = "rounded-[20px] bg-surface p-5 shadow-soft sm:p-6";

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-medium text-muted">{label}</p>
      <p className="mt-1 rounded-[10px] border border-line px-3 py-2 text-base text-ink">{value}</p>
    </div>
  );
}

export function DetailsCard() {
  return (
    <div className={card}>
      <p className="text-title text-ink">{details.title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MockField label={details.fields[0][0]} value={details.fields[0][1]} />
        <MockField label={details.fields[1][0]} value={details.fields[1][1]} />
        <div className="sm:col-span-2">
          <MockField label={details.fields[2][0]} value={details.fields[2][1]} />
        </div>
      </div>
    </div>
  );
}

function MockLayout({ columns, selected = false }: { columns: string; selected?: boolean }) {
  return (
    <div className={`rounded-[14px] border-2 bg-surface p-2.5 ${selected ? "border-accent" : "border-line"}`}>
      <div className={`grid aspect-[3/4] gap-1.5 ${columns}`}>
        <span className="rounded-md bg-ink/15" />
        <span className="rounded-md bg-ink/8" />
      </div>
    </div>
  );
}

export function LayoutCard() {
  return (
    <div className={card}>
      <p className="text-title text-ink">{layout.title}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <MockLayout columns="grid-rows-[1fr_3fr]" />
        <MockLayout columns="grid-cols-[1fr_2fr]" selected />
        <MockLayout columns="grid-cols-[2fr_1fr]" />
      </div>
      <p className="mt-4 flex items-center gap-2 text-base font-medium text-ink">
        <Check aria-hidden="true" className="size-5 text-accent" strokeWidth={2.5} />
        {layout.selected}
      </p>
    </div>
  );
}

export function SaveCard() {
  return (
    <div className={`${card} flex items-start gap-4`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-ink text-white">
        <FileDown aria-hidden="true" className="size-6" />
      </span>
      <div>
        <p className="text-title text-ink">{save.title}</p>
        <p className="mt-1 text-base text-muted">{save.description}</p>
      </div>
    </div>
  );
}

import { Check, FileDown } from "lucide-react";
import { homeCopy } from "@/data/copy";

const { details, save } = homeCopy.steps.visuals;

/**
 * Compact product mocks for "How it works", all the same height with the mock centred.
 * No titles of their own: the step heading underneath already says what each one shows.
 */
/* A gentle lift on hover, like the feature chips; not clickable, so no pointer or link styling. */
const card = "flex h-full flex-col justify-center rounded-[20px] bg-surface px-6 shadow-soft transition-[translate,box-shadow] duration-200 ease-out hover:shadow-pop motion-safe:hover:-translate-y-0.5";

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 truncate rounded-[10px] border border-line px-2.5 py-1.5 text-sm text-ink">{value}</p>
    </div>
  );
}

export function DetailsCard() {
  return (
    <div className={card}>
      <div className="grid grid-cols-2 gap-2.5">
        <MockField label={details.fields[0][0]} value={details.fields[0][1]} />
        <MockField label={details.fields[1][0]} value={details.fields[1][1]} />
      </div>
    </div>
  );
}

function MockLayout({ columns, selected = false }: { columns: string; selected?: boolean }) {
  return (
    <div className={`relative rounded-[14px] border-2 bg-surface p-1.5 ${selected ? "border-accent" : "border-line"}`}>
      <div className={`grid h-14 gap-1 ${columns}`}>
        <span className="rounded-md bg-ink/15" />
        <span className="rounded-md bg-ink/8" />
      </div>
      {selected && (
        <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-accent text-white">
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function LayoutCard() {
  return (
    <div className={card}>
      <div className="grid grid-cols-3 gap-3">
        <MockLayout columns="grid-rows-[1fr_3fr]" />
        <MockLayout columns="grid-cols-[1fr_2fr]" selected />
        <MockLayout columns="grid-cols-[2fr_1fr]" />
      </div>
    </div>
  );
}

export function SaveCard() {
  return (
    <div className={card}>
      <div className="flex items-center gap-3">
        {/* A tiny finished page: a heading bar and a few text lines. */}
        <span className="flex h-14 w-11 shrink-0 flex-col gap-1 rounded-md border border-line bg-surface p-1.5">
          <span className="h-1.5 w-3/4 rounded-full bg-ink/25" />
          <span className="h-1 rounded-full bg-ink/10" />
          <span className="h-1 rounded-full bg-ink/10" />
          <span className="h-1 w-2/3 rounded-full bg-ink/10" />
        </span>
        <span className="h-px min-w-4 flex-1 border-t border-dashed border-line" />
        <span className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-3 py-2 text-sm font-bold text-white">
          <FileDown aria-hidden="true" className="size-4" />
          {save.action}
        </span>
      </div>
    </div>
  );
}

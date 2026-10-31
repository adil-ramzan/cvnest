import { AlertTriangle, Info, X } from "lucide-react";
import type { ReactNode } from "react";

type NoticeProps = {
  tone?: "info" | "warning";
  title: string;
  children?: ReactNode;
  /** Buttons shown under the message. */
  actions?: ReactNode;
  onDismiss?: () => void;
};

const tones = {
  info: "bg-surface text-ink-soft shadow-soft",
  warning: "border border-[#fedf89] bg-[#fffaeb] text-[#93370d]",
};

/** A message at the top of the editor panel. */
export function Notice({ tone = "info", title, children, actions, onDismiss }: NoticeProps) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div role={tone === "warning" ? "alert" : undefined} className={`mx-4 mt-4 flex items-start gap-3 rounded-2xl p-3.5 text-[0.875rem] sm:mx-5 ${tones[tone]}`}>
      <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${tone === "info" ? "text-accent" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        {children && <div className="mt-0.5">{children}</div>}
        {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={`Dismiss: ${title}`} className="-m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-black/5">
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}

"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { buttonClass } from "@/components/ui/styles";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
};

/** Modal built on the native <dialog> element, which provides focus trapping and Escape handling. */
export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-[#1d1d1f]/40"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-2 text-base leading-relaxed text-muted">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}

export const dialogButtonClass = {
  secondary: buttonClass("secondary", "sm"),
  primary: buttonClass("primary", "sm"),
  danger: buttonClass("danger", "sm"),
};

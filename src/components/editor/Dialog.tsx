"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { buttonClass } from "@/components/ui/styles";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** False while something can't be interrupted: Escape and backdrop clicks do nothing. Defaults to true. */
  dismissible?: boolean;
};

/** Modal built on the native <dialog> element, which provides focus trapping and Escape handling. */
export function Dialog({ open, onClose, title, description, children, dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before showModal, while the dialog can't take focus, so the
      // browser would pick the first focusable element (for example a scrollable list).
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // The close event fires a task after close(). If the dialog was reopened in between,
      // that late event belongs to the old one and must not close the new one.
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onClose={() => {
        const dialog = ref.current;
        if (dialog?.open) return;
        // Browsers let a repeated Escape close a dialog even when cancel is refused; reopen it.
        if (!dismissible && open && dialog) {
          dialog.showModal();
          return;
        }
        onClose();
      }}
      onClick={(event) => dismissible && event.target === event.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId} className="text-xl font-bold">
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

"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui/styles";

const TIMEOUT_MS = 10_000;

type UndoToastProps = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
};

/** Offers to reverse a deletion. Escape or the timeout dismisses it. */
export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, TIMEOUT_MS);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-[0.875rem] text-white shadow-pop lg:bottom-6"
    >
      <span className="min-w-0 truncate">{message}</span>
      <button type="button" onClick={onUndo} className={buttonClass("secondary", "sm", "h-9 shrink-0 px-3.5")}>
        Undo
      </button>
    </div>
  );
}

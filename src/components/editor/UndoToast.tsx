"use client";

import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/styles";

const TIMEOUT_MS = 10_000;

type UndoToastProps = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
};

/** Offers to reverse a deletion. Escape or the timeout dismisses it. */
export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  const button = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // Runs after the list has moved focus off the deleted item, so that's where focus returns.
  useEffect(() => {
    const undoButton = button.current;
    const frame = requestAnimationFrame(() => {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      undoButton?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      if (document.activeElement === undoButton || document.activeElement === document.body) returnTo.current?.focus();
    };
  }, []);

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
      <button ref={button} type="button" onClick={onUndo} className={buttonClass("secondary", "sm", "h-9 shrink-0 px-3.5")}>
        Undo
      </button>
    </div>
  );
}

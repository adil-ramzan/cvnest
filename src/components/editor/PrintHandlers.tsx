"use client";

import { useEffect, useRef } from "react";

type PrintHandlersProps = {
  /** Ctrl+P or Cmd+P in the editor: the same as choosing Save as PDF, without the notice before it. */
  onShortcut: () => void;
  /** The browser is about to print (its menu, or a shortcut the editor didn't catch). */
  onBeforePrint: () => void;
  onAfterPrint: () => void;
};

const isPrintShortcut = (event: KeyboardEvent) =>
  (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "p";

/**
 * Printing from the keyboard or the browser's menu. Without this, the print styles
 * would hide the editor and print a blank page. Renders nothing.
 */
export function PrintHandlers({ onShortcut, onBeforePrint, onAfterPrint }: PrintHandlersProps) {
  const handlers = useRef({ onShortcut, onBeforePrint, onAfterPrint });

  useEffect(() => {
    handlers.current = { onShortcut, onBeforePrint, onAfterPrint };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPrintShortcut(event) || event.repeat) return;
      event.preventDefault();
      // A dialog is already asking something; the shortcut does nothing rather than stack another.
      if (document.querySelector("dialog[open]")) return;
      handlers.current.onShortcut();
    };
    const before = () => handlers.current.onBeforePrint();
    const after = () => handlers.current.onAfterPrint();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return null;
}

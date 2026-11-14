"use client";

import { AlertTriangle, Home, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/styles";

/**
 * Shown if the editor crashes while rendering. Resumes live in browser storage
 * and are validated every time they load, so reloading recovers a clean state;
 * nothing here reads, writes or deletes saved data.
 */
export default function EditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged locally only; no error reports are sent anywhere.
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8" role="alert">
        <AlertTriangle aria-hidden="true" className="size-7 text-[#b54708]" />
        <h1 className="mt-4 text-2xl font-bold text-ink">The editor ran into a problem</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          This error doesn&apos;t delete anything. Resumes already saved in this browser are still there. Try again,
          or reload the editor.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className={buttonClass("secondary", "md")}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Reload editor
          </button>
          <Link href="/" className={buttonClass("ghost", "md")}>
            <Home aria-hidden="true" className="size-4" />
            Home
          </Link>
        </div>
        <details className="mt-6 text-sm text-muted">
          <summary className="cursor-pointer select-none">Technical details</summary>
          <p className="mt-2 font-mono text-xs break-words">
            {error.message || "Unknown error"}
            {error.digest ? ` (ref ${error.digest})` : ""}
          </p>
        </details>
      </div>
    </main>
  );
}

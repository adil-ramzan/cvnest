"use client";

import { useEffect } from "react";
import { SITE_NAME } from "@/data/site";
import "./globals.css";

/**
 * Last-resort error screen, used only when the root layout itself fails. It
 * replaces the whole document, so it renders its own <html> and <body>.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged locally only; no error reports are sent anywhere.
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-canvas px-4 font-sans text-ink">
        <main role="alert" className="max-w-lg py-16">
          <p className="text-sm font-medium text-accent-ink">{SITE_NAME}</p>
          <h1 className="mt-2 text-3xl font-bold">Something went wrong</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            The page couldn&apos;t be displayed. Resumes already saved in this browser are not affected.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center rounded-lg bg-ink px-5 text-base font-medium text-white hover:bg-ink-soft"
            >
              Try again
            </button>
            {/* A full page load, since client-side navigation may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-base font-medium text-ink hover:bg-canvas"
            >
              Go to homepage
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { buttonClass } from "@/components/ui/styles";

/** Error screen for public pages; the site header and footer stay in place. */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged locally only; CVNest sends no error reports anywhere.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-2xl" role="alert">
        <p className="text-sm font-medium text-accent">Something went wrong</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">This page didn&apos;t load</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Please try again. If you were working on a resume, it is still saved in this browser.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={buttonClass("primary", "md")}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </button>
          <ButtonLink href="/" variant="secondary">
            Back to Home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}

import type { Metadata } from "next";
import { SimplePage } from "@/components/layout/SimplePage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { site } from "@/data/site";

// ACCOUNTS: this whole page describes having no accounts.
export const metadata: Metadata = {
  title: "Sign In",
  description: "Accounts aren't available. You can build a resume without signing up.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <SimplePage
      eyebrow="Accounts"
      title="Sign in isn't available"
      intro={`${site.name} doesn't have accounts. You don't need one to create a resume and save it as a PDF.`}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/templates">Browse Templates</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </div>
    </SimplePage>
  );
}

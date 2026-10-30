import type { Metadata } from "next";
import { SimplePage } from "@/components/layout/SimplePage";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Accounts are not available yet. You can build a resume without signing up.",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <SimplePage
      eyebrow="Accounts"
      title="Sign in is not available yet"
      intro="Accounts are planned for a future update. You will not need one to create and download your resume."
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

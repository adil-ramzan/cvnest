import type { Metadata } from "next";
import { SimplePage } from "@/components/layout/SimplePage";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${site.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <SimplePage
      eyebrow="Legal"
      title="Terms of Service"
      intro="Our full terms of service will be published before the resume editor launches."
    >
      <p>
        Sample resumes shown on this site are fictional and provided for preview purposes only. Any resemblance to real
        people is coincidental.
      </p>
    </SimplePage>
  );
}

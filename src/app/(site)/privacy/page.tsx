import type { Metadata } from "next";
import { SimplePage } from "@/components/layout/SimplePage";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${site.name}.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SimplePage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Our full privacy policy will be published before launch. Here is how your resume data is handled today."
    >
      <p>
        Resumes you create in the editor are stored locally in your browser using local storage, and profile photos
        using the browser&apos;s IndexedDB storage. Your resume content is not uploaded to our servers or shared with
        third parties, and there are no accounts.
      </p>
      <p>
        Because the data lives only in your browser, clearing your browsing or site data will remove saved resumes.
        Browser storage is not encrypted, so avoid editing your resume on shared computers.
      </p>
    </SimplePage>
  );
}

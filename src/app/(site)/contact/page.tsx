import type { Metadata } from "next";
import { SimplePage } from "@/components/layout/SimplePage";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to get in touch with the ${site.name} team.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <SimplePage
      eyebrow="Contact"
      title="Get in touch"
      intro="We are still setting up our support channels."
    >
      <p>A contact address will be published here before launch. Thank you for your patience.</p>
    </SimplePage>
  );
}

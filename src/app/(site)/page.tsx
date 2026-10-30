import type { Metadata } from "next";
import { Faq } from "@/components/home/Faq";
import { Features } from "@/components/home/Features";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Templates } from "@/components/home/Templates";
import { ValueProps } from "@/components/home/ValueProps";
import { site, siteDescription } from "@/data/site";
import { templates } from "@/data/templates";

const description = siteDescription(templates.length);

export const metadata: Metadata = {
  title: { absolute: `Free Online Resume Builder | ${site.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: { title: `Free Online Resume Builder | ${site.name}`, description, url: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueProps />
      <HowItWorks />
      <Templates />
      <Features />
      <Faq />
      <FinalCta />
    </>
  );
}

import type { Metadata } from "next";
import { Faq } from "@/components/home/Faq";
import { Features } from "@/components/home/Features";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TemplateShowcase } from "@/components/home/TemplateShowcase";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: { absolute: `Free Online Resume Builder | ${site.name}` },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: { title: `Free Online Resume Builder | ${site.name}`, description: site.description, url: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <TemplateShowcase />
      <HowItWorks />
      <Features />
      <Faq />
    </>
  );
}

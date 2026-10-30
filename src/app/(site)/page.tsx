import type { Metadata } from "next";
import { Faq } from "@/components/home/Faq";
import { Features } from "@/components/home/Features";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Templates } from "@/components/home/Templates";
import { ValueProps } from "@/components/home/ValueProps";
import { homeCopy } from "@/data/copy";

const { title, description } = homeCopy.seo;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/" },
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

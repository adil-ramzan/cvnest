import type { Metadata } from "next";
import { Faq } from "@/components/home/Faq";
import { Features } from "@/components/home/Features";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Templates } from "@/components/home/Templates";
import { homeCopy } from "@/data/copy";
import { socialImage } from "@/data/site";

const { title, description } = homeCopy.seo;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { images: [socialImage], title, description, url: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Templates />
      <Features />
      <Faq />
      <FinalCta />
    </>
  );
}

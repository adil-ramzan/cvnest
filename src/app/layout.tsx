import type { Metadata } from "next";
import {
  EB_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Inter,
  Lora,
  Montserrat,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Source_Serif_4,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import type { ReactNode } from "react";
import { site, siteDescription } from "@/data/site";
import { TEMPLATE_COUNT_LABEL } from "@/data/template-count";
import "./globals.css";

// The site's font. Everything below it is only used inside resume documents.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jakarta", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

// Resume template fonts. Not preloaded: the browser only downloads the ones a visible template uses.
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap", preload: false });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap", preload: false });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-mono", display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap", preload: false });
const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond", display: "swap", preload: false });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", display: "swap", preload: false });

const fontVariables = [jakarta, inter, sourceSerif, lora, playfair, montserrat, plexSans, plexMono, spaceGrotesk, garamond, workSans]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `Free Online Resume Builder | ${site.name}`,
    template: `%s | ${site.name}`,
  },
  description: siteDescription(TEMPLATE_COUNT_LABEL),
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

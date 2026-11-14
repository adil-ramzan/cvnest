/** Product name. Final (Phase 0). Change it here and everywhere follows. */
export const SITE_NAME = "CVNest";

export const site = {
  name: SITE_NAME,
  /** Set at build time by the deploy scripts, so each environment names itself in its links. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Search engines are kept out unless a build opts in with exactly "true". */
  indexable: process.env.NEXT_PUBLIC_INDEXABLE === "true",
  tagline: "Free online resume builder",
};

/** Pages that set their own Open Graph data replace the site-wide image, so each includes this. */
export const socialImage = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: free resume builder` };

// site.ts is imported by client components, so counts are passed in rather than
// read from the template registry, which would pull it into those bundles.
// ACCOUNTS
export const siteDescription = (templateCount: string) =>
  `Create a resume for free with ${templateCount} templates. Your resume stays in your browser, and you don't need an account.`;

/** What is free today. Only list features that exist and work. */
export const freeFeatures = (templateCount: string) => [
  { title: `All ${templateCount} resume templates`, description: "Every template in the gallery is free to use. None are locked or premium." },
  { title: "Resume creation and editing", description: "Create and edit several resumes, with a live preview." },
  { title: "Template customization", description: "Switch templates, reorder and rename sections, and choose Letter or A4 pages." },
  // ACCOUNTS
  {
    title: "Autosave in your browser",
    description: "Your work saves in this browser as you type. If the browser blocks storage, the editor tells you.",
  },
  // ACCOUNTS
  { title: "No account required", description: "Start straight away. There is no sign-up, login or email needed." },
  { title: "No watermarks", description: `${SITE_NAME} doesn't add logos, badges or branding to your resume.` },
];

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Templates", href: "/templates" },
  { label: "How It Works", href: "/#how-it-works" },
];

export const footerNav = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Templates", href: "/templates" },
      { label: "What’s Free", href: "/free" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

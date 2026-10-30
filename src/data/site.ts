/** Placeholder brand name. Change it here and everywhere follows. */
export const SITE_NAME = "CVNest";

export const site = {
  name: SITE_NAME,
  url: "https://getcvnest.com",
  tagline: "Free online resume builder",
};

// site.ts is imported by client components, so counts are passed in rather than
// read from the template registry, which would pull it into those bundles.
export const siteDescription = (templateCount: number) =>
  `Create a professional resume for free with ${templateCount} customizable resume templates. Edit your resume online, keep your data private and get started without an account.`;

/** What is free today. Only list features that exist and work. */
export const freeFeatures = (templateCount: number) => [
  { title: `All ${templateCount} resume templates`, description: "Every template in the gallery is free to use. None are locked or premium." },
  { title: "Resume creation and editing", description: "Write and edit as many resumes as you like with the live preview." },
  { title: "Template customization", description: "Switch templates, reorder and rename sections, and choose Letter or A4 pages." },
  { title: "Autosave in your browser", description: "Your work saves automatically in this browser as you type." },
  { title: "No account required", description: "Start straight away. There is no sign-up, login or email needed." },
  { title: "No watermarks", description: "We never add logos, badges or branding to your resume." },
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

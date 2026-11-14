/**
 * All home page wording, in one place. Strings marked ACCOUNTS depend on "no
 * account" or "browser-only storage". Review them when optional accounts are added:
 * creating, editing and downloading stay account-free (docs/phase-0-product-decisions.md),
 * but storage wording may need to mention optional cloud backup.
 */
import { site } from "./site";
import { TEMPLATE_COUNT_LABEL } from "./template-count";

export const homeCopy = {
  seo: {
    title: `Free Online Resume Builder | ${site.name}`,
    // ACCOUNTS
    description: `Create a resume for free with ${TEMPLATE_COUNT_LABEL} templates. Your resume stays in your browser, and you don't need an account.`,
  },
  hero: {
    eyebrow: "Free resume builder",
    title: "Your story, clearly told",
    lines: ["Fill in your details. Pick a template.", "Save a PDF when it looks right."],
    action: "Start your resume",
    // ACCOUNTS
    reassurance: "No account, no watermark, and your resume stays in your browser.",
  },
  steps: {
    eyebrow: "How it works",
    title: "From blank page to finished PDF",
    items: [
      // ACCOUNTS
      {
        title: "Start with what you’ve done",
        description: "Add your work history, education and skills in plain form fields. The editor saves them in this browser as you type, and warns you if it can’t.",
      },
      { title: "Try on a layout", description: "Switch templates as often as you like. Your words stay put while the design changes around them." },
      { title: "Keep your PDF", description: "Open the print window from the editor and save a PDF with selectable text, created on your own device." },
    ],
    label: "Step",
    visuals: {
      details: { fields: [["Full name", "Jordan Avery"], ["Job title", "Product Analyst"]] },
      save: { action: "Save as PDF" },
    },
  },
  templates: {
    eyebrow: "Templates",
    title: `${TEMPLATE_COUNT_LABEL} designs, all of them free`,
    description: "Categories include Simple, Modern, Creative, Photo, Executive and more.",
    action: "View all templates",
    /** Fades in over a card on hover; the card opens the template's page. */
    cardHover: "View template",
  },
  features: {
    eyebrow: "Features",
    title: "What the editor does",
    /** Read by screen readers in place of the animated demo, which is decorative. */
    demoDescription: "Demo: typing a name and job title updates the resume preview live.",
    demo: {
      labels: { name: "Full name", jobTitle: "Job title", summary: "Summary" },
      name: "James Carter",
      jobTitle: "Frontend developer",
      /** Shown, muted, until typing begins, so the resume never starts blank. */
      placeholders: { name: "Your Name", jobTitle: "Job title" },
      sections: { profile: "Profile", experience: "Experience", skills: "Skills" },
      /** The one real control in the demo: opens the editor. */
      action: "Try it yourself",
    },
    chips: [
      `${TEMPLATE_COUNT_LABEL} templates`,
      "Your section order",
      "Several resumes",
      "Hide, don’t delete",
      "Your own sections",
      // ACCOUNTS
      "Photo stays in your browser",
      // ACCOUNTS
      "Backup and restore",
      "Letter or A4",
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Good to know",
    description: "About privacy, using the editor and saving files.",
    categories: [
      {
        id: "privacy",
        label: "Privacy",
        items: [
          {
            // ACCOUNTS
            question: "Do I need an account?",
            answer: "No. Open the editor and start typing.",
          },
          {
            // ACCOUNTS
            question: "Where is my resume stored?",
            answer: "In your browser, on your device. It is never uploaded to a server, and it won’t appear in another browser or on another device.",
          },
          {
            // ACCOUNTS
            question: "What happens if I clear my browser data?",
            answer: "Your resumes are removed with it. Use Download backup to save a file first. You can restore it later.",
          },
        ],
      },
      {
        id: "using",
        label: "Using it",
        items: [
          { question: "Is the resume builder free?", answer: "Yes. There is no trial period and no watermark." },
          { question: "Can I change templates?", answer: "Yes, at any time. Your content stays and only the layout changes." },
          { question: "Can I keep more than one resume?", answer: "Yes. Keep a version for each kind of job, and duplicate one to start the next." },
        ],
      },
      {
        id: "files",
        label: "Files",
        items: [
          {
            question: "Can I save my resume as a PDF?",
            answer: "Yes. Click Save as PDF in the editor, then choose Save as PDF as the destination in the print window. Most browsers suggest the resume’s name as the file name, or your own name if you haven’t named the resume.",
          },
          { question: "Can I back up my resumes?", answer: "Yes. Download one file with all your resumes, and restore it in another browser." },
        ],
      },
    ],
  },
  cta: {
    title: "Start your resume",
    description: "Open the editor and start typing.",
    action: "Start your resume",
  },
  // ACCOUNTS
  footer: `${site.name} is a free online resume builder with ${TEMPLATE_COUNT_LABEL} templates, no watermarks and no account to create.`,
};

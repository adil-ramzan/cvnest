/**
 * All home page wording, in one place. Strings marked ACCOUNTS depend on "no
 * account" or "browser-only storage" and must change if accounts are added.
 */
import { site } from "./site";
import { TEMPLATE_COUNT_LABEL } from "./template-count";
import { templateCategories } from "./templates";

const categoryList = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(templateCategories.map((category) => category.label));

export const homeCopy = {
  seo: {
    title: `Free Online Resume Builder | ${site.name}`,
    // ACCOUNTS
    description: `Create a professional resume for free with ${TEMPLATE_COUNT_LABEL} customizable resume templates. Edit your resume online, keep your data private and get started without an account.`,
  },
  hero: {
    eyebrow: "Free resume builder",
    title: "Your story, clearly told",
    lines: ["Fill in your details. Pick a template.", "Save a PDF when it looks right."],
    action: "Start your resume",
    // ACCOUNTS
    reassurance: "No account, no watermark, and your resume stays in your browser.",
    badge: "Text-based layout",
  },
  values: {
    label: "Why use this builder",
    items: [
      { title: "Free to use", description: "Every template and the PDF export cost nothing." },
      // ACCOUNTS
      { title: "Private by default", description: "Your resume is saved in your browser, not on our servers." },
      { title: "Clean, text-based layouts", description: "Standard headings and selectable text in your PDF." },
    ],
  },
  steps: {
    eyebrow: "How it works",
    title: "From blank page to finished PDF",
    items: [
      { title: "Start with what you’ve done", description: "Add your work history, education and skills in plain form fields. Everything saves as you type." },
      { title: "Try on a layout", description: "Switch templates as often as you like. Your words stay put while the design changes around them." },
      { title: "Keep your PDF", description: "Open the print window from the editor and save a PDF with selectable text, created on your own device." },
    ],
    label: "Step",
    visuals: {
      details: { title: "Personal details", fields: [["Full name", "Jordan Avery"], ["Job title", "Product Analyst"], ["Email", "jordan@example.com"]] },
      layout: { title: "Choose a layout", selected: "Left sidebar selected" },
      save: { title: "Ready to save", description: "Choose “Save as PDF” in your browser’s print window." },
    },
  },
  templates: {
    eyebrow: "Templates",
    title: `${TEMPLATE_COUNT_LABEL} designs, all of them free`,
    description: "Start from a calm single column or something with more character. You can change your mind at any point.",
    action: "View all templates",
  },
  features: {
    eyebrow: "Features",
    title: "The parts that matter, and nothing extra",
    items: [
      { title: "Live preview", description: "Your page updates beside the form as you type." },
      { title: `${TEMPLATE_COUNT_LABEL} templates`, description: `${categoryList} designs.` },
      { title: "Your section order", description: "Rename, hide and reorder sections to suit your story." },
      { title: "Several resumes", description: "Keep a version for each kind of job, and duplicate one to start the next." },
      { title: "Hide, don’t delete", description: "Take an entry off the page and keep it saved for later." },
      { title: "Your own sections", description: "Add custom sections for publications, interests or anything else." },
      // ACCOUNTS
      { title: "Photo kept private", description: "Your photo is resized and stored in this browser, on your device." },
      { title: "Start from an example", description: "Load sample data to see a finished page, then make it yours." },
      // ACCOUNTS
      { title: "Backup and restore", description: "Download a file with all your resumes, and restore it in any browser." },
      { title: "Letter or A4", description: "Pick the page size your employer expects, then save a PDF." },
      // ACCOUNTS
      { title: "No sign-up", description: "Open the editor and begin. Autosave keeps your work in this browser." },
      { title: "No watermark", description: "Nothing is added to your document. It’s entirely yours." },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Good to know",
    items: [
      {
        question: "Is the resume builder free?",
        answer: `Yes. All ${TEMPLATE_COUNT_LABEL} templates, editing, customization, autosave and PDF export are free, with no subscription, hidden fees or watermark.`,
      },
      {
        question: "Can I download my resume as PDF?",
        answer: "Yes. Choose Download PDF in the editor, then pick Save as PDF in your browser’s print window. The PDF is created on your device, keeps your template’s layout and has selectable text.",
      },
      {
        question: "Can I change templates?",
        answer: "Yes. Your content is kept separate from the design, so you can switch between templates at any time without retyping anything.",
      },
      {
        // ACCOUNTS
        question: "Do I need an account?",
        answer: "No. You can start straight away without signing up, and your resume stays in your browser.",
      },
      {
        // ACCOUNTS
        question: "Where is my resume stored?",
        answer: "In the browser you’re using, on this device. Your resume isn’t sent to our servers, and it won’t appear in another browser or on another device.",
      },
      {
        // ACCOUNTS
        question: "What happens if I clear my browser data?",
        answer: "Your saved resumes and photos are removed. Download a backup first, and you can restore everything afterwards.",
      },
      {
        question: "Can I keep more than one resume?",
        answer: "Yes. Create as many as you need, duplicate one to tailor it, and switch between them from the menu at the top of the editor.",
      },
    ],
  },
  cta: {
    title: "Your next application can start today",
    description: "Open the editor and see your first page take shape.",
    action: "Start your resume",
  },
  // ACCOUNTS
  footer: `${site.name} is a free online resume builder with ${TEMPLATE_COUNT_LABEL} templates, no watermarks and no account to create.`,
};

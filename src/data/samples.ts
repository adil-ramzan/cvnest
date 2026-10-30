import { migrateResume, type ResumeDataV1 } from "@/lib/migrations";
import { sanitizeResume } from "@/lib/resume-schema";
import type { Resume, SectionType } from "./resume";

/**
 * Builds a sample resume from compact v1-style data, using the same migration
 * as real saved data. Ids are deterministic so server and client renders match.
 */
function sample(key: string, data: ResumeDataV1): Resume {
  let counter = 0;
  const migrated = migrateResume({ id: `sample-${key}`, name: data.name, template: "professional", createdAt: 1, updatedAt: 1, data })!;
  return sanitizeResume(migrated.value, { seen: new Set(), makeId: () => `sample-${key}-${++counter}` })!;
}

/** Reorders sections, e.g. education first for graduate templates. Unlisted sections keep their place at the end. */
export function withSectionOrder(resume: Resume, order: SectionType[]): Resume {
  const rank = (type: SectionType) => (order.includes(type) ? order.indexOf(type) : order.length);
  return { ...resume, sections: [...resume.sections].sort((a, b) => rank(a.type) - rank(b.type)) };
}

export function withSectionTitle(resume: Resume, type: SectionType, title: string): Resume {
  return { ...resume, sections: resume.sections.map((section) => (section.type === type ? { ...section, title } : section)) };
}

// Fictional sample people used to fill the static template previews.

const financeSampleData: ResumeDataV1 = {
  name: "Daniel Okafor",
  title: "Senior Financial Analyst",
  contact: {
    email: "daniel.okafor@email.com",
    phone: "(312) 555-0148",
    location: "Chicago, IL",
    website: "linkedin.com/in/danielokafor",
  },
  summary:
    "Financial analyst with eight years of experience in corporate planning, forecasting, and performance reporting. Known for turning complex data into clear recommendations that guide budget decisions for leadership teams.",
  experience: [
    {
      role: "Senior Financial Analyst",
      company: "Northbridge Logistics",
      location: "Chicago, IL",
      start: "2021",
      end: "Present",
      highlights: [
        "Lead annual budgeting and quarterly reforecasting for a $240M operating unit across 14 regional sites.",
        "Built a rolling cash-flow model that cut forecast variance from 9% to 3% within two quarters.",
        "Present monthly performance reviews to the CFO and regional directors.",
      ],
    },
    {
      role: "Financial Analyst",
      company: "Harlow & Pierce",
      location: "Milwaukee, WI",
      start: "2018",
      end: "2021",
      highlights: [
        "Prepared variance analyses and management reports for five business units.",
        "Automated month-end reporting in Excel and Power BI, saving 20 hours per close cycle.",
        "Supported due diligence for two acquisitions valued at $65M combined.",
      ],
    },
    {
      role: "Junior Analyst",
      company: "Crescent Bank",
      location: "Milwaukee, WI",
      start: "2016",
      end: "2018",
      highlights: [
        "Maintained loan portfolio dashboards and supported credit risk reviews.",
        "Reconciled general ledger accounts and resolved discrepancies with accounting.",
      ],
    },
  ],
  education: [
    {
      degree: "B.S. Finance, minor in Economics",
      school: "University of Wisconsin–Madison",
      start: "2012",
      end: "2016",
      detail: "Graduated with honors",
    },
  ],
  skills: [
    "Financial modeling",
    "Forecasting",
    "Variance analysis",
    "Excel & VBA",
    "Power BI",
    "SQL",
    "SAP",
    "Stakeholder reporting",
  ],
  certifications: ["CFA Level II Candidate", "Financial Modeling & Valuation Analyst (FMVA)"],
};

const designSampleData: ResumeDataV1 = {
  name: "Maya Chen",
  title: "Product Designer",
  contact: {
    email: "maya.chen@email.com",
    phone: "(415) 555-0192",
    location: "San Francisco, CA",
    website: "mayachen.design",
  },
  summary:
    "Product designer with six years of experience shaping web and mobile products from early research to launch. I pair clear interaction design with close collaboration across engineering and product.",
  experience: [
    {
      role: "Senior Product Designer",
      company: "Lumen Health",
      location: "San Francisco, CA",
      start: "2022",
      end: "Present",
      highlights: [
        "Redesigned patient onboarding, increasing completion rates by 27%.",
        "Built and maintain a design system used by four product teams.",
        "Run monthly usability sessions and share findings with leadership.",
      ],
    },
    {
      role: "Product Designer",
      company: "Parcel",
      location: "Oakland, CA",
      start: "2019",
      end: "2022",
      highlights: [
        "Designed the merchant dashboard used by 30,000+ small businesses.",
        "Partnered with engineers to ship a mobile app rated 4.8 on the App Store.",
        "Introduced lightweight research sprints to validate ideas before build.",
      ],
    },
    {
      role: "UX Designer",
      company: "Brightside Studio",
      location: "San Jose, CA",
      start: "2018",
      end: "2019",
      highlights: [
        "Delivered wireframes, prototypes, and UI for twelve client projects.",
      ],
    },
  ],
  education: [
    {
      degree: "B.A. Interaction Design",
      school: "California College of the Arts",
      start: "2014",
      end: "2018",
    },
  ],
  skills: [
    "Product strategy",
    "Interaction design",
    "Prototyping",
    "Design systems",
    "User research",
    "Figma",
    "HTML & CSS",
  ],
  languages: ["English — Native", "Mandarin — Fluent"],
};

const engineeringSampleData: ResumeDataV1 = {
  name: "Elena Russo",
  title: "Software Engineer",
  contact: {
    email: "elena.russo@email.com",
    phone: "(206) 555-0137",
    location: "Seattle, WA",
    website: "github.com/elenarusso",
  },
  summary:
    "Backend-focused software engineer who enjoys building reliable, well-tested services. Experienced with distributed systems, APIs, and improving developer tooling.",
  experience: [
    {
      role: "Software Engineer II",
      company: "Cascade Cloud",
      location: "Seattle, WA",
      start: "2022",
      end: "Present",
      highlights: [
        "Own the billing events pipeline processing 40M events per day with 99.98% uptime.",
        "Reduced p95 API latency by 45% by redesigning caching and query patterns.",
        "Mentor two junior engineers and lead the team's code review guidelines.",
      ],
    },
    {
      role: "Software Engineer",
      company: "Tidewater Labs",
      location: "Portland, OR",
      start: "2020",
      end: "2022",
      highlights: [
        "Built internal REST and GraphQL APIs in Go and TypeScript.",
        "Introduced integration testing in CI, cutting production incidents by a third.",
      ],
    },
    {
      role: "Software Engineering Intern",
      company: "Pinecrest Systems",
      location: "Seattle, WA",
      start: "2019",
      end: "2019",
      highlights: [
        "Built a log search tool used daily by the on-call rotation.",
        "Wrote unit tests that raised coverage of the alerting service from 52% to 80%.",
      ],
    },
  ],
  education: [
    {
      degree: "B.S. Computer Science",
      school: "University of Washington",
      start: "2016",
      end: "2020",
    },
  ],
  skills: ["Go", "TypeScript", "PostgreSQL", "Kafka", "AWS", "Docker", "Kubernetes", "Terraform"],
  languages: ["English — Native", "Italian — Conversational"],
  certifications: ["AWS Certified Developer – Associate"],
};

/** Simple illustrated portrait used in place of a real photo in template previews. */
function avatar(background: string, skin: string, hair: string, shirt: string, longHair: boolean) {
  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>`,
    `<rect width='120' height='120' fill='${background}'/>`,
    longHair ? `<path d='M33 64c0-27 12-41 27-41s27 14 27 41v30H33z' fill='${hair}'/>` : "",
    `<path d='M16 120c5-23 23-33 44-33s39 10 44 33z' fill='${shirt}'/>`,
    `<rect x='51' y='70' width='18' height='19' rx='7' fill='${skin}'/>`,
    `<ellipse cx='60' cy='55' rx='19' ry='22' fill='${skin}'/>`,
    longHair
      ? `<path d='M40 54c0-17 9-26 20-26s20 9 20 26c-5-8-11-12-20-12s-15 4-20 12z' fill='${hair}'/>`
      : `<path d='M41 51c0-15 8-23 19-23s19 8 19 23c-4-6-10-8-19-8s-15 2-19 8z' fill='${hair}'/>`,
    `</svg>`,
  ].join("");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const marketingSampleData: ResumeDataV1 = {
  name: "Priya Raman",
  title: "Marketing Manager",
  contact: {
    email: "priya.raman@email.com",
    phone: "(646) 555-0173",
    location: "New York, NY",
    linkedin: "linkedin.com/in/priyaraman",
  },
  summary:
    "Marketing manager with seven years of experience leading brand and growth campaigns for consumer products. Comfortable owning strategy, budgets, and creative direction while keeping a close eye on results.",
  experience: [
    {
      role: "Marketing Manager",
      company: "Juniper Goods",
      location: "New York, NY",
      start: "2021",
      end: "Present",
      highlights: [
        "Lead a team of five across brand, content, and paid social with a $3.2M annual budget.",
        "Launched a loyalty program that grew repeat purchases by 34% in its first year.",
        "Rebuilt the email lifecycle program, lifting revenue per subscriber by 22%.",
      ],
    },
    {
      role: "Senior Marketing Specialist",
      company: "Brightwell Media",
      location: "Brooklyn, NY",
      start: "2018",
      end: "2021",
      highlights: [
        "Planned and ran integrated campaigns for 12 retail clients.",
        "Introduced A/B testing standards that improved landing page conversion by 18%.",
      ],
    },
    {
      role: "Marketing Coordinator",
      company: "Hollis & Grant",
      location: "Jersey City, NJ",
      start: "2017",
      end: "2018",
      highlights: ["Coordinated trade show presence and event marketing across the East Coast."],
    },
  ],
  education: [
    { degree: "B.A. Communications", school: "Boston University", start: "2013", end: "2017" },
  ],
  skills: ["Brand strategy", "Campaign planning", "Paid social", "Email marketing", "Google Analytics", "HubSpot", "Copywriting", "Budget management"],
  languages: ["English — Native", "Tamil — Fluent", "Spanish — Basic"],
  certifications: ["Google Ads Search Certification"],
};

const graduateSampleData: ResumeDataV1 = {
  name: "Lucas Moreau",
  title: "Computer Science Graduate",
  contact: {
    email: "lucas.moreau@email.com",
    phone: "(512) 555-0116",
    location: "Austin, TX",
    github: "github.com/lucasmoreau",
    linkedin: "linkedin.com/in/lucasmoreau",
  },
  summary:
    "Recent computer science graduate with internship experience in web development and a strong interest in building accessible, user-friendly products. Quick learner who enjoys working in small teams.",
  education: [
    {
      degree: "B.S. Computer Science",
      school: "University of Texas at Austin",
      start: "2021",
      end: "2025",
      detail: "GPA 3.7 · Dean's List",
    },
  ],
  experience: [
    {
      role: "Software Engineering Intern",
      company: "Bluebonnet Labs",
      location: "Austin, TX",
      start: "Summer 2024",
      end: "",
      highlights: [
        "Built React components for an internal analytics dashboard used by 60 staff.",
        "Wrote unit tests that raised coverage of the reporting module to 85%.",
      ],
    },
    {
      role: "Teaching Assistant, Data Structures",
      company: "UT Austin",
      location: "Austin, TX",
      start: "2023",
      end: "2025",
      highlights: ["Led weekly lab sessions for 40 students and held office hours."],
    },
  ],
  projects: [
    {
      name: "StudySync",
      subtitle: "React, Node.js, PostgreSQL",
      link: "github.com/lucasmoreau/studysync",
      start: "2024",
      description: "A study group scheduler used by 300+ students, with calendar sync and reminders.",
    },
    {
      name: "Accessible Campus Map",
      subtitle: "TypeScript, Leaflet",
      start: "2023",
      description: "Interactive map highlighting step-free routes across campus buildings.",
    },
  ],
  skills: ["JavaScript", "TypeScript", "React", "Python", "SQL", "Git", "Accessibility"],
  languages: ["English — Native", "French — Fluent"],
  customSections: [
    {
      title: "Leadership & Activities",
      items: [
        { title: "President, Women in Computing Allies", date: "2024 – 2025", description: "Organized a 150-person hackathon." },
      ],
    },
  ],
};

const businessGraduateSampleData: ResumeDataV1 = {
  name: "Amara Okeke",
  title: "Business Administration Graduate",
  contact: {
    email: "amara.okeke@email.com",
    phone: "(404) 555-0183",
    location: "Atlanta, GA",
    linkedin: "linkedin.com/in/amaraokeke",
  },
  summary:
    "Organized and detail-oriented business graduate seeking an entry-level operations or analyst role. Experienced in coordinating events, analyzing survey data, and presenting findings clearly.",
  education: [
    {
      degree: "B.B.A. Business Administration",
      school: "Georgia State University",
      start: "2021",
      end: "2025",
      detail: "Concentration in Operations Management",
    },
  ],
  experience: [
    {
      role: "Operations Intern",
      company: "Peachtree Logistics",
      location: "Atlanta, GA",
      start: "Summer 2024",
      end: "",
      highlights: [
        "Mapped warehouse intake steps and proposed changes that cut processing time by 12%.",
        "Built weekly inventory reports in Excel for the operations manager.",
      ],
    },
    {
      role: "Student Assistant",
      company: "GSU Career Services",
      location: "Atlanta, GA",
      start: "2022",
      end: "2025",
      highlights: ["Scheduled 500+ advising appointments and supported three career fairs a year."],
    },
  ],
  projects: [
    {
      name: "Campus Dining Survey",
      subtitle: "Capstone project",
      start: "2025",
      description: "Analyzed 1,200 survey responses and presented recommendations to dining services.",
    },
  ],
  skills: ["Excel", "Data analysis", "Event coordination", "Customer service", "Presentation", "Tableau"],
  certifications: ["Microsoft Office Specialist: Excel"],
  languages: ["English — Native", "Igbo — Conversational"],
};

const executiveSampleData: ResumeDataV1 = {
  name: "Margaret Ellison",
  title: "Chief Operating Officer",
  contact: {
    email: "m.ellison@email.com",
    phone: "(617) 555-0109",
    location: "Boston, MA",
    linkedin: "linkedin.com/in/margaretellison",
  },
  summary:
    "Operations executive with more than twenty years of experience scaling healthcare and technology organizations. Led companies through rapid growth, two acquisitions, and a successful public listing.",
  experience: [
    {
      role: "Chief Operating Officer",
      company: "Halcyon Health",
      location: "Boston, MA",
      start: "2018",
      end: "Present",
      highlights: [
        "Oversee operations for a 2,400-person organization with $640M in annual revenue.",
        "Led integration of two acquisitions, delivering $28M in annual cost savings.",
        "Built the operating cadence and leadership team ahead of the company's IPO.",
      ],
    },
    {
      role: "Senior Vice President, Operations",
      company: "Clearpoint Systems",
      location: "Cambridge, MA",
      start: "2011",
      end: "2018",
      highlights: [
        "Scaled customer operations from 80 to 600 people across three continents.",
        "Introduced a service quality program that raised NPS from 21 to 58.",
      ],
    },
    {
      role: "Director of Operations",
      company: "Northshore Medical Group",
      location: "Salem, MA",
      start: "2004",
      end: "2011",
      highlights: ["Managed operations for 14 clinics and a $90M budget."],
    },
  ],
  education: [
    { degree: "MBA", school: "Harvard Business School", start: "2002", end: "2004" },
    { degree: "B.A. Economics", school: "Tufts University", start: "1996", end: "2000" },
  ],
  skills: ["Operational strategy", "M&A integration", "P&L ownership", "Organizational design", "Board relations", "Change management"],
  customSections: [
    {
      title: "Board & Advisory",
      items: [
        { title: "Board Member", subtitle: "Boston Children's Literacy Fund", date: "2019 – Present" },
        { title: "Advisor", subtitle: "Healthcare Operations Council", date: "2016 – Present" },
      ],
    },
  ],
};

const projectManagerSampleData: ResumeDataV1 = {
  name: "James Whitaker",
  title: "Senior Project Manager",
  contact: {
    email: "james.whitaker@email.com",
    phone: "(303) 555-0158",
    location: "Denver, CO",
    linkedin: "linkedin.com/in/jameswhitaker",
  },
  summary:
    "PMP-certified project manager with twelve years of experience delivering construction and infrastructure programs on time and on budget.",
  experience: [
    {
      role: "Senior Project Manager",
      company: "Summit Infrastructure",
      location: "Denver, CO",
      start: "2020",
      end: "Present",
      highlights: [
        "Manage a $120M portfolio of transit and utility projects with 9 project leads.",
        "Delivered the Eastline station upgrade three weeks early and 4% under budget.",
        "Introduced earned value reporting adopted across the company.",
      ],
    },
    {
      role: "Project Manager",
      company: "Granite Peak Builders",
      location: "Boulder, CO",
      start: "2016",
      end: "2020",
      highlights: [
        "Ran commercial builds up to $35M, coordinating 20+ subcontractors.",
        "Cut change-order costs by 15% through earlier design reviews.",
      ],
    },
    {
      role: "Assistant Project Manager",
      company: "Front Range Construction",
      location: "Denver, CO",
      start: "2013",
      end: "2016",
      highlights: ["Prepared schedules, budgets, and RFIs for mid-size commercial projects."],
    },
    {
      role: "Project Engineer",
      company: "Clearwater Engineering",
      location: "Fort Collins, CO",
      start: "2011",
      end: "2013",
      highlights: ["Supported site inspections and quality control documentation."],
    },
  ],
  education: [
    { degree: "B.S. Civil Engineering", school: "Colorado State University", start: "2007", end: "2011" },
  ],
  skills: ["Program management", "Scheduling (P6)", "Budget control", "Risk management", "Contract negotiation", "Procore", "Stakeholder communication", "Earned value"],
  certifications: ["Project Management Professional (PMP)", "OSHA 30-Hour Construction"],
  projects: [
    { name: "Eastline Station Upgrade", subtitle: "$42M transit project", start: "2022", end: "2024", description: "Delivered accessibility and capacity upgrades while keeping the station open." },
  ],
};

const nurseSampleData: ResumeDataV1 = {
  name: "Sofia Alvarez",
  title: "Registered Nurse",
  contact: {
    email: "sofia.alvarez@email.com",
    phone: "(602) 555-0124",
    location: "Phoenix, AZ",
  },
  summary:
    "Compassionate registered nurse with six years of experience in medical-surgical and emergency care. Calm under pressure and committed to clear communication with patients and families.",
  experience: [
    {
      role: "Registered Nurse, Emergency Department",
      company: "Desert Valley Medical Center",
      location: "Phoenix, AZ",
      start: "2021",
      end: "Present",
      highlights: [
        "Provide care for up to 6 patients per shift in a 48-bed Level II trauma center.",
        "Precept new graduate nurses and lead monthly sepsis protocol refreshers.",
      ],
    },
    {
      role: "Registered Nurse, Medical-Surgical",
      company: "Saguaro Community Hospital",
      location: "Tempe, AZ",
      start: "2019",
      end: "2021",
      highlights: [
        "Managed care plans for post-operative patients on a 32-bed unit.",
        "Recognized with the unit's Patient Experience Award in 2020.",
      ],
    },
  ],
  education: [
    { degree: "B.S. Nursing", school: "Arizona State University", start: "2015", end: "2019" },
  ],
  skills: ["Triage", "Patient assessment", "IV therapy", "Epic EHR", "Wound care", "Patient education"],
  certifications: ["Registered Nurse, Arizona", "BLS & ACLS", "Trauma Nursing Core Course (TNCC)"],
  languages: ["English — Native", "Spanish — Native"],
};

export const financeSample = sample("finance", financeSampleData);
export const designSample = sample("design", designSampleData);
export const engineeringSample = sample("engineering", engineeringSampleData);
export const marketingSample = sample("marketing", marketingSampleData);
export const graduateSample = sample("graduate", graduateSampleData);
export const businessGraduateSample = sample("businessGraduate", businessGraduateSampleData);
export const executiveSample = sample("executive", executiveSampleData);
export const projectManagerSample = sample("projectManager", projectManagerSampleData);
export const nurseSample = sample("nurse", nurseSampleData);

// Illustrated portraits for photo templates. Passed to previews as image URLs;
// they are not stored data, so they bypass the stored-photo validation.
export const samplePhotos = {
  nurse: avatar("#e8efe9", "#c99a7a", "#3b2a20", "#2f5d50", true),
  design: avatar("#eef4f2", "#e3b896", "#1f1a17", "#2c6e66", true),
  marketing: avatar("#f3eee6", "#a8714f", "#1b1412", "#7c2d12", true),
  finance: avatar("#e6ebf2", "#7a4b32", "#1a1210", "#1f2a44", false),
  projectManager: avatar("#ece9f5", "#efc9a8", "#7a5230", "#3f3d56", false),
};

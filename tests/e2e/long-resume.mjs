export function longResume(photo) {
const exp = (i) => ({ id: "e" + i, role: "Senior Platform Engineer " + i, company: "Company Number " + i, location: "Remote", startDate: "201" + (i % 10), endDate: "Present",
  highlights: ["Led the migration of a monolith to event-driven services, cutting p95 latency by 45% and infrastructure cost by 30% across four regions.", "Mentored eight engineers; introduced design reviews and an on-call rotation that halved incident time.", "See https://example.com/a/very/long/url/that/should/wrap/" + "segment".repeat(8)] });
const long = { schemaVersion: 2, id: "long", name: "Long", createdAt: 1, updatedAt: 2,
  profile: { fullName: "Alexandra Montgomery-Wellington", jobTitle: "Principal Engineer", email: "alexandra@example.com", phone: "+1 555 0100", location: "Seattle, WA", linkedin: "linkedin.com/in/alexandra", github: "github.com/alexandra", website: "https://alexandra.example.com/portfolio",
    photo: { id: "ph", mimeType: "image/jpeg", width: 400, height: 400, byteSize: 9000, updatedAt: 1, inlineData: photo } },
  sections: [
    { id: "s1", type: "summary", title: "Profile", visible: true, content: "Engineer with fifteen years of experience building reliable distributed systems. ".repeat(6) + "Supercalifragilisticexpialidocious".repeat(3) },
    { id: "s2", type: "experience", title: "Experience", visible: true, entries: Array.from({ length: 9 }, (_, i) => exp(i)) },
    { id: "s3", type: "education", title: "Education", visible: true, entries: Array.from({ length: 4 }, (_, i) => ({ id: "ed" + i, degree: "M.S. Computer Science " + i, school: "University " + i, startDate: "2000", endDate: "2004", details: "Thesis on consensus" })) },
    { id: "s4", type: "skills", title: "Skills", visible: true, entries: Array.from({ length: 24 }, (_, i) => ({ id: "sk" + i, name: "Skill " + i })) },
    { id: "s5", type: "projects", title: "Projects", visible: true, entries: [{ id: "p1", name: "Open source CLI", role: "Rust", link: "github.com/alexandra/cli", description: "A fast tool." }] },
    { id: "s6", type: "languages", title: "Languages", visible: true, entries: [{ id: "l1", name: "English", proficiency: "Native" }] },
    { id: "s7", type: "certifications", title: "Certifications", visible: true, entries: [{ id: "c1", name: "CKA", issuer: "CNCF", date: "2023" }] },
    { id: "s8", type: "custom", title: "Final Marker Section", visible: true, entries: [{ id: "x1", title: "ZZ-END-MARKER", description: "Last item in the document." }] },
  ], design: { templateId: "professional", pageSize: "letter" } };
return long;
}

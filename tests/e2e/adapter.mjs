// Maps stored v2 data to the v1-like shape older test suites assert against.
export const readStored = (page) => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("folio.resumes.v2") ?? "null");
  if (!raw) return null;
  return { resumes: raw.resumes.map((r) => {
    const sec = (t) => r.sections.find((s) => s.type === t);
    return { id: r.id, name: r.name, template: r.design.templateId, pageSize: r.design.pageSize, data: {
      name: r.profile.fullName, title: r.profile.jobTitle, photo: r.profile.photo,
      skills: (sec("skills")?.entries ?? []).map((e) => e.name), experience: sec("experience")?.entries ?? [] } };
  }) };
});

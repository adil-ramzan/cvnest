import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { templates } from "@/data/templates";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/templates", "/free", "/about", "/contact", "/privacy", "/terms"];
  return [
    ...pages.map((path) => ({ url: new URL(path, site.url).toString() })),
    ...templates.map((template) => ({ url: new URL(`/templates/${template.slug}`, site.url).toString() })),
  ];
}

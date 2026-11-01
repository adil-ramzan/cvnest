import type { MetadataRoute } from "next";
import { site } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  // Crawlers have to fetch a page to read its noindex, so nothing is blocked while indexing is off.
  if (!site.indexable) return { rules: { userAgent: "*", allow: "/" } };

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/editor", "/sign-in"] },
    sitemap: new URL("/sitemap.xml", site.url).toString(),
  };
}

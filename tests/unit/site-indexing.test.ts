import assert from "node:assert/strict";
import { describe, it } from "node:test";
import robots from "@/app/robots";
import { site } from "@/data/site";

describe("search engine indexing", () => {
  it("is off unless a build opts in", () => {
    assert.equal(site.indexable, false);
  });

  it("lets crawlers reach pages while indexing is off, so they can read noindex", () => {
    assert.deepEqual(robots().rules, { userAgent: "*", allow: "/" });
  });

  it("does not advertise a sitemap of noindex pages", () => {
    assert.equal(robots().sitemap, undefined);
  });

  it("never falls back to a real public domain", () => {
    assert.equal(new URL(site.url).hostname, "localhost");
  });
});

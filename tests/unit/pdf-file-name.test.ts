import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pdfFileName } from "@/lib/pdf-file-name";

const file = (name: string, fullName = "Maya Chen") => pdfFileName({ name, profile: { fullName } });

describe("pdfFileName", () => {
  it("uses the resume's own name", () => {
    assert.equal(file("Software Engineer Resume"), "Software Engineer Resume");
    assert.equal(file("Frontend Developer CV"), "Frontend Developer CV");
    assert.equal(file("Adil Ramzan – Job Application"), "Adil Ramzan – Job Application");
  });

  it("falls back to the name on the resume for an unnamed resume", () => {
    assert.equal(file("Untitled resume"), "Maya-Chen-Resume");
    assert.equal(file("   "), "Maya-Chen-Resume");
    assert.equal(file("Untitled resume", ""), "CVNest-Resume");
  });

  it("removes characters file systems refuse", () => {
    assert.equal(file('Dev: "Lead" / Ops*?<>|'), "Dev Lead Ops");
    assert.equal(file("a\\b#c%d{e}f^g~h[i]j`k"), "a b c d e f g h i j k");
    assert.equal(file("Line\none\ttwo"), "Line one two");
    assert.equal(file("Bidi‮fdp.exe"), "Bidi fdp.exe");
  });

  it("never ends up empty", () => {
    assert.equal(file('///:::***'), "Maya-Chen-Resume");
    assert.equal(file("...", ""), "CVNest-Resume");
  });

  it("adds no extension, so .pdf is added exactly once", () => {
    assert.equal(file("My CV.pdf"), "My CV");
    assert.equal(file("My CV.PDF.pdf"), "My CV");
    assert.equal(`${file("My CV.pdf")}.pdf`, "My CV.pdf");
  });

  it("drops leading dots and trailing dots or spaces", () => {
    assert.equal(file(".hidden"), "hidden");
    assert.equal(file("Resume...  "), "Resume");
  });

  it("avoids names Windows reserves", () => {
    assert.equal(file("CON"), "Maya-Chen-Resume");
    assert.equal(file("lpt1"), "Maya-Chen-Resume");
  });

  it("caps the length without splitting a character", () => {
    const long = file("é".repeat(100));
    assert.equal(Array.from(long).length, 80);
    assert.equal(file(`${"a".repeat(79)}😀😀`), `${"a".repeat(79)}😀`);
  });

  it("keeps a copy's name", () => {
    assert.equal(file("Frontend Developer CV (copy)"), "Frontend Developer CV (copy)");
  });
});

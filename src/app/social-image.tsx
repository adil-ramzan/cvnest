import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { homeCopy } from "@/data/copy";
import { SITE_NAME } from "@/data/site";

export const socialImageSize = { width: 1200, height: 630 };
export const socialImageAlt = `${SITE_NAME}: ${homeCopy.hero.eyebrow.toLowerCase()}`;

const INK = "#14213d";
const TEAL = "#0f766e";
const line = (width: string, color = "#d9d4de") => <div style={{ width, height: 12, borderRadius: 6, backgroundColor: color, marginTop: 18 }} />;

/** Original artwork: the brand name, the headline and a simple page, drawn at build time. */
export async function socialImage() {
  const font = await readFile(join(process.cwd(), "src/assets/PlusJakartaSans-Bold.woff"));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#eeece9", padding: "0 90px", fontFamily: "Jakarta", color: INK }}>
      <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
        <div style={{ fontSize: 40, color: TEAL }}>{SITE_NAME}</div>
        <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: -2, marginTop: 28 }}>{homeCopy.hero.title}</div>
        <div style={{ fontSize: 34, marginTop: 32, color: "#5b6472" }}>{homeCopy.hero.eyebrow}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 330, height: 430, backgroundColor: "#ffffff", borderRadius: 18, padding: 42 }}>
        <div style={{ width: 170, height: 22, borderRadius: 11, backgroundColor: INK }} />
        {line("110px", TEAL)}
        <div style={{ height: 34 }} />
        {line("100%")}
        {line("100%")}
        {line("78%")}
        <div style={{ height: 30 }} />
        {line("100%")}
        {line("90%")}
        {line("60%")}
      </div>
    </div>,
    { ...socialImageSize, fonts: [{ name: "Jakarta", data: font, weight: 700, style: "normal" }] },
  );
}

import { Fragment } from "react";
import { safeHref } from "@/lib/links";

/** Shorter values fit every template, and splitting their text would shift the letters slightly. */
const LONG_EMAIL = 28;
const LONG_URL = 33;

/** After @, ://, a single slash or a query character, and before a dot. */
const BREAK_POINTS = /(?<=@|:\/\/|[^:/]\/|[?&=#])|(?=\.)/;

const isLongAddress = (value: string) => {
  if (/\s/.test(value)) return false;
  if (value.includes("@")) return value.length >= LONG_EMAIL;
  return value.length >= LONG_URL && /\/|\.[a-z]{2,}/i.test(value);
};

/** Lets a long email or URL wrap at its separators instead of mid-word. */
function BreakableText({ value }: { value: string }) {
  if (!isLongAddress(value)) return <>{value}</>;
  return value.split(BREAK_POINTS).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ));
}

/** Shows text as a real link in the preview and PDF. Thumbnails sit inside links, so `links` is off there. */
export function LinkText({ value, links }: { value: string; links?: boolean }) {
  const href = links ? safeHref(value) : null;
  if (!href) return <BreakableText value={value} />;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <BreakableText value={value} />
    </a>
  );
}

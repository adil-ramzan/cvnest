import { safeHref } from "@/lib/links";

/** Shows text as a real link in the preview and PDF. Thumbnails sit inside links, so `links` is off there. */
export function LinkText({ value, links }: { value: string; links?: boolean }) {
  const href = links ? safeHref(value) : null;
  if (!href) return <>{value}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {value}
    </a>
  );
}

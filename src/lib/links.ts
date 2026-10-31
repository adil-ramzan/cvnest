/** Turns text from a URL or email field into a safe link, or null if it can't be one. */
const EMAIL = /^[^\s@/:]+@[^\s@/:]+\.[a-z]{2,}$/i;
const BARE_DOMAIN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

const parsed = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export function safeHref(value: string | undefined): string | null {
  const text = value?.trim() ?? "";
  // Whitespace and control characters are how "java\nscript:" slips past simple checks.
  if (!text || /[\s\u0000-\u001f<>"'`\\]/.test(text)) return null;
  if (EMAIL.test(text)) return `mailto:${text}`;
  if (BARE_DOMAIN.test(text)) return `https://${text}`;
  const url = parsed(text);
  if (!url) return null;
  if (url.protocol === "mailto:") return EMAIL.test(url.pathname) ? url.href : null;
  return (url.protocol === "https:" || url.protocol === "http:") && url.hostname ? url.href : null;
}

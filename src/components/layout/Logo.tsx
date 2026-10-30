import Link from "next/link";
import { site } from "@/data/site";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-md bg-ink font-serif text-base font-semibold text-white"
      >
        {site.name[0]}
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight text-ink">{site.name}</span>
    </Link>
  );
}

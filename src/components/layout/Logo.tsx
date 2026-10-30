import Link from "next/link";
import { site } from "@/data/site";

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[10px] bg-ink text-base font-bold text-white">
        {site.name[0]}
      </span>
      <span className="text-xl font-bold tracking-tight text-ink">{site.name}</span>
    </Link>
  );
}

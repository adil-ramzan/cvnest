"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { mainNav } from "@/data/site";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/sign-in" variant="ghost" size="sm">
            Sign In
          </ButtonLink>
          <ButtonLink href="/editor" size="sm">
            Create Resume
          </ButtonLink>
        </div>

        <button
          type="button"
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-md text-ink hover:bg-ink/5 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </Container>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-line bg-canvas md:hidden">
          <Container className="py-4">
            <nav aria-label="Mobile">
              <ul className="space-y-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className="block rounded-md px-3 py-2.5 text-base text-ink-soft hover:bg-ink/5 aria-[current=page]:font-medium aria-[current=page]:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 grid gap-2 border-t border-line pt-4">
              <ButtonLink href="/sign-in" variant="secondary" onClick={() => setMenuOpen(false)}>
                Sign In
              </ButtonLink>
              <ButtonLink href="/editor" onClick={() => setMenuOpen(false)}>
                Create Resume
              </ButtonLink>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}

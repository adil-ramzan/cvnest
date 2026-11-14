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
  const pathname = usePathname();
  // The page the menu was opened on, so it closes itself on navigation.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;
  const setMenuOpen = (open: boolean) => setOpenedOn(open ? pathname : null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpenedOn(null);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 bg-canvas pt-3 pb-2">
      <Container>
        <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-6 rounded-2xl bg-surface px-4 shadow-soft md:grid-cols-[1fr_auto_1fr] md:px-5">
          <Logo />

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="rounded-lg px-3 py-2 text-base font-medium text-muted transition-colors duration-150 ease-out hover:bg-accent-soft/55 hover:text-ink active:bg-accent-soft/80 active:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center justify-end gap-2 md:flex">
            <ButtonLink href="/editor" size="sm">
              Create Resume
            </ButtonLink>
          </div>

          <button
            type="button"
            className="-mr-1 inline-flex size-11 items-center justify-center justify-self-end rounded-[14px] text-ink transition-colors duration-150 ease-out hover:bg-ink/5 active:bg-ink/10 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            {menuOpen ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="mt-2 animate-menu rounded-2xl bg-surface p-4 shadow-pop md:hidden">
            <nav aria-label="Mobile">
              <ul className="space-y-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className="block rounded-lg px-3 py-2.5 text-base text-ink-soft transition-colors duration-150 ease-out hover:bg-accent-soft/55 hover:text-ink active:bg-accent-soft/80 active:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 grid gap-2 border-t border-line pt-4">
              <ButtonLink href="/editor" onClick={() => setMenuOpen(false)}>
                Create Resume
              </ButtonLink>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}

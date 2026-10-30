import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { footerNav, site } from "@/data/site";
import { Logo } from "./Logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-base leading-relaxed text-muted">
              {site.name} is a free online resume builder: 45 free templates, no watermarks, no subscription and no
              account required.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-3">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-muted transition-colors hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
          © {year} {site.name}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}

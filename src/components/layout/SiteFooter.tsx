import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { footerNav, site } from "@/data/site";
import { templates } from "@/data/templates";
import { Logo } from "./Logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-base leading-relaxed text-muted">
              {site.name} is a free online resume builder with {templates.length} templates, no watermarks and no account to create.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerNav.map((group) => (
              <div key={group.title}>
                <h2 className="text-small font-bold text-ink">{group.title}</h2>
                <ul className="mt-3 space-y-2.5">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-base text-muted transition-colors hover:text-ink">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-base text-muted">
          © {year} {site.name}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}

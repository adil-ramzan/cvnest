import { SimplePage } from "@/components/layout/SimplePage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <SimplePage eyebrow="404" title="Page not found" intro="The page you are looking for does not exist or has moved.">
          <ButtonLink href="/">Back to Home</ButtonLink>
        </SimplePage>
      </main>
      <SiteFooter />
    </>
  );
}

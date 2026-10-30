import { BadgeCheck, LockKeyhole, ScanText } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";

const values = [
  { icon: BadgeCheck, title: "Free to use", description: "Every template and the PDF export cost nothing." },
  { icon: LockKeyhole, title: "Private by default", description: "Your resume is saved in your browser, not on our servers." },
  { icon: ScanText, title: "ATS-friendly layouts", description: "Single-column templates use standard headings and real text." },
];

export function ValueProps() {
  return (
    <section aria-label="Why use this builder">
      <Container>
        <ul className="grid gap-5 md:grid-cols-3">
          {values.map((value) => (
            <li key={value.title}>
              <FeatureCard {...value} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

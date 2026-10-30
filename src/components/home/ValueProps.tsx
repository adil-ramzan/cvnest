import { BadgeCheck, LockKeyhole, ScanText } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { homeCopy } from "@/data/copy";

const icons = [BadgeCheck, LockKeyhole, ScanText];

export function ValueProps() {
  const { values } = homeCopy;

  return (
    <section aria-label={values.label}>
      <Container>
        <ul className="grid gap-5 md:grid-cols-3">
          {values.items.map((value, index) => (
            <li key={value.title}>
              <FeatureCard icon={icons[index]} {...value} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

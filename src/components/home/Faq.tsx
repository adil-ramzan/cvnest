"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { Section } from "@/components/ui/Section";
import { sectionTitle } from "@/components/ui/SectionHeading";
import { focusRing } from "@/components/ui/styles";
import { homeCopy } from "@/data/copy";
import { FaqItem } from "./FaqItem";

const { faq } = homeCopy;
const tabId = (id: string) => `faq-tab-${id}`;
const panelId = (id: string) => `faq-panel-${id}`;

/**
 * Questions grouped into topics. The topics are tabs (arrow keys, Home and End move between
 * them), and each shows its questions as an accordion with one open at a time: the first
 * when the page loads and whenever the topic changes.
 */
export function Faq() {
  const [active, setActive] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    setActive(index);
    setOpenIndex(0);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = faq.categories.length - 1;
    const next =
      event.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
    tabs.current[next]?.focus();
  };

  return (
    <Section labelledBy="faq-heading">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:items-start lg:gap-16">
        <div className="lg:sticky lg:top-30">
          <p className="text-small font-bold tracking-wide text-muted uppercase">{faq.eyebrow}</p>
          <h2 id="faq-heading" className={`mt-3 ${sectionTitle} text-balance text-ink`}>
            {faq.title}
          </h2>
          <p className="mt-4 text-body text-pretty text-muted">{faq.description}</p>
          <div role="tablist" aria-label="Question topics" className="mt-6 flex flex-wrap gap-2">
            {faq.categories.map((category, index) => {
              const selected = index === active;
              return (
                <button
                  key={category.id}
                  ref={(element) => {
                    tabs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(category.id)}
                  aria-selected={selected}
                  aria-controls={panelId(category.id)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={onTabKeyDown}
                  className={`rounded-full border px-4 py-2 text-base font-medium transition-colors motion-reduce:transition-none ${focusRing} ${
                    selected ? "border-ink bg-ink text-white" : "border-line bg-transparent text-ink hover:border-ink/35 hover:bg-surface active:bg-surface"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
        {faq.categories.map((category, index) => (
          <div
            key={category.id}
            id={panelId(category.id)}
            role="tabpanel"
            aria-labelledby={tabId(category.id)}
            hidden={index !== active}
            className="divide-y divide-line border-y border-line"
          >
            {category.items.map((item, itemIndex) => (
              <FaqItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                open={index === active && openIndex === itemIndex}
                onToggle={() => setOpenIndex((current) => (current === itemIndex ? null : itemIndex))}
              />
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

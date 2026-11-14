"use client";

import { Plus } from "lucide-react";
import { useId } from "react";
import { focusRing } from "@/components/ui/styles";

type FaqItemProps = { question: string; answer: string; open: boolean; onToggle: () => void };

/**
 * One question. Open and closed are decided by the list, so only one is open at a time.
 * The answer's height animates by growing a grid row from 0fr to 1fr; with reduced
 * motion it simply appears. A closed answer is inert, so it can't be reached or read.
 */
export function FaqItem({ question, answer, open, onToggle }: FaqItemProps) {
  const panelId = useId();

  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={`-mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-6 rounded-lg px-3 py-4.5 text-left text-lg font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.04] hover:text-accent-ink active:bg-ink/[0.07] active:text-accent-ink lg:text-xl ${focusRing}`}
        >
          {question}
          <Plus
            aria-hidden="true"
            className={`size-5 shrink-0 text-current transition-[rotate,transform] duration-150 motion-reduce:transition-none ${open ? "rotate-45" : ""}`}
          />
        </button>
      </h3>
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pr-10 pb-5 text-base leading-[1.6] text-pretty text-muted">{answer}</p>
        </div>
      </div>
    </div>
  );
}

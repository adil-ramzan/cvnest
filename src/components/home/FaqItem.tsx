"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { focusRing } from "@/components/ui/styles";

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={`flex w-full items-center justify-between gap-6 rounded-lg py-5 text-left text-title text-ink ${focusRing}`}
        >
          {question}
          <Plus aria-hidden="true" className={`size-6 shrink-0 text-accent transition-transform motion-reduce:transition-none ${open ? "rotate-45" : ""}`} />
        </button>
      </h3>
      <div id={panelId} hidden={!open}>
        <p className="max-w-2xl pr-10 pb-6 text-body text-pretty text-muted">{answer}</p>
      </div>
    </div>
  );
}

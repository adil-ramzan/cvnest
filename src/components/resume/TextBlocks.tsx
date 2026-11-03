import { Fragment, type ReactNode } from "react";
import { longTextClass, type TextBlock } from "./prepareResume";

/** Free text in the order it was written: paragraphs in `className`, lists in the template's own bullets. */
export function TextBlocks({ blocks, className, bullets }: { blocks: TextBlock[]; className: string; bullets: (items: string[]) => ReactNode }) {
  return blocks.map((block, i) =>
    block.kind === "text" ? (
      <p key={i} className={`${className} whitespace-pre-line${longTextClass(block.text)}`}>
        {block.text}
      </p>
    ) : (
      <Fragment key={i}>{bullets(block.items)}</Fragment>
    ),
  );
}

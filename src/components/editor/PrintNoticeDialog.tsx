"use client";

import { useState } from "react";
import { Dialog, dialogButtonClass } from "./Dialog";

type PrintNoticeDialogProps = {
  /** Open while set. `touch`: a phone or tablet, whose print screen is worded differently. */
  notice: { touch: boolean } | null;
  fileName: string;
  onClose: () => void;
  onContinue: (hideNextTime: boolean) => void;
};

/**
 * Said before the browser's print window opens, since that window is where the PDF is
 * actually saved. Not shown for Ctrl/Cmd+P, or once the person ticks "Don't show this again".
 */
export function PrintNoticeDialog({ notice, fileName, onClose, onContinue }: PrintNoticeDialogProps) {
  const [hideNextTime, setHideNextTime] = useState(false);

  const description = notice?.touch
    ? `On Android, choose “Save as PDF” as the printer. On iPhone or iPad, tap Share, then Save to Files. Your browser may suggest the name “${fileName}”.`
    : `In the next window, choose “Save as PDF” as the destination. Your browser may suggest the name “${fileName}”.`;

  return (
    <Dialog open={notice !== null} onClose={onClose} title="Save as PDF" description={description}>
      <p className="mt-3 text-sm text-muted">Your resume stays in your browser.</p>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink pointer-coarse:min-h-11">
        <input type="checkbox" checked={hideNextTime} onChange={(event) => setHideNextTime(event.target.checked)} className="size-4 accent-accent" />
        Don&apos;t show this again
      </label>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" autoFocus onClick={() => onContinue(hideNextTime)} className={dialogButtonClass.primary}>
          Continue
        </button>
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Dialog, dialogButtonClass } from "./Dialog";

type LeaveGuardDialogProps = {
  open: boolean;
  /** Saving to this browser is failing, not just unbacked-up. */
  saveFailed: boolean;
  onDownloadBackup: () => Promise<void>;
  onSavePdf: () => void;
  onStay: () => void;
  onLeave: () => void;
};

/** Asks before in-app navigation while work is at risk. Escape and the backdrop mean stay. */
export function LeaveGuardDialog({ open, saveFailed, onDownloadBackup, onSavePdf, onStay, onLeave }: LeaveGuardDialogProps) {
  const [backedUp, setBackedUp] = useState(false);
  const close = () => {
    setBackedUp(false);
    onStay();
  };

  if (backedUp) {
    return (
      <Dialog open={open} onClose={close} title="Backup downloaded. Leave now?">
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className={dialogButtonClass.secondary}>
            Stay
          </button>
          <button
            type="button"
            data-autofocus
            onClick={() => {
              setBackedUp(false);
              onLeave();
            }}
            className={dialogButtonClass.primary}
          >
            Leave
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Leave without saving a copy?"
      description={
        saveFailed
          ? "Saving to this browser failed. Download a backup so you don’t lose your latest changes."
          : "Your resume is stored only in this browser. Download a backup so you don’t lose it."
      }
    >
      <div className="mt-6 grid gap-2">
        <button
          type="button"
          data-autofocus
          onClick={async () => {
            await onDownloadBackup();
            setBackedUp(true);
          }}
          className={dialogButtonClass.primary}
        >
          Download backup
        </button>
        <button type="button" onClick={onSavePdf} className={dialogButtonClass.secondary}>
          Save as PDF
        </button>
        <button type="button" onClick={close} className={dialogButtonClass.secondary}>
          Stay and keep editing
        </button>
        <button type="button" onClick={onLeave} className="mt-1 justify-self-center rounded-lg px-2 py-2 text-[0.875rem] text-muted underline underline-offset-4 hover:text-ink">
          Leave anyway
        </button>
      </div>
    </Dialog>
  );
}

"use client";

import { Download, HardDrive, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { buttonClass } from "@/components/ui/styles";
import type { Resume } from "@/data/resume";
import { site } from "@/data/site";
import { backupFileName, createBackup, downloadTextFile } from "@/lib/backup";
import { readRawResumes } from "@/lib/resume-storage";

type StorageRecoveryProps = {
  reason: "full" | "blocked";
  /** What could still be read. Usually all of it when storage is full; nothing when it's blocked. */
  resumes: Resume[];
};

/**
 * Shown instead of the editor when this browser won't let the site save anything. It
 * never writes to storage and never offers a blank resume to type into, so nothing the
 * person has saved can be overwritten or mistaken for lost.
 */
export function StorageRecovery({ reason, resumes }: StorageRecoveryProps) {
  const [downloaded, setDownloaded] = useState(false);
  const count = resumes.length;

  const download = async () => {
    // The stored text goes in as well, exactly as it is, so the file holds everything.
    downloadTextFile(backupFileName(site.name), await createBackup(resumes, { storedText: readRawResumes() }));
    setDownloaded(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-4 pt-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-xl rounded-[22px] bg-surface p-6 shadow-soft sm:p-8" role="alert">
          <HardDrive aria-hidden="true" className="size-7 text-[#b54708]" />
          <h1 className="mt-4 text-2xl font-bold text-ink">Your saved resumes are still in this browser</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {reason === "full"
              ? `This browser's storage for ${site.name} is full, so nothing new can be saved and the editor can't open. Nothing has been deleted.`
              : `This browser is blocking ${site.name} from using its storage, so the editor can't open your resumes or save anything. Nothing has been deleted.`}
          </p>

          <h2 className="mt-6 text-lg font-bold text-ink">What to do</h2>
          {reason === "full" ? (
            <ol className="mt-2 list-decimal space-y-3 pl-5 text-base leading-relaxed text-ink-soft">
              <li>
                {count > 0 ? (
                  <>
                    Download a backup file. It holds {count === 1 ? "your resume" : `all ${count} of your resumes`} and their photos.
                    <div className="mt-2">
                      <button type="button" onClick={download} className={buttonClass("primary", "sm")}>
                        <Download aria-hidden="true" className="size-4" />
                        Download backup file
                      </button>
                      {downloaded && (
                        <p role="status" className="mt-2 text-[0.875rem] text-muted">
                          Check your downloads for {backupFileName(site.name)}.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  "No resumes could be read to put in a backup file. If you already have a backup file, keep it safe."
                )}
              </li>
              <li>Free up space: if your device is nearly full, delete some files you don&apos;t need, then reload this page.</li>
              <li>
                If it&apos;s still full, clear this site&apos;s data in your browser settings, reload, and use Restore from backup with
                your backup file. Only do this once your backup file has downloaded.
              </li>
            </ol>
          ) : (
            <ol className="mt-2 list-decimal space-y-3 pl-5 text-base leading-relaxed text-ink-soft">
              <li>Allow this site to store data. Check your browser&apos;s privacy or cookie settings, and leave private browsing if you&apos;re using it.</li>
              <li>Then reload this page. Your resumes will open as before.</li>
              <li>If you have a backup file, you can restore it once storage works again.</li>
            </ol>
          )}

          <button type="button" onClick={() => window.location.reload()} className={buttonClass("secondary", "md", "mt-6")}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Reload
          </button>
        </div>
      </main>
    </div>
  );
}

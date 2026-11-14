import { site } from "@/data/site";

// ACCOUNTS: this file describes browser-only storage with no account or cloud sync.
const PRIVACY_STATEMENT ="Your resume data is stored locally in this browser. It is not uploaded to our servers.";

/** Full explanation shown on the Overview tab. */
export function PrivacyDetails() {
  return (
    <div className="space-y-3 text-base leading-relaxed text-ink-soft">
      <p className="font-medium text-ink">{PRIVACY_STATEMENT}</p>
      <ul className="list-disc space-y-2 pl-5 marker:text-line-strong">
        <li>
          When the browser allows it, resumes are saved automatically in its local storage, and profile photos in its
          IndexedDB storage. {site.name} doesn&apos;t send them anywhere, and there is no account or cloud sync. Browser extensions and
          browser sync are outside our control.
        </li>
        <li>
          Saved resumes only exist in this browser on this device. They will not appear in another browser, on another
          device, or in a private window.
        </li>
        <li>
          Clearing your browsing data or site data for this website will permanently remove your saved resumes. Some
          browsers may also clear storage for sites you have not visited in a while.
        </li>
        <li>
          Browser storage is not encrypted. Anyone with access to this browser profile could read it, so avoid editing
          on shared or public computers.
        </li>
        <li>Download a backup from time to time. It&apos;s the only file you can restore into the editor.</li>
      </ul>
    </div>
  );
}

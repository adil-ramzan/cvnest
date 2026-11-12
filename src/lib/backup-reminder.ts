/**
 * When to remind someone to download a backup. Pure, so the schedule is tested
 * without a browser or a real clock.
 *
 * - Dismissing the reminder snoozes it for 7 days; it is never hidden for good.
 * - With no backup yet, it shows whenever it isn't snoozed.
 * - After a backup, it comes back once edits are 14 or more days newer than that backup.
 */

const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_SNOOZE_MS = 7 * DAY;
export const STALE_BACKUP_MS = 14 * DAY;

export type ReminderInput = {
  /** When the last backup was downloaded, or null if never. */
  lastBackupAt: number | null;
  /** Snoozed until this time, or null. */
  remindAfter: number | null;
  /** The latest edit to any resume. */
  lastEditAt: number;
  /** False for an empty resume: there is nothing to back up yet. */
  hasContent: boolean;
  now: number;
};

export function shouldShowBackupReminder({ lastBackupAt, remindAfter, lastEditAt, hasContent, now }: ReminderInput): boolean {
  if (!hasContent) return false;
  if (remindAfter !== null && now < remindAfter) return false;
  if (lastBackupAt === null) return true;
  return lastEditAt - lastBackupAt >= STALE_BACKUP_MS;
}

/** The snooze a dismissal sets. */
export const snoozeUntil = (now: number) => now + REMINDER_SNOOZE_MS;

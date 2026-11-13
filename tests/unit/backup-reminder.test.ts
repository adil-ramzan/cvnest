import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { REMINDER_SNOOZE_MS, shouldShowBackupReminder, snoozeUntil, STALE_BACKUP_MS } from "@/lib/backup-reminder";
import { requestStorageProtection, shouldRequestPersistence, storageProtection } from "@/lib/persistence";
import { loadBackupState, saveBackupState } from "@/lib/resume-storage";

const DAY = 24 * 60 * 60 * 1000;
const base = { lastBackupAt: null, remindAfter: null, lastEditAt: 100 * DAY, hasContent: true, now: 100 * DAY };

describe("shouldShowBackupReminder", () => {
  it("shows for a resume with content and no backup yet", () => {
    assert.equal(shouldShowBackupReminder(base), true);
  });

  it("never shows for an empty resume", () => {
    assert.equal(shouldShowBackupReminder({ ...base, hasContent: false }), false);
  });

  it("a dismissal snoozes it for exactly 7 days, then it returns (never hidden for good)", () => {
    const dismissedAt = 100 * DAY;
    const remindAfter = snoozeUntil(dismissedAt);
    assert.equal(remindAfter - dismissedAt, REMINDER_SNOOZE_MS);
    assert.equal(shouldShowBackupReminder({ ...base, remindAfter, now: dismissedAt + 6 * DAY }), false);
    assert.equal(shouldShowBackupReminder({ ...base, remindAfter, now: remindAfter - 1 }), false);
    assert.equal(shouldShowBackupReminder({ ...base, remindAfter, now: remindAfter }), true);
    assert.equal(shouldShowBackupReminder({ ...base, remindAfter, now: dismissedAt + 365 * DAY }), true);
  });

  it("after a backup, stays away until edits are 14 or more days newer than it", () => {
    const lastBackupAt = 100 * DAY;
    const at = (editDays: number) => shouldShowBackupReminder({ ...base, lastBackupAt, lastEditAt: lastBackupAt + editDays * DAY, now: lastBackupAt + 30 * DAY });
    assert.equal(at(0), false);
    assert.equal(at(13), false);
    assert.equal(at(13.99), false);
    assert.equal(at(14), true);
    assert.equal(at(20), true);
    assert.equal(STALE_BACKUP_MS, 14 * DAY);
  });

  it("an old backup with no edits since doesn't nag, however long ago it was", () => {
    assert.equal(shouldShowBackupReminder({ ...base, lastBackupAt: 10 * DAY, lastEditAt: 5 * DAY, now: 400 * DAY }), false);
  });

  it("a snooze also holds back the 14-day reminder until it ends", () => {
    const input = { ...base, lastBackupAt: 0, lastEditAt: 20 * DAY, remindAfter: 30 * DAY };
    assert.equal(shouldShowBackupReminder({ ...input, now: 25 * DAY }), false);
    assert.equal(shouldShowBackupReminder({ ...input, now: 30 * DAY }), true);
  });
});

describe("BackupState in storage", () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    Object.assign(globalThis, {
      window: { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } },
    });
  });

  it("round-trips the new fields under the existing key", () => {
    saveBackupState({ lastBackupAt: 5, remindAfter: 7, persistRequestedAt: 9 });
    assert.deepEqual([...data.keys()], ["folio.backup-state"]);
    assert.deepEqual(loadBackupState(), { lastBackupAt: 5, remindAfter: 7, persistRequestedAt: 9 });
  });

  it("reads state saved by older versions: a permanent dismissal becomes no snooze", () => {
    data.set("folio.backup-state", JSON.stringify({ lastBackupAt: null, reminderDismissed: true }));
    assert.deepEqual(loadBackupState(), { lastBackupAt: null, remindAfter: null, persistRequestedAt: null });
  });

  it("ignores damaged values", () => {
    data.set("folio.backup-state", JSON.stringify({ lastBackupAt: "x", remindAfter: -1, persistRequestedAt: Infinity }));
    assert.deepEqual(loadBackupState(), { lastBackupAt: null, remindAfter: null, persistRequestedAt: null });
    data.set("folio.backup-state", "{bad");
    assert.deepEqual(loadBackupState(), { lastBackupAt: null, remindAfter: null, persistRequestedAt: null });
  });
});

describe("persistence", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const stub = (storage: unknown) => Object.defineProperty(globalThis, "navigator", { value: { storage }, configurable: true, writable: true });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "navigator", original);
  });

  it("asks only when nothing has asked before", () => {
    assert.equal(shouldRequestPersistence(null), true);
    assert.equal(shouldRequestPersistence(1234), false);
  });

  it("reads the state without asking", async () => {
    let asked = 0;
    stub({ persisted: async () => false, persist: async () => (asked++, true) });
    assert.equal(await storageProtection(), "not-protected");
    assert.equal(asked, 0);
  });

  it("asks once and reports the answer", async () => {
    let asked = 0;
    stub({ persisted: async () => false, persist: async () => (asked++, true) });
    assert.equal(await requestStorageProtection(), "protected");
    assert.equal(asked, 1);
  });

  it("doesn't ask when storage is already protected", async () => {
    let asked = 0;
    stub({ persisted: async () => true, persist: async () => (asked++, true) });
    assert.equal(await requestStorageProtection(), "protected");
    assert.equal(asked, 0);
  });

  it("handles browsers without the API and refusals", async () => {
    stub(undefined);
    assert.equal(await storageProtection(), "unsupported");
    assert.equal(await requestStorageProtection(), "unsupported");
    stub({ persisted: async () => false, persist: async () => false });
    assert.equal(await requestStorageProtection(), "not-protected");
    stub({ persisted: async () => { throw new Error("denied"); }, persist: async () => { throw new Error("denied"); } });
    assert.equal(await storageProtection(), "not-protected");
    assert.equal(await requestStorageProtection(), "not-protected");
  });
});

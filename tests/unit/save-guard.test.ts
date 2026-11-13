import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSaveGuard } from "@/lib/save-guard";

describe("save guard: an autosave never writes an out-of-date list over a restore or undo", () => {
  it("lets ordinary saves write when no restore has happened", () => {
    const guard = createSaveGuard();
    const ticket = guard.ticket();
    assert.equal(guard.mayWrite(ticket), true);
    assert.equal(guard.mayWrite(guard.ticket()), true);
  });

  it("skips a save scheduled before the restore's write", () => {
    const guard = createSaveGuard();
    const scheduledBefore = guard.ticket();
    guard.wroteWholeList();
    assert.equal(guard.mayWrite(scheduledBefore), false);
    // Still skipped once the editor shows the written list.
    guard.showingLatestWrite();
    assert.equal(guard.mayWrite(scheduledBefore), false);
  });

  it("skips a save scheduled after the write but from the state shown before it (and the flush)", () => {
    const guard = createSaveGuard();
    guard.wroteWholeList();
    // An edit lands while the restore is finishing (e.g. undo still clearing its snapshot).
    const scheduledInBetween = guard.ticket();
    assert.equal(guard.mayWrite(scheduledInBetween), false);
    // flushSave checks the current ticket the same way.
    assert.equal(guard.mayWrite(guard.ticket()), false);
  });

  it("lets edits made after the editor shows the written list save normally", () => {
    const guard = createSaveGuard();
    guard.wroteWholeList();
    guard.showingLatestWrite();
    const scheduledAfter = guard.ticket();
    assert.equal(guard.mayWrite(scheduledAfter), true);
  });

  it("handles several restores and undos in a row", () => {
    const guard = createSaveGuard();
    guard.wroteWholeList(); // restore
    guard.showingLatestWrite();
    const afterRestore = guard.ticket();
    assert.equal(guard.mayWrite(afterRestore), true);
    guard.wroteWholeList(); // undo
    assert.equal(guard.mayWrite(afterRestore), false);
    guard.showingLatestWrite();
    assert.equal(guard.mayWrite(afterRestore), false);
    assert.equal(guard.mayWrite(guard.ticket()), true);
  });

  it("a failed restore (no write) changes nothing for pending saves", () => {
    const guard = createSaveGuard();
    const pending = guard.ticket();
    // The commit failed, so wroteWholeList is never called.
    assert.equal(guard.mayWrite(pending), true);
  });
});

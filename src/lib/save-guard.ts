/**
 * Keeps an autosave from writing an out-of-date resume list over a restore or an undo.
 *
 * A restore (or undo of a "replace all") writes the whole list itself, in one write.
 * Until the editor shows that list, its state is the list from before, so a save
 * scheduled from that state, or the flush when the tab closes, would put the old list
 * back and the restore would be lost.
 *
 * - `wroteWholeList()` is called at the moment of that single write.
 * - `showingLatestWrite()` is called when the editor takes the written list as its state.
 * - A save takes a `ticket()` when it is scheduled, and writes only if `mayWrite(ticket)`
 *   still holds when it runs: no whole-list write has happened that its state predates.
 */
export type SaveGuard = {
  wroteWholeList: () => void;
  showingLatestWrite: () => void;
  ticket: () => number;
  mayWrite: (ticket: number) => boolean;
};

export function createSaveGuard(): SaveGuard {
  /** How many whole-list writes have happened. */
  let written = 0;
  /** Which of them the editor's state is based on. */
  let shown = 0;
  return {
    wroteWholeList: () => {
      written++;
    },
    showingLatestWrite: () => {
      shown = written;
    },
    ticket: () => shown,
    mayWrite: (ticket) => ticket === written,
  };
}

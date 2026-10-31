"use client";

import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buttonClass, focusRing, iconButtonClass } from "@/components/ui/styles";
import { LIMITS } from "@/lib/resume-limits";

type Entry = { id?: string; hidden?: boolean };

type EntryListProps<T extends Entry> = {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  /** Singular noun for labels, e.g. "position". */
  itemName: string;
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string;
  renderFields: (item: T, update: (patch: Partial<T>) => void, isNew: boolean) => ReactNode;
  /** Called after an entry is deleted, so it can be offered for undo. */
  onDeleted: (item: T, index: number, title: string) => void;
};

/**
 * Compact rows of entries (jobs, schools, projects...). Edits apply as you type,
 * so the preview and autosave keep working; Cancel restores the entry as it was
 * when opened, and Save just closes the form.
 */
export function EntryList<T extends Entry>({ items, onChange, create, itemName, getTitle, getSubtitle, renderFields, onDeleted }: EntryListProps<T>) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const original = useRef<T | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const refocusKey = useRef<string | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  /** Where keyboard focus goes once the form closes: a row, or the Add button. */
  const focusNext = useRef<string | "add" | null>(null);
  // Pointer listeners outlive a render, so they read the latest values from here.
  const latest = useRef({ items, onChange });
  useLayoutEffect(() => {
    latest.current = { items, onChange };
  });

  const keyOf = (item: T, index: number) => item.id ?? String(index);

  useEffect(() => {
    if (!refocusKey.current) return;
    handles.current.get(refocusKey.current)?.focus();
    refocusKey.current = null;
  }, [items]);

  useEffect(() => {
    if (!focusNext.current) return;
    (focusNext.current === "add" ? addButton.current : rows.current.get(focusNext.current))?.focus();
    focusNext.current = null;
  }, [items, openKey]);

  const closeForm = (key: string | "add") => {
    focusNext.current = key;
    setOpenKey(null);
  };

  const moveTo = (from: number, to: number) => {
    const next = [...latest.current.items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    latest.current.onChange(next);
  };

  const onHandleKeyDown = (event: KeyboardEvent, index: number, key: string) => {
    const offset = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    const target = index + offset;
    if (!offset || target < 0 || target >= items.length) return;
    event.preventDefault();
    refocusKey.current = key;
    moveTo(index, target);
    setAnnouncement(`${getTitle(items[index]).trim() || `New ${itemName}`} moved to position ${target + 1} of ${items.length}`);
  };

  // Pointer events rather than HTML drag and drop, which doesn't work on touch screens.
  const startDrag = (event: PointerEvent, key: string) => {
    event.preventDefault();
    setDraggingKey(key);
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      const rows = [...(listRef.current?.children ?? [])];
      const from = latest.current.items.findIndex((item, index) => keyOf(item, index) === key);
      const to = rows.findIndex((row) => {
        const box = row.getBoundingClientRect();
        return moveEvent.clientY >= box.top && moveEvent.clientY < box.bottom;
      });
      if (to < 0 || to === from) return;
      // Swap only past the middle of the next row, so rows don't jitter.
      const box = rows[to].getBoundingClientRect();
      const middle = box.top + box.height / 2;
      if (to > from ? moveEvent.clientY > middle : moveEvent.clientY < middle) moveTo(from, to);
    };
    const stop = () => {
      setDraggingKey(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const openRow = (item: T, key: string) => {
    original.current = item;
    setNewKey(null);
    setOpenKey(openKey === key ? null : key);
  };

  const add = () => {
    const item = create();
    const key = keyOf(item, items.length);
    original.current = null;
    onChange([...items, item]);
    setOpenKey(key);
    setNewKey(key);
  };

  const cancel = (index: number) => {
    const before = original.current;
    const key = keyOf(items[index], index);
    onChange(before ? items.map((item, i) => (i === index ? before : item)) : items.filter((_, i) => i !== index));
    closeForm(before ? key : "add");
  };

  const remove = (index: number, title: string) => {
    const neighbour = items[index + 1] ?? items[index - 1];
    onChange(items.filter((_, i) => i !== index));
    closeForm(neighbour ? keyOf(neighbour, items.indexOf(neighbour)) : "add");
    onDeleted(items[index], index, title);
  };

  return (
    <div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {items.length > 0 && (
        <ul ref={listRef} className="space-y-2">
          {items.map((item, index) => {
            const key = keyOf(item, index);
            const open = openKey === key;
            const title = getTitle(item).trim() || `New ${itemName}`;
            const subtitle = getSubtitle?.(item).trim();
            const bodyId = `entry-${key}`;

            return (
              <li key={key} className={`rounded-2xl border border-line ${draggingKey === key ? "bg-panel shadow-soft" : ""}`}>
                <div className="flex items-center gap-1 px-1.5">
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) handles.current.set(key, element);
                      else handles.current.delete(key);
                    }}
                    aria-label={`Reorder ${title}. Use the up and down arrow keys.`}
                    onPointerDown={(event) => startDrag(event, key)}
                    onKeyDown={(event) => onHandleKeyDown(event, index, key)}
                    className={`inline-flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted hover:text-ink active:cursor-grabbing ${focusRing}`}
                  >
                    <GripVertical aria-hidden="true" className="size-5" />
                  </button>
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) rows.current.set(key, element);
                      else rows.current.delete(key);
                    }}
                    onClick={() => openRow(item, key)}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    className={`min-w-0 flex-1 rounded-lg py-2.5 text-left ${focusRing} ${item.hidden ? "opacity-55" : ""}`}
                  >
                    <span className={`block truncate text-[0.9375rem] font-bold ${getTitle(item).trim() ? "text-ink" : "text-muted"}`}>{title}</span>
                    {subtitle && <span className="block truncate text-[0.875rem] text-muted">{subtitle}</span>}
                  </button>
                  <button
                    type="button"
                    aria-pressed={!!item.hidden}
                    aria-label={`${item.hidden ? "Show" : "Hide"} ${title} ${item.hidden ? "on" : "from"} resume`}
                    onClick={() => {
                      onChange(items.map((current, i) => (i === index ? { ...current, hidden: current.hidden ? undefined : true } : current)));
                      setAnnouncement(`${title} ${item.hidden ? "shown on" : "hidden from"} resume`);
                    }}
                    className={iconButtonClass}
                  >
                    {item.hidden ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                  </button>
                </div>

                <div
                  id={bodyId}
                  hidden={!open}
                  className="border-t border-line p-4"
                  onKeyDown={(event) => {
                    // Edits are already saved as you type, so Escape keeps them. Cancel is the undo.
                    if (event.key === "Escape") closeForm(key);
                  }}
                >
                  {open && (
                    <>
                      {renderFields(item, (patch) => onChange(items.map((current, i) => (i === index ? { ...current, ...patch } : current))), key === newKey)}
                      <div className="mt-5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => remove(index, title)}
                          aria-label={`Delete ${itemName}`}
                          className={buttonClass("ghost", "sm", "mr-auto w-10 px-0 text-[#b42318] hover:bg-[#fef3f2]")}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" onClick={() => cancel(index)} className={buttonClass("secondary", "sm")}>
                          Cancel
                        </button>
                        <button type="button" onClick={() => closeForm(key)} className={buttonClass("primary", "sm")}>
                          Save
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={`flex justify-center ${items.length > 0 ? "mt-3" : ""}`}>
        {items.length < LIMITS.entries ? (
          <button ref={addButton} type="button" onClick={add} aria-label={`Add ${itemName}`} className={buttonClass("secondary", "sm")}>
            <Plus aria-hidden="true" className="size-4" />
            Add entry
          </button>
        ) : (
          <p role="status" className="text-[0.875rem] font-medium text-[#b42318]">
            Limit reached: {LIMITS.entries} entries maximum in a section
          </p>
        )}
      </div>
    </div>
  );
}

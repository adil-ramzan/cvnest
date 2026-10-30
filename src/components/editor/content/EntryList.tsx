"use client";

import { ArrowDown, ArrowUp, ChevronDown, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { buttonClass, iconButtonClass } from "@/components/ui/styles";
import { Menu, type MenuItem } from "../Menu";

type Entry = { id?: string };

type EntryListProps<T extends Entry> = {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  /** Singular noun for labels, e.g. "position". */
  itemName: string;
  getTitle: (item: T) => string;
  getSubtitle?: (item: T) => string;
  renderFields: (item: T, update: (patch: Partial<T>) => void, isNew: boolean) => ReactNode;
};

/** Editable list of entries (jobs, schools, projects...): click a row to edit; reorder and delete from its menu. */
export function EntryList<T extends Entry>({
  items,
  onChange,
  create,
  itemName,
  getTitle,
  getSubtitle,
  renderFields,
}: EntryListProps<T>) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(items.length === 1 && items[0].id ? [items[0].id] : []));
  const [newId, setNewId] = useState<string | null>(null);

  const keyOf = (item: T, index: number) => item.id ?? String(index);

  const toggle = (key: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = () => {
    const item = create();
    const key = keyOf(item, items.length);
    onChange([...items, item]);
    setOpenIds((current) => new Set(current).add(key));
    setNewId(key);
  };

  const move = (index: number, offset: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    onChange(next);
  };

  return (
    <div>
      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {items.map((item, index) => {
            const key = keyOf(item, index);
            const open = openIds.has(key);
            const title = getTitle(item).trim() || `New ${itemName}`;
            const subtitle = getSubtitle?.(item).trim();
            const bodyId = `entry-${key}`;
            const menuItems: MenuItem[] = [
              ...(index > 0 ? [{ label: "Move up", icon: ArrowUp, onSelect: () => move(index, -1) }] : []),
              ...(index < items.length - 1 ? [{ label: "Move down", icon: ArrowDown, onSelect: () => move(index, 1) }] : []),
              ...(items.length > 1 ? ["separator" as const] : []),
              { label: `Delete ${itemName}`, icon: Trash2, danger: true, onSelect: () => onChange(items.filter((_, i) => i !== index)) },
            ];

            return (
              <li key={key} className={open ? "bg-canvas/50" : ""}>
                <div className="flex items-center gap-1 pr-2">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={open}
                    aria-controls={bodyId}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-3.5 text-left focus-visible:outline-offset-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-base font-medium ${getTitle(item).trim() ? "text-ink" : "text-muted"}`}>
                        {title}
                      </span>
                      {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 shrink-0 text-muted transition-transform group-hover:text-ink ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  <Menu
                    label={`Options for ${title}`}
                    align="end"
                    items={menuItems}
                    triggerClassName={iconButtonClass}
                    trigger={<MoreHorizontal aria-hidden="true" className="size-5" />}
                  />
                </div>
                <div id={bodyId} hidden={!open} className="px-4 pt-1 pb-5">
                  {open &&
                    renderFields(
                      item,
                      (patch) => onChange(items.map((current, i) => (i === index ? { ...current, ...patch } : current))),
                      key === newId,
                    )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={add} className={buttonClass("link", "md", `${items.length > 0 ? "mt-2" : ""} -ml-1`)}>
        <Plus aria-hidden="true" className="size-4" />
        Add {itemName}
      </button>
    </div>
  );
}

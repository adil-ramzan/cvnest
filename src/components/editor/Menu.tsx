"use client";

import { Check, type LucideIcon } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export type MenuItem =
  | {
      label: string;
      description?: string;
      icon?: LucideIcon;
      onSelect: () => void;
      danger?: boolean;
      /** When defined, the item is a radio option (e.g. the active resume). */
      checked?: boolean;
    }
  | "separator";

type MenuProps = {
  /** Accessible name of the trigger button. */
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  className?: string;
  items: MenuItem[];
  align?: "start" | "end";
  menuClassName?: string;
};

/** Accessible dropdown menu: arrow keys move, Escape closes and returns focus to the trigger. */
export function Menu({ label, trigger, triggerClassName = "", className = "", items, align = "start", menuClassName = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const menuButtons = () => [...(rootRef.current?.querySelectorAll<HTMLButtonElement>("[role^='menuitem']") ?? [])];

  const focusItem = (index: number) => {
    const buttons = menuButtons();
    if (!buttons.length) return;
    buttons[(index + buttons.length) % buttons.length].focus();
  };

  useEffect(() => {
    if (!open) return;
    const firstChecked = items.filter((item) => item !== "separator").findIndex((item) => item.checked);
    focusItem(Math.max(firstChecked, 0));

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the menu opens; items are read once to focus the checked one.
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const buttons = menuButtons();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(buttons.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };


  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute top-full z-50 mt-1.5 min-w-56 rounded-xl border border-line bg-surface p-1.5 shadow-pop ${align === "end" ? "right-0" : "left-0"} ${menuClassName}`}
        >
          {items.map((item, index) => {
            if (item === "separator") {
              return <div key={`sep-${index}`} role="separator" className="my-1.5 h-px bg-line" />;
            }
            const Icon = item.icon;
            const isRadio = item.checked !== undefined;
            return (
              <button
                key={`${item.label}-${index}`}
                type="button"
                role={isRadio ? "menuitemradio" : "menuitem"}
                aria-checked={isRadio ? item.checked : undefined}
                tabIndex={-1}
                onClick={() => {
                  close(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 pointer-coarse:min-h-11 text-left text-sm outline-none focus:bg-ink/5 hover:bg-ink/5 ${item.danger ? "text-[#b42318]" : "text-ink"}`}
              >
                {isRadio ? (
                  <Check aria-hidden="true" className={`size-4 shrink-0 ${item.checked ? "text-accent" : "invisible"}`} />
                ) : (
                  Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-current opacity-70" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {item.description && <span className="block truncate text-sm text-muted">{item.description}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

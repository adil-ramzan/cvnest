"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { internalDestination, promptBeforeUnload } from "@/lib/unsaved";

/** Where the user was heading: an in-app address, or "back" for the browser's Back button. */
type Pending = { destination: string; trigger: HTMLElement | null };

/**
 * Protects work while it's at risk. Closing or refreshing the tab can only use
 * the browser's own prompt; clicks and router navigations inside the app are
 * held in `pending` so the editor can ask first.
 */
export function useUnsavedGuard(isAtRisk: boolean, flushSave: () => void) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const atRisk = useRef(isAtRisk);
  const backGuarded = useRef(false);

  useEffect(() => {
    atRisk.current = isAtRisk;
  }, [isAtRisk]);

  useEffect(() => {
    if (!isAtRisk) return;
    window.addEventListener("beforeunload", promptBeforeUnload);
    return () => window.removeEventListener("beforeunload", promptBeforeUnload);
  }, [isAtRisk]);

  // Mobile browsers can drop a page without warning once it's hidden.
  useEffect(() => {
    const onVisibilityChange = () => document.visibilityState === "hidden" && flushSave();
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushSave]);

  // Next's App Router has no route blocking, so links are caught before it sees the click.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!atRisk.current || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const destination = internalDestination(event, link, window.location.href);
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      setPending({ destination, trigger: link });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Back: one extra history entry, used once, so leaving is never trapped. Next's own
  // state is kept on it, because Next reloads the page for entries it doesn't recognise.
  useEffect(() => {
    if (!isAtRisk || backGuarded.current) return;
    backGuarded.current = true;
    window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = () => {
      window.removeEventListener("popstate", onPopState);
      if (atRisk.current) setPending({ destination: "back", trigger: null });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isAtRisk]);

  const guardedPush = useCallback(
    (destination: string) => {
      if (atRisk.current) setPending({ destination, trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null });
      else router.push(destination);
    },
    [router],
  );

  const stay = useCallback(() => {
    pending?.trigger?.focus();
    setPending(null);
  }, [pending]);

  const leave = useCallback(() => {
    const destination = pending?.destination;
    setPending(null);
    atRisk.current = false;
    window.removeEventListener("beforeunload", promptBeforeUnload);
    if (destination === "back") window.history.back();
    else if (destination) router.push(destination);
  }, [pending, router]);

  return { pending, stay, leave, guardedPush };
}

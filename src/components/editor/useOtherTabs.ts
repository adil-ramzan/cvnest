"use client";

import { useEffect, useState } from "react";
import { createId } from "@/lib/resume-schema";

const CHANNEL = "folio.editor-tabs";
const PING_MS = 4000;
/** Long enough for a throttled background tab to answer. */
const GONE_AFTER_MS = 10_000;

type TabMessage = { from: string; resumeId: string | null; type: "here" | "ping" | "gone" };

/** True while another tab of this browser has the same resume open in the editor. */
export function useOtherTabs(resumeId: string | null) {
  const [openElsewhere, setOpenElsewhere] = useState(false);

  useEffect(() => {
    if (!resumeId || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    const tabId = createId();
    const others = new Map<string, number>();
    const send = (type: TabMessage["type"]) => channel.postMessage({ from: tabId, resumeId, type } satisfies TabMessage);
    const update = () => setOpenElsewhere(others.size > 0);

    channel.onmessage = ({ data }: MessageEvent<TabMessage>) => {
      if (data.type === "gone" || data.resumeId !== resumeId) others.delete(data.from);
      else others.set(data.from, Date.now());
      if (data.type === "ping") send("here");
      update();
    };

    const timer = setInterval(() => {
      for (const [id, seen] of others) if (Date.now() - seen > GONE_AFTER_MS) others.delete(id);
      update();
      send("ping");
    }, PING_MS);
    const leave = () => send("gone");

    send("ping");
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      leave();
      channel.close();
      setOpenElsewhere(false);
    };
  }, [resumeId]);

  return openElsewhere;
}

"use client";

import { useEffect } from "react";
import type { PlannerData } from "./types";
import { minutesOf, toDateKey } from "./schedule";
import { digestBody, hasAnythingDue, whatIsDue } from "./conflicts";

const SENT_KEY = "academia:digest-sent";

/**
 * Sends one summary notification at the start of the day listing what's due —
 * deadlines first, then work sessions and how many classes there are.
 *
 * Fires at most once per day. If the app wasn't open at the configured time it
 * still fires on the next visit that day, so a late start doesn't lose the
 * reminder. On a holiday it reports deadlines only — those don't move for a day
 * off — while classes and planned work stay muted.
 */
export function useDailyDigest(data: PlannerData, permission: string) {
  const { digestEnabled, digestTime } = data.settings;

  useEffect(() => {
    if (permission !== "granted" || !digestEnabled) return;

    const tick = () => {
      const now = new Date();
      const today = toDateKey(now);

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes < minutesOf(digestTime)) return;

      let sent: string;
      try {
        sent = window.localStorage.getItem(SENT_KEY) ?? "";
      } catch {
        return;
      }
      if (sent === today) return;

      const due = whatIsDue(data, now);
      // record the day either way, so a free day doesn't retry all day
      try {
        window.localStorage.setItem(SENT_KEY, today);
      } catch {
        return;
      }
      if (!hasAnythingDue(due)) return;

      new Notification("Today in Academia", {
        body: digestBody(due),
        tag: `academia-digest-${today}`,
      });
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [permission, digestEnabled, digestTime, data]);
}

/** Clears the once-a-day guard so a test digest can be sent immediately. */
export function resetDigestGuard() {
  try {
    window.localStorage.removeItem(SENT_KEY);
  } catch {
    // nothing to clear
  }
}

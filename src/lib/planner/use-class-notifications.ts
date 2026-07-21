"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ClassEntry, Holiday } from "./types";
import { holidaySet, minutesOf, toDateKey, weekdayIndex } from "./schedule";

const NOTIFIED_KEY = "maniac-ledger:notified:v1";
export const LEAD_MINUTES = 10;

export type AlertPermission = "unsupported" | NotificationPermission;

const permListeners = new Set<() => void>();

function subscribePermission(cb: () => void) {
  permListeners.add(cb);
  return () => permListeners.delete(cb);
}

function getPermission(): AlertPermission {
  return "Notification" in window ? Notification.permission : "unsupported";
}

const serverPermission = () => "default" as const;

/**
 * Fires a browser notification 10 minutes before each class starts.
 * Holidays are muted; each class notifies at most once per day (deduped in
 * localStorage so a reload doesn't re-fire). Runs while the app is mounted.
 */
export function useClassNotifications(classes: ClassEntry[], holidays: Holiday[]) {
  const permission = useSyncExternalStore(
    subscribePermission,
    getPermission,
    serverPermission
  );

  const request = useCallback(async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    permListeners.forEach((l) => l());
  }, []);

  const test = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification("MANIAC LEDGER — test alert", {
      body: `Class reminders look like this, ${LEAD_MINUTES} min before start.`,
    });
  }, []);

  useEffect(() => {
    if (permission !== "granted" || classes.length === 0) return;
    const skip = holidaySet(holidays);

    const tick = () => {
      const now = new Date();
      const todayKey = toDateKey(now);
      if (skip.has(todayKey)) return;

      let seen: Record<string, string>;
      try {
        seen = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? "{}");
      } catch {
        seen = {};
      }
      for (const k of Object.keys(seen)) {
        if (seen[k] !== todayKey) delete seen[k];
      }

      const nowMin = now.getHours() * 60 + now.getMinutes();
      const today = weekdayIndex(now);
      for (const cls of classes) {
        if (cls.day !== today || seen[cls.id]) continue;
        const delta = minutesOf(cls.start) - nowMin;
        if (delta < 0 || delta > LEAD_MINUTES) continue;
        new Notification(
          delta === 0 ? `${cls.title} — starting now` : `${cls.title} — in ${delta} min`,
          {
            body: `${cls.start}–${cls.end}${cls.location ? ` · ${cls.location}` : ""}`,
            tag: `maniac-ledger-${cls.id}-${todayKey}`,
          }
        );
        seen[cls.id] = todayKey;
      }
      window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(seen));
    };

    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [permission, classes, holidays]);

  return { permission, request, test };
}

export type ClassAlerts = ReturnType<typeof useClassNotifications>;

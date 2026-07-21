"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_DATA,
  type ClassEntry,
  type Holiday,
  type PlannerData,
  type Project,
} from "./types";

const STORAGE_KEY = "maniac-ledger:planner:v1";

/* Module-level store: localStorage-backed, read lazily on the client. */

let cache: PlannerData | null = null;
const listeners = new Set<() => void>();

function loadData(): PlannerData {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlannerData>;
      cache = {
        projects: parsed.projects ?? [],
        classes: parsed.classes ?? [],
        holidays: parsed.holidays ?? [],
      };
      return cache;
    }
  } catch {
    // corrupted storage — start fresh
  }
  cache = EMPTY_DATA;
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function update(mutate: (d: PlannerData) => PlannerData) {
  cache = mutate(loadData());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

function addProject(p: Project) {
  update((d) => ({ ...d, projects: [p, ...d.projects] }));
}

function removeProject(id: string) {
  update((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));
}

function toggleSession(projectId: string, sessionId: string) {
  update((d) => ({
    ...d,
    projects: d.projects.map((p) =>
      p.id !== projectId
        ? p
        : {
            ...p,
            sessions: p.sessions.map((s) =>
              s.id === sessionId ? { ...s, done: !s.done } : s
            ),
          }
    ),
  }));
}

function addClass(c: ClassEntry) {
  update((d) => ({ ...d, classes: [...d.classes, c] }));
}

function removeClass(id: string) {
  update((d) => ({ ...d, classes: d.classes.filter((c) => c.id !== id) }));
}

function addHoliday(h: Holiday) {
  update((d) => ({
    ...d,
    holidays: [...d.holidays.filter((x) => x.date !== h.date), h].sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  }));
}

function removeHoliday(id: string) {
  update((d) => ({ ...d, holidays: d.holidays.filter((h) => h.id !== id) }));
}

const serverSnapshot = () => EMPTY_DATA;
const clientHydrated = () => true;
const serverHydrated = () => false;

/** Planner data + mutators; `hydrated` is false until the client store loads. */
export function usePlanner() {
  const data = useSyncExternalStore(subscribe, loadData, serverSnapshot);
  const hydrated = useSyncExternalStore(subscribe, clientHydrated, serverHydrated);

  return {
    data,
    hydrated,
    addProject,
    removeProject,
    toggleSession,
    addClass,
    removeClass,
    addHoliday,
    removeHoliday,
  };
}

export type PlannerStore = ReturnType<typeof usePlanner>;

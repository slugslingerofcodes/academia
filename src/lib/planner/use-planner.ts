"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_DATA,
  EMPTY_RESUME,
  type ClassEntry,
  type Holiday,
  type Note,
  type PlannerData,
  type Project,
  type ResumeData,
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
        resume: { ...EMPTY_RESUME, ...parsed.resume },
        notes: parsed.notes ?? [],
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

function updateProject(id: string, patch: Partial<Project>) {
  update((d) => ({
    ...d,
    projects: d.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
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

function updateClass(id: string, patch: Partial<ClassEntry>) {
  update((d) => ({
    ...d,
    classes: d.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
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

function updateHoliday(id: string, patch: Partial<Holiday>) {
  update((d) => ({
    ...d,
    holidays: d.holidays
      .map((h) => (h.id === id ? { ...h, ...patch } : h))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));
}

function setResume(resume: ResumeData) {
  update((d) => ({ ...d, resume }));
}

function addNote(n: Note) {
  update((d) => ({ ...d, notes: [n, ...d.notes] }));
}

function updateNote(id: string, patch: Partial<Note>) {
  update((d) => ({
    ...d,
    notes: d.notes.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
    ),
  }));
}

function removeNote(id: string) {
  update((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
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
    updateProject,
    toggleSession,
    addClass,
    removeClass,
    updateClass,
    addHoliday,
    removeHoliday,
    updateHoliday,
    setResume,
    addNote,
    updateNote,
    removeNote,
  };
}

export type PlannerStore = ReturnType<typeof usePlanner>;

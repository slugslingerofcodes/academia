"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  EMPTY_DATA,
  EMPTY_RESUME,
  type ClassEntry,
  type ClassException,
  type Holiday,
  type Note,
  type PlannerData,
  type PlannerSettings,
  type Project,
  type ResumeData,
  type Tombstone,
} from "./types";
import { mergeInto } from "./backup";

/** Predates the rename to Academia — kept as-is so existing saved data loads. */
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
        // classes saved before subject code / type existed default to lectures
        classes: (parsed.classes ?? []).map((c) => ({
          ...c,
          type: c.type ?? "lecture",
        })),
        holidays: parsed.holidays ?? [],
        resume: { ...EMPTY_RESUME, ...parsed.resume },
        notes: parsed.notes ?? [],
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        deleted: parsed.deleted ?? [],
        exceptions: parsed.exceptions ?? [],
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

/** Append tombstones so a sync doesn't resurrect what was just deleted. */
function buryIds(d: PlannerData, ids: string[]): Tombstone[] {
  const at = Date.now();
  return [...d.deleted, ...ids.map((id) => ({ id, at }))];
}

function addProject(p: Project) {
  update((d) => ({ ...d, projects: [p, ...d.projects] }));
}

function removeProject(id: string) {
  update((d) => ({
    ...d,
    projects: d.projects.filter((p) => p.id !== id),
    deleted: buryIds(d, [id]),
  }));
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

/** Add every meeting of a subject in one go. */
function addClasses(list: ClassEntry[]) {
  update((d) => ({ ...d, classes: [...d.classes, ...list] }));
}

/** Remove every meeting sharing a subject's code + title + type. */
function removeSubject(sample: ClassEntry) {
  update((d) => {
    const matches = (c: ClassEntry) =>
      (c.code ?? "") === (sample.code ?? "") &&
      c.title === sample.title &&
      c.type === sample.type;
    return {
      ...d,
      classes: d.classes.filter((c) => !matches(c)),
      deleted: buryIds(d, d.classes.filter(matches).map((c) => c.id)),
    };
  });
}

function removeClass(id: string) {
  update((d) => ({
    ...d,
    classes: d.classes.filter((c) => c.id !== id),
    deleted: buryIds(d, [id]),
  }));
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
  update((d) => ({
    ...d,
    holidays: d.holidays.filter((h) => h.id !== id),
    deleted: buryIds(d, [id]),
  }));
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

function addException(e: ClassException) {
  update((d) => ({
    // one exception per class per date — a newer one replaces the old
    ...d,
    exceptions: [
      ...d.exceptions.filter(
        (x) => !(x.classId === e.classId && x.date === e.date)
      ),
      e,
    ],
  }));
}

function removeException(id: string) {
  update((d) => ({
    ...d,
    exceptions: d.exceptions.filter((x) => x.id !== id),
    deleted: buryIds(d, [id]),
  }));
}

function updateSettings(patch: Partial<PlannerSettings>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

/** Overwrite everything — used when restoring a backup. */
function replaceAll(next: PlannerData) {
  update(() => next);
}

/** Fold a backup into what's already here, keeping both sides. */
function mergeAll(incoming: PlannerData) {
  update((d) => mergeInto(d, incoming));
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
  update((d) => ({
    ...d,
    notes: d.notes.filter((n) => n.id !== id),
    deleted: buryIds(d, [id]),
  }));
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
    addClasses,
    removeClass,
    removeSubject,
    updateClass,
    addHoliday,
    removeHoliday,
    updateHoliday,
    setResume,
    addException,
    removeException,
    updateSettings,
    replaceAll,
    mergeAll,
    addNote,
    updateNote,
    removeNote,
  };
}

export type PlannerStore = ReturnType<typeof usePlanner>;

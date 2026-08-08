import {
  DEFAULT_SETTINGS,
  EMPTY_RESUME,
  type PlannerData,
} from "./types";

/**
 * Backup files move a planner between devices.
 *
 * Everything lives in this browser's localStorage, so a laptop and a phone hold
 * completely separate copies. Until there's a server to sync through, a file is
 * how data crosses between them — and it doubles as the only protection against
 * clearing site data.
 */

const FORMAT = "academia-backup";
const VERSION = 1;

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  data: PlannerData;
}

export function buildBackup(data: PlannerData): string {
  const file: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

export function downloadBackup(contents: string): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `academia-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface BackupSummary {
  projects: number;
  classes: number;
  holidays: number;
  notes: number;
  hasResume: boolean;
  exportedAt?: string;
}

export function summarise(data: PlannerData, exportedAt?: string): BackupSummary {
  return {
    projects: data.projects.length,
    classes: data.classes.length,
    holidays: data.holidays.length,
    notes: data.notes.length,
    hasResume: Boolean(data.resume?.name || data.resume?.email),
    exportedAt,
  };
}

export type ParseResult =
  | { ok: true; data: PlannerData; exportedAt?: string }
  | { ok: false; error: string };

/** Read a backup file, filling in anything a older/partial file omits. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const file = raw as Partial<BackupFile>;
  if (!file || typeof file !== "object" || file.format !== FORMAT) {
    return { ok: false, error: "That isn't an Academia backup file." };
  }
  if (typeof file.version === "number" && file.version > VERSION) {
    return {
      ok: false,
      error: "That backup came from a newer version of Academia.",
    };
  }
  const d = file.data;
  if (!d || typeof d !== "object") {
    return { ok: false, error: "That backup has no data in it." };
  }

  return {
    ok: true,
    exportedAt: file.exportedAt,
    data: {
      projects: Array.isArray(d.projects) ? d.projects : [],
      classes: Array.isArray(d.classes)
        ? d.classes.map((c) => ({ ...c, type: c.type ?? "lecture" }))
        : [],
      holidays: Array.isArray(d.holidays) ? d.holidays : [],
      resume: { ...EMPTY_RESUME, ...d.resume },
      notes: Array.isArray(d.notes) ? d.notes : [],
      settings: { ...DEFAULT_SETTINGS, ...d.settings },
      deleted: Array.isArray(d.deleted) ? d.deleted : [],
    },
  };
}

/**
 * Combine two planners, keeping both sides.
 *
 * Entries are matched by id, so merging the same data twice is a no-op. Either
 * side's tombstones remove the record from the result — otherwise deleting
 * something on one device and syncing would simply bring it back from the
 * other. Where both sides hold the same id, the current device wins.
 */
export function mergeInto(current: PlannerData, incoming: PlannerData): PlannerData {
  const buried = new Set(
    [...current.deleted, ...incoming.deleted].map((t) => t.id)
  );

  const byId = <T extends { id: string }>(mine: T[], theirs: T[]): T[] => {
    const seen = new Set(mine.map((x) => x.id));
    return [...mine, ...theirs.filter((x) => !seen.has(x.id))].filter(
      (x) => !buried.has(x.id)
    );
  };

  // keep one tombstone per id; they only need to outlive the other device's copy
  const deleted = [...current.deleted, ...incoming.deleted].filter(
    (t, i, all) => all.findIndex((o) => o.id === t.id) === i
  );

  return {
    projects: byId(current.projects, incoming.projects),
    classes: byId(current.classes, incoming.classes),
    holidays: byId(current.holidays, incoming.holidays),
    notes: byId(current.notes, incoming.notes),
    // a resume is a single document — keep whichever side actually has one
    resume: current.resume?.name || current.resume?.email
      ? current.resume
      : incoming.resume,
    settings: current.settings,
    deleted,
  };
}

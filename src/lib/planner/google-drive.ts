import type { PlannerData } from "./types";
import { mergeInto, parseBackup, buildBackup } from "./backup";
import { DRIVE_SCOPE, isConfigured, requestAccessToken } from "./google-calendar";

/**
 * Cross-device sync through Google Drive's per-app hidden folder.
 *
 * `appDataFolder` is a private space Drive gives each app: it can only ever see
 * files it created there, never the user's own Drive contents, and the folder
 * doesn't appear in the Drive UI. That makes it a backend for syncing without
 * running a server or holding anyone's data.
 *
 * Sync is a read-merge-write: pull the remote copy, merge it with local (union
 * by id, tombstones win), then write the result back and keep it locally. Both
 * devices converge on the same planner without either losing entries.
 */

const FILE_NAME = "academia-planner.json";
const LIST_URL =
  "https://www.googleapis.com/drive/v3/files" +
  "?spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=10";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

export const LAST_SYNC_KEY = "academia:last-sync";

export { isConfigured };

async function failure(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

async function findFile(token: string): Promise<DriveFile | null> {
  const res = await fetch(LIST_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await failure(res));
  const body = (await res.json()) as { files?: DriveFile[] };
  return body.files?.find((f) => f.name === FILE_NAME) ?? null;
}

async function downloadFile(token: string, id: string): Promise<PlannerData | null> {
  const res = await fetch(`${FILES_URL}/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await failure(res));
  const parsed = parseBackup(await res.text());
  // a corrupt remote copy shouldn't block syncing; it gets overwritten below
  return parsed.ok ? parsed.data : null;
}

/** Multipart upload: metadata part, then the file body. */
async function createFile(token: string, contents: string): Promise<string> {
  const boundary = "academia-boundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    contents +
    `\r\n--${boundary}--`;

  const res = await fetch(`${UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(await failure(res));
  const created = (await res.json()) as { id: string };
  return created.id;
}

async function overwriteFile(token: string, id: string, contents: string) {
  const res = await fetch(`${UPLOAD_URL}/${id}?uploadType=media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: contents,
  });
  if (!res.ok) throw new Error(await failure(res));
}

export interface SyncOutcome {
  merged: PlannerData;
  /** Entries that came down from the other device. */
  pulled: number;
  /** Entries this device contributed. */
  pushed: number;
  firstSync: boolean;
}

function countRecords(d: PlannerData): number {
  return d.projects.length + d.classes.length + d.holidays.length + d.notes.length;
}

/**
 * Run one full sync. Returns the merged planner for the caller to store.
 * Requests the Drive scope only — calendar access is never involved.
 */
export async function syncWithDrive(local: PlannerData): Promise<SyncOutcome> {
  if (!isConfigured()) throw new Error("Google client ID is not configured.");
  const token = await requestAccessToken(DRIVE_SCOPE);

  const existing = await findFile(token);
  const remote = existing ? await downloadFile(token, existing.id) : null;

  const merged = remote ? mergeInto(local, remote) : local;
  const contents = buildBackup(merged);

  if (existing) await overwriteFile(token, existing.id, contents);
  else await createFile(token, contents);

  try {
    window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // a blocked storage write shouldn't fail the sync itself
  }

  return {
    merged,
    pulled: remote ? Math.max(0, countRecords(merged) - countRecords(local)) : 0,
    pushed: remote ? Math.max(0, countRecords(merged) - countRecords(remote)) : countRecords(local),
    firstSync: !existing,
  };
}

export function lastSyncedAt(): string | null {
  try {
    return window.localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

/** Remove the synced copy from Drive, leaving this device's data untouched. */
export async function disconnectDrive(): Promise<boolean> {
  const token = await requestAccessToken(DRIVE_SCOPE);
  const existing = await findFile(token);
  if (!existing) return false;
  const res = await fetch(`${FILES_URL}/${existing.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await failure(res));
  try {
    window.localStorage.removeItem(LAST_SYNC_KEY);
  } catch {
    // nothing to clear
  }
  return true;
}

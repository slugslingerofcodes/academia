"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  Check,
  CloudUpload,
  Download,
  RefreshCw,
  Smartphone,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import type { PlannerData } from "@/lib/planner/types";
import {
  buildBackup,
  downloadBackup,
  parseBackup,
  summarise,
  type BackupSummary,
} from "@/lib/planner/backup";
import {
  isConfigured,
  lastSyncedAt,
  syncWithDrive,
  type SyncOutcome,
} from "@/lib/planner/google-drive";
import { Panel } from "./ui";
import { QrCode } from "./qr-code";

function subscribeNothing() {
  return () => {};
}
const getOrigin = () => window.location.origin;
const serverOrigin = () => "";

interface Pending {
  data: PlannerData;
  summary: BackupSummary;
  fileName: string;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/** Automatic cross-device sync via Google Drive's per-app hidden folder. */
function CloudSyncPanel({ store }: { store: PlannerStore }) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const result = await syncWithDrive(store.data);
      store.replaceAll(result.merged);
      setOutcome(result);
      setSyncedAt(lastSyncedAt());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }, [store]);

  if (!isConfigured()) {
    return (
      <Panel title="Sync across devices" icon={<CloudUpload />}>
        <p className="text-sm text-muted">
          Automatic sync needs the Google client ID configured — the same one
          the calendar sync uses. Until then, use the backup export and import
          below.
        </p>
      </Panel>
    );
  }

  const shown = syncedAt ?? lastSyncedAt();

  return (
    <Panel title="Sync across devices" icon={<CloudUpload />}>
      <p className="text-sm text-muted">
        Keeps this device and your phone in step through a private folder in
        your Google Drive. Sync on both, and each ends up with everything.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {shown
            ? `Last synced ${new Date(shown).toLocaleString()}`
            : "Not synced on this device yet."}
        </span>
        <Button className="rounded-full px-5" disabled={busy} onClick={run}>
          <RefreshCw data-icon="inline-start" />
          {busy ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      {outcome && (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent-faint p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-accent">
            <Check className="size-4" />
            {outcome.firstSync
              ? `Uploaded ${outcome.pushed} entries — sync the other device next.`
              : `Synced. ${outcome.pulled} brought in, ${outcome.pushed} sent up.`}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        The folder is private to Academia — it can&apos;t see anything else in
        your Drive, and won&apos;t show up among your files. Sync is manual, so
        run it after making changes on the other device.
      </p>
    </Panel>
  );
}

export function DevicesTab({ store }: { store: PlannerStore }) {
  const origin = useSyncExternalStore(subscribeNothing, getOrigin, serverOrigin);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const here = summarise(store.data);

  const read = useCallback(async (file: File) => {
    setError(null);
    setDone(null);
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setError(parsed.error);
      setPending(null);
      return;
    }
    setPending({
      data: parsed.data,
      summary: summarise(parsed.data, parsed.exportedAt),
      fileName: file.name,
    });
  }, []);

  const finish = (message: string) => {
    setPending(null);
    setDone(message);
    if (inputRef.current) inputRef.current.value = "";
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the address bar instead.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Open Academia on your phone" icon={<Smartphone />}>
        <div className="flex flex-wrap items-start gap-6">
          <div className="rounded-xl bg-white p-3">
            {origin ? <QrCode value={origin} size={168} /> : <div className="size-[168px]" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              Scan this with your phone&apos;s camera to open Academia there, then
              add it to your home screen. It&apos;s the same app you&apos;re
              looking at now.
            </p>
            <p className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs break-all text-foreground">
              {origin || "…"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-full px-4"
              onClick={copyLink}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <p className="mt-4 text-xs text-muted">
              Your laptop and phone each keep their own copy of your planner —
              they can&apos;t see each other&apos;s data on their own. Use the
              backup below to move everything across.
            </p>
          </div>
        </div>
      </Panel>

      <CloudSyncPanel store={store} />

      <Panel title="Move your data between devices" icon={<Download />}>
        <p className="text-sm text-muted">
          Everything is stored in this browser only. Export a backup here, then
          import it on your other device — that also protects you from losing
          everything if you clear your browser data.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
          <p className="text-sm font-medium text-foreground">On this device</p>
          <div className="mt-1 divide-y divide-border">
            <Row label="Tasks & projects" value={here.projects} />
            <Row label="Classes" value={here.classes} />
            <Row label="Holidays" value={here.holidays} />
            <Row label="Notes" value={here.notes} />
            <Row label="Resume" value={here.hasResume ? "Yes" : "Not filled in"} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="rounded-full px-5"
            onClick={() => downloadBackup(buildBackup(store.data))}
          >
            <Download data-icon="inline-start" />
            Export backup
          </Button>
          <Button
            variant="outline"
            className="rounded-full px-5"
            onClick={() => inputRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            Import backup
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void read(file);
            }}
          />
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <TriangleAlert className="size-4" />
            {error}
          </p>
        )}

        {done && (
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
            <Check className="size-4" />
            {done}
          </p>
        )}

        {pending && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent-faint p-4">
            <p className="text-sm font-medium text-foreground">
              {pending.fileName}
              {pending.summary.exportedAt && (
                <span className="font-normal text-muted">
                  {" "}
                  — exported {new Date(pending.summary.exportedAt).toLocaleDateString()}
                </span>
              )}
            </p>
            <div className="mt-1 divide-y divide-border">
              <Row label="Tasks & projects" value={pending.summary.projects} />
              <Row label="Classes" value={pending.summary.classes} />
              <Row label="Holidays" value={pending.summary.holidays} />
              <Row label="Notes" value={pending.summary.notes} />
              <Row
                label="Resume"
                value={pending.summary.hasResume ? "Yes" : "Not filled in"}
              />
            </div>

            <p className="mt-3 text-sm text-muted">
              <span className="font-medium text-foreground">Merge</span> keeps
              what&apos;s already here and adds anything new.{" "}
              <span className="font-medium text-foreground">Replace</span>{" "}
              discards this device&apos;s data entirely.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-4 text-destructive"
                onClick={() => {
                  store.replaceAll(pending.data);
                  finish("Replaced everything on this device with the backup.");
                }}
              >
                Replace
              </Button>
              <Button
                size="sm"
                className="rounded-full px-4"
                onClick={() => {
                  store.mergeAll(pending.data);
                  finish("Merged the backup into this device.");
                }}
              >
                Merge
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

"use client";

import { Check, LogIn, LogOut, RefreshCw, TriangleAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccountSync } from "@/lib/planner/use-account-sync";
import { Panel } from "./ui";

export function AccountPanel({ sync }: { sync: AccountSync }) {
  if (!sync.configured) {
    return (
      <Panel title="Account" icon={<UserRound />}>
        <p className="text-sm text-muted">
          Signing in needs the Google client ID configured — the same one the
          calendar sync uses. Until then, use the backup export and import below.
        </p>
      </Panel>
    );
  }

  if (!sync.account) {
    return (
      <Panel title="Sign in" icon={<UserRound />}>
        <p className="text-sm text-muted">
          Sign in with Google and your planner follows you — the same tasks,
          timetable, notes and resume on every device you sign in on. It&apos;s
          stored in a folder private to Academia inside your own Google Drive.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            className="rounded-full px-5"
            disabled={sync.state === "syncing"}
            onClick={sync.signIn}
          >
            <LogIn data-icon="inline-start" />
            {sync.state === "syncing" ? "Signing in…" : "Sign in with Google"}
          </Button>
          {sync.error && (
            <span className="flex items-center gap-2 text-sm text-destructive">
              <TriangleAlert className="size-4" />
              {sync.error}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          There&apos;s no separate password to create — Academia never sees one.
          Your data stays in your Drive, not on anyone else&apos;s server.
        </p>
      </Panel>
    );
  }

  const status =
    sync.state === "syncing"
      ? "Syncing…"
      : sync.state === "error"
        ? sync.error
        : sync.syncedAt
          ? `Last synced ${new Date(sync.syncedAt).toLocaleString()}`
          : "Signed in — not synced yet.";

  return (
    <Panel title="Account" icon={<UserRound />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {sync.account.picture ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={sync.account.picture}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-full"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <UserRound className="size-5 text-muted" />
            </span>
          )}
          <div className="min-w-0">
            {sync.account.name && (
              <div className="truncate text-sm font-medium text-foreground">
                {sync.account.name}
              </div>
            )}
            <div className="truncate text-sm text-muted">{sync.account.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4"
            disabled={sync.state === "syncing"}
            onClick={sync.syncNow}
          >
            <RefreshCw data-icon="inline-start" />
            Sync now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted hover:text-destructive"
            onClick={sync.signOut}
          >
            <LogOut data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </div>

      <p
        className={`mt-3 flex items-center gap-2 text-sm ${
          sync.state === "error" ? "text-destructive" : "text-muted"
        }`}
      >
        {sync.state === "synced" && <Check className="size-4 text-accent" />}
        {sync.state === "error" && <TriangleAlert className="size-4" />}
        {status}
      </p>

      <p className="mt-3 text-xs text-muted">
        Changes sync a few seconds after you make them, and pull in when you open
        Academia. Signing out leaves this device&apos;s copy untouched.
      </p>
    </Panel>
  );
}

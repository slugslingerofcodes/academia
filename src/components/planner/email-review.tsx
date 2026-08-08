"use client";

import { useCallback, useState } from "react";
import { Check, Mail, Quote, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlannerStore } from "@/lib/planner/use-planner";
import { isConfigured } from "@/lib/planner/google-calendar";
import { uid } from "@/lib/planner/schedule";
import {
  describeProposal,
  fetchRecentMail,
  interpret,
  type Proposal,
} from "@/lib/planner/gmail";
import { Panel } from "./ui";

const KIND_LABEL = {
  cancelled: "Cancelled",
  moved: "Rescheduled",
  room: "Room change",
} as const;

export function EmailReviewPanel({ store }: { store: PlannerStore }) {
  const [busy, setBusy] = useState(false);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [scanned, setScanned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  const scan = useCallback(async () => {
    setBusy(true);
    setError(null);
    setApplied([]);
    try {
      const mail = await fetchRecentMail();
      setScanned(mail.length);
      setProposals(interpret(mail, store.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read your mail.");
    } finally {
      setBusy(false);
    }
  }, [store.data]);

  const apply = (p: Proposal) => {
    store.addException({
      id: uid(),
      classId: p.cls.id,
      date: p.date,
      kind: p.kind,
      start: p.start,
      end: p.end,
      location: p.location,
      source: p.subject,
    });
    setApplied((a) => [...a, p.id]);
  };

  const dismiss = (p: Proposal) => {
    setProposals((list) => list?.filter((x) => x.id !== p.id) ?? null);
  };

  if (!isConfigured()) {
    return (
      <Panel title="Changes from your email" icon={<Mail />}>
        <p className="text-sm text-muted">
          Needs the Google client ID configured — the same one the calendar sync
          uses.
        </p>
      </Panel>
    );
  }

  const pending = proposals?.filter((p) => !applied.includes(p.id)) ?? [];

  return (
    <Panel title="Changes from your email" icon={<Mail />}>
      <p className="text-sm text-muted">
        Scans your recent mail for cancellations, reschedules and room changes
        that mention classes you&apos;ve added, and suggests the matching
        change. <span className="font-medium text-foreground">Nothing is
        applied until you approve it</span> — an email is written by whoever
        sent it, so it shouldn&apos;t be able to rewrite your timetable on its
        own.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {proposals === null
            ? "Not scanned yet."
            : `Read ${scanned} recent message${scanned === 1 ? "" : "s"} — ${pending.length} suggestion${pending.length === 1 ? "" : "s"}.`}
        </span>
        <Button className="rounded-full px-5" disabled={busy} onClick={scan}>
          <Mail data-icon="inline-start" />
          {busy ? "Reading…" : "Scan my email"}
        </Button>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          {error}
        </p>
      )}

      {applied.length > 0 && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
          <Check className="size-4" />
          Applied {applied.length} change{applied.length === 1 ? "" : "s"} to your
          timetable.
        </p>
      )}

      {proposals !== null && pending.length === 0 && !error && (
        <p className="mt-4 text-sm text-muted">
          Nothing to suggest. Academia only proposes a change when a message
          names a class you have, says clearly what changed, and gives a date
          that class actually falls on.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {pending.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-border bg-background/40 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={p.kind === "cancelled" ? "destructive" : "secondary"}
                  >
                    {KIND_LABEL[p.kind]}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    {describeProposal(p)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted">
                  {p.subject} · {p.from}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted hover:text-foreground"
                  onClick={() => dismiss(p)}
                >
                  <X data-icon="inline-start" />
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => apply(p)}
                >
                  <Check data-icon="inline-start" />
                  Apply
                </Button>
              </div>
            </div>

            <p className="mt-3 flex gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted">
              <Quote className="mt-0.5 size-3 shrink-0" />
              <span className="italic">{p.evidence}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">
        Read-only access, requested only when you scan. Academia never sends
        mail and never deletes anything from your inbox.
      </p>
    </Panel>
  );
}

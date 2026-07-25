"use client";

import { useState } from "react";
import { CalendarPlus, Check, ClipboardList, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import type { Project } from "@/lib/planner/types";
import {
  addDays,
  formatDateKey,
  generateSessions,
  toDateKey,
  uid,
} from "@/lib/planner/schedule";
import { EmptyState, Field, Panel, inputCls } from "./ui";

function NewEntryForm({ store }: { store: PlannerStore }) {
  const todayKey = toDateKey(new Date());
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"task" | "project">("project");
  const [start, setStart] = useState(todayKey);
  const [end, setEnd] = useState(toDateKey(addDays(new Date(), 13)));
  const [count, setCount] = useState(6);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) return setError("Please enter a name.");
    if (!start || !end || end < start)
      return setError("The end date must be on or after the start date.");
    const sessions = generateSessions({
      start,
      end,
      count,
      holidays: store.data.holidays,
      skipWeekends,
    });
    if (sessions.length === 0)
      return setError("No available days — the whole period is holidays or weekends.");
    store.addProject({
      id: uid(),
      name: name.trim(),
      kind,
      notes: notes.trim() || undefined,
      start,
      end,
      sessions,
      createdAt: Date.now(),
    });
    setName("");
    setNotes("");
    setError(null);
  };

  return (
    <Panel title="Start a new task or project" icon={<CalendarPlus />}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name" className="sm:col-span-2">
            <input
              className={inputCls}
              value={name}
              placeholder="e.g. Physics lab report"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as "task" | "project")}
            >
              <option value="project">Project</option>
              <option value="task">Task</option>
            </select>
          </Field>
          <Field label="Work sessions">
            <input
              className={inputCls}
              type="number"
              min={1}
              max={60}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label="Start date">
            <input
              className={inputCls}
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="End date">
            <input
              className={inputCls}
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2">
            <input
              className={inputCls}
              value={notes}
              placeholder="Scope, deliverables…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
            />
            Skip weekends
          </label>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <Button type="submit" className="rounded-full px-5">
              <Sparkles data-icon="inline-start" />
              Generate timetable
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Sessions are spread evenly across the period — marked holidays are skipped
          automatically.
        </p>
      </form>
    </Panel>
  );
}

function ProjectCard({ project, store }: { project: Project; store: PlannerStore }) {
  const todayKey = toDateKey(new Date());
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [notes, setNotes] = useState(project.notes ?? "");
  const done = project.sessions.filter((s) => s.done).length;
  const total = project.sessions.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const complete = total > 0 && done === total;

  const saveEdit = () => {
    if (!name.trim()) return;
    store.updateProject(project.id, { name: name.trim(), notes: notes.trim() || undefined });
    setEditing(false);
  };

  const cancelEdit = () => {
    setName(project.name);
    setNotes(project.notes ?? "");
    setEditing(false);
  };

  return (
    <Panel className={cn(complete && "border-accent/40 bg-accent-faint")}>
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Notes (optional)">
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex items-center justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={saveEdit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-foreground">{project.name}</span>
              <Badge
                variant={project.kind === "project" ? "default" : "secondary"}
                className="capitalize"
              >
                {project.kind}
              </Badge>
              {complete && (
                <Badge className="gap-1 bg-accent text-primary-foreground">
                  <Check className="size-3" /> Complete
                </Badge>
              )}
            </div>
            <div className="mt-1 text-sm text-muted">
              {formatDateKey(project.start)} – {formatDateKey(project.end)}
              {project.notes && <span className="ml-2 text-foreground/70">· {project.notes}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted hover:text-accent"
              onClick={() => setEditing(true)}
            >
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted hover:text-destructive"
              onClick={() => store.removeProject(project.id)}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("text-sm font-medium", complete ? "text-accent" : "text-muted")}>
          {done}/{total} done · {pct}%
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {project.sessions.map((s) => {
          const overdue = !s.done && s.date < todayKey;
          const isToday = s.date === todayKey;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => store.toggleSession(project.id, s.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                s.done
                  ? "border-accent/40 bg-accent-faint"
                  : overdue
                    ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                    : "border-border bg-card hover:border-accent/50 hover:bg-accent-faint",
                isToday && !s.done && "border-accent/60"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  s.done ? "border-accent bg-accent" : "border-input bg-card"
                )}
              >
                {s.done && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    s.done ? "text-accent line-through" : "text-foreground"
                  )}
                >
                  {s.label}
                </span>
                <span className={cn("block text-xs", overdue ? "text-destructive" : "text-muted")}>
                  {formatDateKey(s.date)}
                  {isToday && " · Today"}
                  {overdue && " · Overdue"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export function TasksTab({ store }: { store: PlannerStore }) {
  const { projects } = store.data;
  return (
    <div className="flex flex-col gap-5">
      <NewEntryForm store={store} />
      {projects.length === 0 ? (
        <EmptyState icon={<ClipboardList />}>
          Nothing here yet — start your first task or project above.
        </EmptyState>
      ) : (
        projects.map((p) => <ProjectCard key={p.id} project={p} store={store} />)
      )}
    </div>
  );
}

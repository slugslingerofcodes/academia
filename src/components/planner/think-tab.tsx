"use client";

import { useState } from "react";
import { Lightbulb, Pencil, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import type { Note } from "@/lib/planner/types";
import { uid } from "@/lib/planner/schedule";
import { EmptyState, Field, Panel, inputCls } from "./ui";

const textareaCls = cn(inputCls, "h-auto min-h-24 resize-y py-2");

function formatStamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NewNoteForm({ store }: { store: PlannerStore }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!body.trim() && !title.trim()) return setError("Write something first.");
    const now = Date.now();
    store.addNote({
      id: uid(),
      title: title.trim(),
      body: body.trim(),
      createdAt: now,
      updatedAt: now,
    });
    setTitle("");
    setBody("");
    setError(null);
  };

  return (
    <Panel title="Capture a thought" icon={<Lightbulb />}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-4">
          <Field label="Title (optional)">
            <input
              className={inputCls}
              value={title}
              placeholder="e.g. Ideas for the ML project"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Note">
            <textarea
              className={textareaCls}
              value={body}
              placeholder="Jot down anything — ideas, reminders, links…"
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-destructive">{error}</span>}
          <Button type="submit" className="rounded-full px-5">
            <Plus data-icon="inline-start" />
            Add note
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function NoteCard({ note, store }: { note: Note; store: PlannerStore }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  const save = () => {
    if (!body.trim() && !title.trim()) return;
    store.updateNote(note.id, { title: title.trim(), body: body.trim() });
    setEditing(false);
  };

  const cancel = () => {
    setTitle(note.title);
    setBody(note.body);
    setEditing(false);
  };

  if (editing) {
    return (
      <Panel className="border-accent/50">
        <div className="flex flex-col gap-3">
          <input
            className={inputCls}
            value={title}
            placeholder="Title (optional)"
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={textareaCls}
            value={body}
            placeholder="Your note…"
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button size="sm" className="rounded-full px-4" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      {note.title && (
        <h3 className="mb-1.5 text-sm font-semibold text-foreground">{note.title}</h3>
      )}
      {note.body && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
          {note.body}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-xs text-muted">
          {note.updatedAt !== note.createdAt ? "Edited" : "Added"} {formatStamp(note.updatedAt)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit note"
            className="text-muted hover:text-accent"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete note"
            className="text-muted hover:text-destructive"
            onClick={() => store.removeNote(note.id)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function ThinkTab({ store }: { store: PlannerStore }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const notes = [...store.data.notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));

  return (
    <div className="flex flex-col gap-5">
      <NewNoteForm store={store} />

      {store.data.notes.length > 0 && (
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            className={cn(inputCls, "pl-9")}
            value={query}
            placeholder="Search notes…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {store.data.notes.length === 0 ? (
        <EmptyState icon={<StickyNote />}>
          No notes yet — capture your first thought above.
        </EmptyState>
      ) : notes.length === 0 ? (
        <EmptyState icon={<Search />}>No notes match “{query}”.</EmptyState>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}

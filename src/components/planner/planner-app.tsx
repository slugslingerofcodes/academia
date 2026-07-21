"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, TreePalm } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/use-planner";
import { useClassNotifications } from "@/lib/planner/use-class-notifications";
import { TasksTab } from "./tasks-tab";
import { TimetableTab } from "./timetable-tab";
import { HolidaysTab } from "./holidays-tab";

const TABS = [
  { id: "missions", label: "Tasks & Projects", icon: ClipboardList },
  { id: "timetable", label: "Weekly Timetable", icon: CalendarDays },
  { id: "holidays", label: "Holidays", icon: TreePalm },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PlannerApp() {
  const store = usePlanner();
  // mounted at the top level so class alerts keep firing on every tab
  const alerts = useClassNotifications(store.data.classes, store.data.holidays);
  const [tab, setTab] = useState<TabId>("missions");

  // the studio pages hide the native cursor; restore it while the planner is open
  useEffect(() => {
    const prev = document.body.dataset.customCursor;
    document.body.dataset.customCursor = "false";
    return () => {
      document.body.dataset.customCursor = prev ?? "true";
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4" />
            Studio home
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Ledger
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track tasks &amp; projects, plan your week, never miss a class.
          </p>
        </div>
        <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted sm:block">
          Saved locally in your browser
        </span>
      </header>

      <nav className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-card text-accent shadow-[0_1px_3px_rgba(28,33,48,0.12)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {!store.hydrated ? (
        <div className="py-24 text-center text-sm text-muted">Loading…</div>
      ) : (
        <>
          {tab === "missions" && <TasksTab store={store} />}
          {tab === "timetable" && <TimetableTab store={store} alerts={alerts} />}
          {tab === "holidays" && <HolidaysTab store={store} />}
        </>
      )}
    </div>
  );
}

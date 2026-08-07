"use client";

import { useState } from "react";
import { CalendarDays, ClipboardList, FileText, Lightbulb, TreePalm } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/use-planner";
import { useClassNotifications } from "@/lib/planner/use-class-notifications";
import { TasksTab } from "./tasks-tab";
import { TimetableTab } from "./timetable-tab";
import { HolidaysTab } from "./holidays-tab";
import { ResumeTab } from "./resume-tab";
import { ThinkTab } from "./think-tab";
import { AcademiaMark } from "./academia-mark";
import { InstallPrompt } from "./install-prompt";
import { ServiceWorkerRegistrar } from "./service-worker";

const TABS = [
  { id: "missions", label: "Tasks & Projects", icon: ClipboardList },
  { id: "timetable", label: "Weekly Timetable", icon: CalendarDays },
  { id: "holidays", label: "Holidays", icon: TreePalm },
  { id: "think", label: "Think", icon: Lightbulb },
  { id: "resume", label: "Resume", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PlannerApp() {
  const store = usePlanner();
  // mounted at the top level so class alerts keep firing on every tab
  const alerts = useClassNotifications(store.data.classes, store.data.holidays);
  const [tab, setTab] = useState<TabId>("missions");

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* the real crest is layered over the placeholder as a background
              image, so adding public/logo.png replaces it with no code change */}
          <span className="relative size-14 shrink-0 md:size-16">
            <AcademiaMark className="size-full" />
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/logo.png)" }}
            />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Academia
            </h1>
            <p className="mt-1 text-sm text-muted">
              Track tasks &amp; projects, plan your week, never miss a class.
            </p>
          </div>
        </div>
        <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted sm:block">
          Saved locally in your browser
        </span>
      </header>

      <ServiceWorkerRegistrar />
      <InstallPrompt />

      <nav className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-card text-accent shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
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
          {tab === "think" && <ThinkTab store={store} />}
          {tab === "resume" && <ResumeTab store={store} />}
        </>
      )}
    </div>
  );
}

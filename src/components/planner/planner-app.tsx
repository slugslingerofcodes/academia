"use client";

import { useRef, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileText,
  Lightbulb,
  Smartphone,
  TreePalm,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/lib/planner/use-planner";
import { useClassNotifications } from "@/lib/planner/use-class-notifications";
import { TasksTab } from "./tasks-tab";
import { TimetableTab } from "./timetable-tab";
import { UpcomingTab } from "./upcoming-tab";
import { HolidaysTab } from "./holidays-tab";
import { ResumeTab } from "./resume-tab";
import { ThinkTab } from "./think-tab";
import { useDailyDigest } from "@/lib/planner/use-daily-digest";
import { useAccountSync } from "@/lib/planner/use-account-sync";
import { AcademiaMark } from "./academia-mark";
import { InstallPrompt } from "./install-prompt";
import { ServiceWorkerRegistrar } from "./service-worker";
import { ThemeToggle } from "./theme-toggle";
import { DevicesTab } from "./devices-tab";

const TABS = [
  { id: "missions", label: "Tasks & Projects", icon: ClipboardList },
  { id: "timetable", label: "Weekly Timetable", icon: CalendarDays },
  { id: "upcoming", label: "Upcoming", icon: CalendarRange },
  { id: "holidays", label: "Holidays", icon: TreePalm },
  { id: "think", label: "Think", icon: Lightbulb },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "devices", label: "Devices", icon: Smartphone },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PlannerApp() {
  const store = usePlanner();
  // mounted at the top level so class alerts keep firing on every tab
  const alerts = useClassNotifications(
    store.data.classes,
    store.data.holidays,
    store.data.exceptions
  );
  // start-of-day summary, sharing the same notification permission
  useDailyDigest(store.data, alerts.permission);
  // signed-in account + background sync with the copy held in Drive
  const sync = useAccountSync(store.data, store.replaceAll);
  const [tab, setTab] = useState<TabId>("missions");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /*
   * Arrow keys move between tabs, which is what a tablist is expected to do —
   * without it, reaching the last tab means seven presses of Tab, and every one
   * of those stops is also a stop on the way to the content.
   */
  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 md:px-6">
      {/* the tab bar sits between the header and the content, so a keyboard
          user would otherwise cross all seven tabs to reach what they came for */}
      <a href="#planner-content" className="skip-link">
        Skip to content
      </a>
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
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted sm:block">
            Saved locally in your browser
          </span>
          <ThemeToggle />
        </div>
      </header>

      <ServiceWorkerRegistrar />
      <InstallPrompt />

      <div
        role="tablist"
        aria-label="Planner sections"
        className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-secondary p-1"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="planner-content"
            // only the active tab is a tab stop; arrows move within the list
            tabIndex={tab === t.id ? 0 : -1}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              tab === t.id
                ? "bg-card text-accent shadow-[var(--shadow-raised)]"
                : "text-muted hover:text-foreground"
            )}
          >
            <t.icon className="size-4" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <main
        id="planner-content"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={-1}
      >
        {!store.hydrated ? (
          // reserve roughly a screen of height: the planner only exists after
          // hydration, and collapsing to a short box first shifts the whole page
          <div
            role="status"
            className="flex min-h-[70vh] items-start justify-center py-24 text-sm text-muted"
          >
            Loading…
          </div>
        ) : (
          <>
            {tab === "missions" && <TasksTab store={store} />}
            {tab === "timetable" && <TimetableTab store={store} alerts={alerts} />}
            {tab === "upcoming" && <UpcomingTab store={store} />}
            {tab === "holidays" && <HolidaysTab store={store} />}
            {tab === "think" && <ThinkTab store={store} />}
            {tab === "resume" && <ResumeTab store={store} />}
            {tab === "devices" && <DevicesTab store={store} sync={sync} />}
          </>
        )}
      </main>
    </div>
  );
}

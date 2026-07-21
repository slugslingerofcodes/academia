import type { Metadata } from "next";
import { PlannerApp } from "@/components/planner/planner-app";

export const metadata: Metadata = {
  title: "Ledger — Tasks, Timetable & Holidays",
  description:
    "Track tasks and projects, generate work timetables over any period, manage your weekly class schedule with 10-minute reminders, and mark holidays.",
};

export default function PlannerPage() {
  return (
    <main>
      <PlannerApp />
    </main>
  );
}

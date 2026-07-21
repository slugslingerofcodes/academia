export type EntryKind = "task" | "project";

export interface WorkSession {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  label: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  kind: EntryKind;
  notes?: string;
  start: string;
  end: string;
  sessions: WorkSession[];
  createdAt: number;
}

export const CLASS_HUES = ["accent", "blue", "red", "mono"] as const;
export type ClassHue = (typeof CLASS_HUES)[number];

export interface ClassEntry {
  id: string;
  title: string;
  /** 0 = Monday … 6 = Sunday. */
  day: number;
  /** 24h "HH:MM". */
  start: string;
  end: string;
  location?: string;
  hue: ClassHue;
}

export interface Holiday {
  id: string;
  date: string;
  label?: string;
}

export interface PlannerData {
  projects: Project[];
  classes: ClassEntry[];
  holidays: Holiday[];
}

export const EMPTY_DATA: PlannerData = {
  projects: [],
  classes: [],
  holidays: [],
};

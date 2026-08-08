export type EntryKind = "task" | "project";

export interface WorkSession {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  label: string;
  done: boolean;
  /** Suggested free window that day, picked around your classes ("HH:MM"). */
  start?: string;
  end?: string;
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

export const CLASS_TYPES = ["lecture", "lab", "tutorial"] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

export const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  lecture: "Lecture",
  lab: "Lab",
  tutorial: "Tutorial",
};

/**
 * One meeting of a subject — a single day + time slot. A subject that meets
 * several times a week is several entries sharing the same code, title and
 * type, which keeps the week grid, reminders and calendar export simple.
 */
export interface ClassEntry {
  id: string;
  /** Subject code, e.g. "MATH F111". */
  code?: string;
  /** Subject name. */
  title: string;
  type: ClassType;
  /** 0 = Monday … 6 = Sunday. */
  day: number;
  /** 24h "HH:MM". */
  start: string;
  end: string;
  location?: string;
  hue: ClassHue;
}

/** How a class is labelled in the UI, calendar events and reminders. */
export function classLabel(cls: ClassEntry): string {
  return cls.code ? `${cls.code} — ${cls.title}` : cls.title;
}

export interface Holiday {
  id: string;
  date: string;
  label?: string;
}

export const EXCEPTION_KINDS = ["cancelled", "moved", "room"] as const;
export type ExceptionKind = (typeof EXCEPTION_KINDS)[number];

/**
 * A one-off change to a single occurrence of a weekly class.
 *
 * Classes repeat every week, so "Thursday's lab is cancelled" can't be
 * expressed by editing the class itself without wiping out every other week.
 */
export interface ClassException {
  id: string;
  classId: string;
  /** The specific date affected, YYYY-MM-DD. */
  date: string;
  kind: ExceptionKind;
  /** Replacement time for a moved class. */
  start?: string;
  end?: string;
  /** Replacement room. */
  location?: string;
  /** Where this came from, e.g. an email subject. */
  source?: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  period: string;
  score: string;
}

export interface ExperienceEntry {
  id: string;
  role: string;
  org: string;
  period: string;
  /** One bullet point per line. */
  details: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  tech: string;
  link: string;
  /** One bullet point per line. */
  details: string;
}

export interface ResumeData {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  /** Comma-separated. */
  skills: string;
}

export const EMPTY_RESUME: ResumeData = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: "",
};

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlannerSettings {
  /** Start-of-day summary of what's due. */
  digestEnabled: boolean;
  /** 24h "HH:MM" — when that summary fires. */
  digestTime: string;
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  digestEnabled: true,
  digestTime: "08:00",
};

/**
 * Record of something deleted, kept so the deletion survives a sync.
 *
 * Without these, merging two devices would resurrect anything deleted on one
 * of them, because the other device still has a perfectly good copy.
 */
export interface Tombstone {
  id: string;
  at: number;
}

export interface PlannerData {
  projects: Project[];
  classes: ClassEntry[];
  holidays: Holiday[];
  resume: ResumeData;
  notes: Note[];
  settings: PlannerSettings;
  deleted: Tombstone[];
  exceptions: ClassException[];
}

export const EMPTY_DATA: PlannerData = {
  projects: [],
  classes: [],
  holidays: [],
  resume: EMPTY_RESUME,
  notes: [],
  settings: DEFAULT_SETTINGS,
  deleted: [],
  exceptions: [],
};

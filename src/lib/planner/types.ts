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

export interface PlannerData {
  projects: Project[];
  classes: ClassEntry[];
  holidays: Holiday[];
  resume: ResumeData;
  notes: Note[];
}

export const EMPTY_DATA: PlannerData = {
  projects: [],
  classes: [],
  holidays: [],
  resume: EMPTY_RESUME,
  notes: [],
};

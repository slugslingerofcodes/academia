"use client";

import { Briefcase, FileDown, FolderGit2, GraduationCap, Plus, Trash2, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerStore } from "@/lib/planner/use-planner";
import type {
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  ResumeData,
} from "@/lib/planner/types";
import { uid } from "@/lib/planner/schedule";
import { Field, Panel, inputCls } from "./ui";

const textareaCls = cn(inputCls, "h-auto min-h-20 resize-y py-2");

/* ---- form ---- */

function BasicsForm({ resume, set }: { resume: ResumeData; set: (p: Partial<ResumeData>) => void }) {
  return (
    <Panel title="About you" icon={<User />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className={inputCls} value={resume.name} placeholder="e.g. Sashank Rao"
            onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Headline">
          <input className={inputCls} value={resume.headline} placeholder="e.g. Computer Science undergraduate"
            onChange={(e) => set({ headline: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={resume.email} placeholder="you@example.com"
            onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={resume.phone} placeholder="+91 …"
            onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Location">
          <input className={inputCls} value={resume.location} placeholder="e.g. Goa, India"
            onChange={(e) => set({ location: e.target.value })} />
        </Field>
        <Field label="Website / profile">
          <input className={inputCls} value={resume.website} placeholder="github.com/you"
            onChange={(e) => set({ website: e.target.value })} />
        </Field>
        <Field label="Summary" className="sm:col-span-2">
          <textarea className={textareaCls} value={resume.summary}
            placeholder="Two or three sentences about who you are and what you're looking for."
            onChange={(e) => set({ summary: e.target.value })} />
        </Field>
      </div>
    </Panel>
  );
}

function EntryShell({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="xs" className="text-muted hover:text-destructive" onClick={onRemove}>
          <Trash2 data-icon="inline-start" />
          Remove
        </Button>
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="w-fit rounded-full px-4" onClick={onClick}>
      <Plus data-icon="inline-start" />
      {label}
    </Button>
  );
}

function EducationForm({ resume, set }: { resume: ResumeData; set: (p: Partial<ResumeData>) => void }) {
  const patch = (id: string, p: Partial<EducationEntry>) =>
    set({ education: resume.education.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  return (
    <Panel title="Education" icon={<GraduationCap />}>
      <div className="flex flex-col gap-3">
        {resume.education.map((e) => (
          <EntryShell key={e.id} onRemove={() => set({ education: resume.education.filter((x) => x.id !== e.id) })}>
            <Field label="School / university">
              <input className={inputCls} value={e.school} placeholder="e.g. BITS Pilani, Goa"
                onChange={(ev) => patch(e.id, { school: ev.target.value })} />
            </Field>
            <Field label="Degree / course">
              <input className={inputCls} value={e.degree} placeholder="e.g. B.E. Computer Science"
                onChange={(ev) => patch(e.id, { degree: ev.target.value })} />
            </Field>
            <Field label="Period">
              <input className={inputCls} value={e.period} placeholder="e.g. 2025 – 2029"
                onChange={(ev) => patch(e.id, { period: ev.target.value })} />
            </Field>
            <Field label="Score (optional)">
              <input className={inputCls} value={e.score} placeholder="e.g. CGPA 8.9/10"
                onChange={(ev) => patch(e.id, { score: ev.target.value })} />
            </Field>
          </EntryShell>
        ))}
        <AddButton label="Add education" onClick={() =>
          set({ education: [...resume.education, { id: uid(), school: "", degree: "", period: "", score: "" }] })} />
      </div>
    </Panel>
  );
}

function ExperienceForm({ resume, set }: { resume: ResumeData; set: (p: Partial<ResumeData>) => void }) {
  const patch = (id: string, p: Partial<ExperienceEntry>) =>
    set({ experience: resume.experience.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  return (
    <Panel title="Experience" icon={<Briefcase />}>
      <div className="flex flex-col gap-3">
        {resume.experience.map((e) => (
          <EntryShell key={e.id} onRemove={() => set({ experience: resume.experience.filter((x) => x.id !== e.id) })}>
            <Field label="Role">
              <input className={inputCls} value={e.role} placeholder="e.g. Web dev intern"
                onChange={(ev) => patch(e.id, { role: ev.target.value })} />
            </Field>
            <Field label="Organisation">
              <input className={inputCls} value={e.org} placeholder="e.g. Acme Labs"
                onChange={(ev) => patch(e.id, { org: ev.target.value })} />
            </Field>
            <Field label="Period">
              <input className={inputCls} value={e.period} placeholder="e.g. May – Jul 2026"
                onChange={(ev) => patch(e.id, { period: ev.target.value })} />
            </Field>
            <Field label="What you did (one bullet per line)" className="sm:col-span-2">
              <textarea className={textareaCls} value={e.details}
                placeholder={"Built the billing dashboard in React\nCut page load time by 40%"}
                onChange={(ev) => patch(e.id, { details: ev.target.value })} />
            </Field>
          </EntryShell>
        ))}
        <AddButton label="Add experience" onClick={() =>
          set({ experience: [...resume.experience, { id: uid(), role: "", org: "", period: "", details: "" }] })} />
      </div>
    </Panel>
  );
}

function ProjectsForm({ resume, set }: { resume: ResumeData; set: (p: Partial<ResumeData>) => void }) {
  const patch = (id: string, p: Partial<ProjectEntry>) =>
    set({ projects: resume.projects.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  return (
    <Panel title="Projects" icon={<FolderGit2 />}>
      <div className="flex flex-col gap-3">
        {resume.projects.map((p) => (
          <EntryShell key={p.id} onRemove={() => set({ projects: resume.projects.filter((x) => x.id !== p.id) })}>
            <Field label="Project name">
              <input className={inputCls} value={p.name} placeholder="e.g. Ledger planner"
                onChange={(ev) => patch(p.id, { name: ev.target.value })} />
            </Field>
            <Field label="Tech used">
              <input className={inputCls} value={p.tech} placeholder="e.g. Next.js, TypeScript"
                onChange={(ev) => patch(p.id, { tech: ev.target.value })} />
            </Field>
            <Field label="Link (optional)" className="sm:col-span-2">
              <input className={inputCls} value={p.link} placeholder="github.com/you/project"
                onChange={(ev) => patch(p.id, { link: ev.target.value })} />
            </Field>
            <Field label="What it does (one bullet per line)" className="sm:col-span-2">
              <textarea className={textareaCls} value={p.details}
                placeholder={"Tracks tasks and generates study timetables\nSends class reminders via browser notifications"}
                onChange={(ev) => patch(p.id, { details: ev.target.value })} />
            </Field>
          </EntryShell>
        ))}
        <AddButton label="Add project" onClick={() =>
          set({ projects: [...resume.projects, { id: uid(), name: "", tech: "", link: "", details: "" }] })} />
      </div>
    </Panel>
  );
}

function SkillsForm({ resume, set }: { resume: ResumeData; set: (p: Partial<ResumeData>) => void }) {
  return (
    <Panel title="Skills" icon={<Wrench />}>
      <Field label="Skills (comma separated)">
        <textarea className={cn(textareaCls, "min-h-14")} value={resume.skills}
          placeholder="e.g. Python, TypeScript, React, SQL, Figma"
          onChange={(e) => set({ skills: e.target.value })} />
      </Field>
    </Panel>
  );
}

/* ---- paper preview ---- */

function bullets(details: string): string[] {
  return details.split("\n").map((l) => l.trim()).filter(Boolean);
}

function PaperSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="border-b border-paper-line pb-1 text-[11px] font-semibold tracking-[0.14em] text-paper-ink uppercase">
        {title}
      </h3>
      <div className="mt-2 flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function PaperEntryHead({ left, sub, right }: { left: string; sub?: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm font-semibold text-paper-ink">{left}</span>
        {sub && <span className="ml-2 text-sm text-paper-muted">{sub}</span>}
      </div>
      {right && <span className="shrink-0 text-xs text-paper-muted">{right}</span>}
    </div>
  );
}

function BulletList({ details }: { details: string }) {
  const items = bullets(details);
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 list-disc pl-5 text-[13px] leading-relaxed text-paper-ink/90">
      {items.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function ResumePreview({ resume }: { resume: ResumeData }) {
  const contact = [resume.email, resume.phone, resume.location, resume.website].filter(Boolean);
  const skills = resume.skills.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div id="resume-preview" className="rounded-2xl border border-border bg-paper p-8 text-paper-ink">
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-paper-ink">
          {resume.name || "Your Name"}
        </h2>
        {resume.headline && <p className="mt-0.5 text-sm text-paper-muted">{resume.headline}</p>}
        {contact.length > 0 && (
          <p className="mt-1.5 text-xs text-paper-muted">{contact.join("  ·  ")}</p>
        )}
      </header>

      {resume.summary.trim() && (
        <PaperSection title="Summary">
          <p className="text-[13px] leading-relaxed text-paper-ink/90">{resume.summary}</p>
        </PaperSection>
      )}

      {resume.experience.length > 0 && (
        <PaperSection title="Experience">
          {resume.experience.map((e) => (
            <div key={e.id}>
              <PaperEntryHead left={e.role || "Role"} sub={e.org && `— ${e.org}`} right={e.period} />
              <BulletList details={e.details} />
            </div>
          ))}
        </PaperSection>
      )}

      {resume.projects.length > 0 && (
        <PaperSection title="Projects">
          {resume.projects.map((p) => (
            <div key={p.id}>
              <PaperEntryHead left={p.name || "Project"} sub={p.tech && `— ${p.tech}`} right={p.link} />
              <BulletList details={p.details} />
            </div>
          ))}
        </PaperSection>
      )}

      {resume.education.length > 0 && (
        <PaperSection title="Education">
          {resume.education.map((e) => (
            <div key={e.id}>
              <PaperEntryHead left={e.school || "School"} sub={e.degree && `— ${e.degree}`} right={e.period} />
              {e.score && <p className="text-xs text-paper-muted">{e.score}</p>}
            </div>
          ))}
        </PaperSection>
      )}

      {skills.length > 0 && (
        <PaperSection title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="rounded-md bg-paper-line/60 px-2 py-0.5 text-xs text-paper-ink">
                {s}
              </span>
            ))}
          </div>
        </PaperSection>
      )}
    </div>
  );
}

/* ---- tab ---- */

export function ResumeTab({ store }: { store: PlannerStore }) {
  const resume = store.data.resume;
  const set = (patch: Partial<ResumeData>) => store.setResume({ ...resume, ...patch });

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          Everything saves as you type — come back and edit any time. The preview shows
          exactly what prints.
        </p>
        <BasicsForm resume={resume} set={set} />
        <EducationForm resume={resume} set={set} />
        <ExperienceForm resume={resume} set={set} />
        <ProjectsForm resume={resume} set={set} />
        <SkillsForm resume={resume} set={set} />
      </div>

      <div className="flex flex-col gap-3 xl:sticky xl:top-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted">Preview</span>
          <Button className="rounded-full px-5" onClick={() => window.print()}>
            <FileDown data-icon="inline-start" />
            Download PDF
          </Button>
        </div>
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}

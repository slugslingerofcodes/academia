"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_KEY = "academia:theme";

export type ThemeChoice = "light" | "dark" | "system";

/**
 * Runs before first paint (see layout.tsx) so the correct palette is in place
 * immediately — otherwise a dark-mode user sees a white flash on every load.
 * Kept as a string because it is injected verbatim into the document head.
 */
export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('${THEME_KEY}');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
`;

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const listeners = new Set<() => void>();
let cached: ThemeChoice | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getChoice(): ThemeChoice {
  if (cached) return cached;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    cached = stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    cached = "system";
  }
  return cached;
}

/** "system" removes the attribute so the prefers-color-scheme rules apply. */
function setChoice(choice: ThemeChoice) {
  cached = choice;
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // private mode — the theme still applies for this session
  }
  if (choice === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  listeners.forEach((l) => l());
}

const serverChoice = () => "system" as const;

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getChoice, serverChoice);
  const pick = useCallback((c: ThemeChoice) => setChoice(c), []);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex gap-1 rounded-full border border-border bg-secondary p-1"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-label={o.label}
          aria-pressed={choice === o.id}
          title={o.label}
          onClick={() => pick(o.id)}
          className={cn(
            "rounded-full p-1.5 transition-colors",
            choice === o.id
              ? "bg-card text-accent shadow-[var(--shadow-raised)]"
              : "text-muted hover:text-foreground"
          )}
        >
          <o.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

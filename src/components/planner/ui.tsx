import { cn } from "@/lib/utils";

export const inputCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-ring/40";

export function Panel({
  title,
  icon,
  className,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          {icon && <span className="text-accent [&>svg]:size-4.5">{icon}</span>}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {icon && <span className="text-muted/50 [&>svg]:size-8">{icon}</span>}
      <span className="text-sm text-muted">{children}</span>
    </div>
  );
}

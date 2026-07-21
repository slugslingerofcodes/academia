"use client";

import type { Work } from "@/data/works";
import { ringOffset } from "@/data/works";

/** Vertical thumbnail rail under the HUD: the next few works. */
export function MoreWorks({
  works,
  active,
  onSelect,
}: {
  works: Work[];
  active: number;
  onSelect: (i: number) => void;
}) {
  const n = works.length;
  const upcoming = works
    .map((w, i) => ({ w, i, off: ringOffset(i, active, n) }))
    .filter(({ off }) => off > 0)
    .sort((a, b) => a.off - b.off)
    .slice(0, 3);

  return (
    <div className="w-[228px]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.3em] text-muted">
          MORE WORKS
        </span>
        <a
          href="#archive"
          className="text-[11px] text-accent transition-transform hover:translate-x-0.5"
          data-cursor="hover"
          aria-label="All works"
        >
          →
        </a>
      </div>
      <div className="flex flex-col gap-2.5">
        {upcoming.map(({ w, i }) => (
          <button
            key={w.slug}
            type="button"
            onClick={() => onSelect(i)}
            className="group flex items-center gap-3 text-left"
            data-cursor="hover"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={w.cover}
              alt=""
              className="aspect-video w-[84px] shrink-0 rounded-[4px] border border-border object-cover opacity-55 transition-opacity group-hover:opacity-100"
              draggable={false}
            />
            <span className="min-w-0">
              <span className="block text-[9px] tracking-[0.2em] text-muted">
                {w.date}
              </span>
              <span className="mt-0.5 block truncate text-[10px] tracking-[0.08em] text-foreground/80 transition-colors group-hover:text-accent">
                {w.title}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

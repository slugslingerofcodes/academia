"use client";

import type { Work } from "@/data/works";

function Ruler() {
  const H = 236;
  const STEP = 8;
  const ticks = Math.floor(H / STEP);
  return (
    <svg width="30" height={H} aria-hidden className="text-muted">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = i * STEP + 0.5;
        const major = i % 5 === 0;
        return (
          <g key={i}>
            <line
              x1={30}
              x2={30 - (major ? 14 : 7)}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={major ? 0.7 : 0.35}
            />
            {major && i % 10 === 0 && (
              <text
                x={0}
                y={y + 3}
                fontSize="7"
                fill="currentColor"
                fillOpacity={0.7}
                fontFamily="inherit"
              >
                {String(i / 10).padStart(2, "0")}
              </text>
            )}
          </g>
        );
      })}
      <rect x={26} y={H * 0.42} width={4} height={STEP * 5} fill="var(--accent)" fillOpacity={0.8} />
    </svg>
  );
}

/** Thin left strip: previous work's thumbnail + a vertical ruler graphic. */
export function LeftRail({
  prevWork,
  onPrev,
}: {
  prevWork: Work;
  onPrev: () => void;
}) {
  return (
    <aside className="hidden w-[96px] flex-col items-center gap-6 xl:flex">
      <span
        className="text-[9px] tracking-[0.35em] text-muted"
        style={{ writingMode: "vertical-rl" }}
      >
        PREV — 前の作品
      </span>
      <button
        type="button"
        onClick={onPrev}
        className="group block w-20"
        data-cursor="hover"
        aria-label={`Previous work: ${prevWork.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={prevWork.cover}
          alt=""
          className="aspect-video w-full rounded-[4px] border border-border object-cover opacity-50 transition-opacity group-hover:opacity-90"
          draggable={false}
        />
        <span className="mt-1.5 block truncate text-left text-[8px] tracking-[0.2em] text-muted">
          {prevWork.date}
        </span>
      </button>
      <Ruler />
    </aside>
  );
}

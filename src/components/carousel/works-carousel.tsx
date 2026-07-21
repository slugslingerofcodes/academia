"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { Work } from "@/data/works";
import { ringOffset } from "@/data/works";
import { GlitchSlices } from "./glitch-slices";

interface CarouselProps {
  works: Work[];
  active: number;
  playKey: number;
  direction: 1 | -1;
  onStep: (d: number) => void;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}

/** Center stage: focused card with peeking neighbors, glitch transition, meta block. */
export function WorksCarousel({
  works,
  active,
  playKey,
  direction,
  onStep,
  mx,
  my,
}: CarouselProps) {
  const n = works.length;
  const work = works[active];

  // slow parallax — focused card drifts with the mouse, peeks drift against it
  const px = useTransform(mx, [-1, 1], [-9, 9]);
  const py = useTransform(my, [-1, 1], [-6, 6]);
  const pxSide = useTransform(mx, [-1, 1], [13, -13]);

  return (
    <div className="flex w-full min-w-0 max-w-[980px] flex-col">
      {/* stage */}
      <motion.div
        className="relative aspect-video w-full touch-pan-y"
        onPanEnd={(_, info) => {
          if (info.offset.x < -70) onStep(1);
          else if (info.offset.x > 70) onStep(-1);
        }}
      >
        {works.map((w, i) => {
          const off = ringOffset(i, active, n);
          const visible = Math.abs(off) <= 1;
          const focused = off === 0;
          return (
            <motion.div
              key={w.slug}
              className="absolute inset-0"
              initial={false}
              animate={{
                x: `${off * 86}%`,
                scale: focused ? 1 : 0.72,
                opacity: focused ? 1 : visible ? 0.3 : 0,
              }}
              style={{
                zIndex: focused ? 10 : 4 - Math.abs(off),
                pointerEvents: visible ? "auto" : "none",
              }}
              transition={{ type: "spring", stiffness: 170, damping: 26 }}
              onClick={() => {
                if (off !== 0) onStep(off > 0 ? 1 : -1);
              }}
              data-cursor={focused ? undefined : "hover"}
            >
              <motion.div
                className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-card"
                style={{ x: focused ? px : pxSide, y: focused ? py : 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.cover}
                  alt={w.title}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {focused && (
                  <GlitchSlices src={w.cover} playKey={playKey} direction={direction} />
                )}
                {!focused && <div className="absolute inset-0 bg-background/45" />}
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* meta — re-animates on every slide change */}
      <div className="mt-6 flex items-end justify-between gap-6">
        <motion.div
          key={`${active}-${playKey}`}
          className="min-w-0"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-[11px] tracking-[0.3em] text-muted">
              {work.date}
            </span>
            <span className="font-jp text-xs tracking-[0.15em] text-accent">
              ▍{work.jpSubtitle}
            </span>
          </div>
          <h2 className="mt-2 font-display text-3xl uppercase leading-[1.05] tracking-[0.04em] text-foreground md:text-5xl">
            {work.title}
          </h2>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted md:text-[13px]">
            {work.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {work.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-full border-border bg-transparent px-2.5 text-[10px] tracking-[0.12em] text-foreground/70"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </motion.div>

        {/* index + controls */}
        <div className="hidden shrink-0 flex-col items-end gap-4 sm:flex">
          <span className="text-[11px] tracking-[0.3em] text-muted">
            {String(active + 1).padStart(2, "0")}{" "}
            <span className="text-foreground/30">/</span>{" "}
            {String(n).padStart(2, "0")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous work"
              onClick={() => onStep(-1)}
              className="flex size-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
              data-cursor="hover"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next work"
              onClick={() => onStep(1)}
              className="flex size-10 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
              data-cursor="hover"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

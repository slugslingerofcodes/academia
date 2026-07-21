"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { WORKS, ringOffset } from "@/data/works";
import { WorksCarousel } from "@/components/carousel/works-carousel";
import { HudPanel } from "@/components/hud/hud-panel";
import { MoreWorks } from "@/components/more-works";
import { LeftRail } from "@/components/left-rail";

/** Full-viewport main stage: left rail, carousel, right HUD column. Owns carousel state. */
export function HomeStage() {
  const n = WORKS.length;
  const [active, setActive] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const hoverRef = useRef(false);

  const step = useCallback(
    (d: number) => {
      setDirection(d > 0 ? 1 : -1);
      setActive((a) => (a + d + n) % n);
      setPlayKey((k) => k + 1);
    },
    [n]
  );

  const select = useCallback(
    (i: number) => {
      if (i === active) return;
      setDirection(ringOffset(i, active, n) > 0 ? 1 : -1);
      setActive(i);
      setPlayKey((k) => k + 1);
    },
    [active, n]
  );

  // keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // slow autoplay; paused while the pointer is over the stage. `active` in the
  // deps restarts the timer after any manual navigation.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!hoverRef.current) step(1);
    }, 8000);
    return () => clearInterval(id);
  }, [step, active]);

  // very slow mouse parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 40, damping: 18 });
  const smy = useSpring(my, { stiffness: 40, damping: 18 });
  const hudX = useTransform(smx, [-1, 1], [6, -6]);
  const hudY = useTransform(smy, [-1, 1], [4, -4]);

  return (
    <section
      id="works"
      className="relative flex min-h-svh w-full items-center justify-center px-4 pb-14 pt-24 md:px-8"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        mx.set(0);
        my.set(0);
      }}
    >
      <div className="flex w-full max-w-[1600px] items-center justify-center gap-8 2xl:gap-12">
        <LeftRail prevWork={WORKS[(active - 1 + n) % n]} onPrev={() => step(-1)} />

        <WorksCarousel
          works={WORKS}
          active={active}
          playKey={playKey}
          direction={direction}
          onStep={step}
          mx={smx}
          my={smy}
        />

        <motion.div
          className="hidden shrink-0 flex-col gap-5 self-start pt-2 lg:flex"
          style={{ x: hudX, y: hudY }}
        >
          <HudPanel />
          <MoreWorks works={WORKS} active={active} onSelect={select} />
        </motion.div>
      </div>

      {/* ambient footer coordinates */}
      <span className="absolute bottom-5 left-6 hidden text-[9px] tracking-[0.3em] text-muted md:block">
        15.4989°N 73.8278°E — NIGHT MODE ACTIVE / 夜間モード
      </span>
      <span className="absolute bottom-5 right-6 hidden text-[9px] tracking-[0.3em] text-muted md:block">
        SCROLL ↓ NEWS
      </span>
    </section>
  );
}

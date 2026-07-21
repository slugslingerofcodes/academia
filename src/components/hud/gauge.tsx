"use client";

import { useEffect, useRef } from "react";

function themeColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/** Small circular gauge with a twitching needle and a live level arc. */
export function Gauge({ size = 96 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const accent = themeColor("--accent", "#7cff6b");
    const muted = themeColor("--muted", "#6b6b6b");
    const fg = themeColor("--foreground", "#e8e8e8");

    const START = Math.PI * 0.75; // 135°
    const SPAN = Math.PI * 1.5; // 270° sweep

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let value = 0.55; // displayed 0..1
    let target = 0.55;
    let lastRetarget = 0;
    let raf = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;

      // pick a new target every ~0.8s, ease toward it, add per-frame twitch
      if (t - lastRetarget > 0.8) {
        target = 0.25 + Math.random() * 0.6;
        lastRetarget = t;
      }
      value += (target - value) * 0.045;
      const twitch = reduced ? 0 : Math.sin(t * 31) * 0.006 + Math.sin(t * 53) * 0.004;
      const shown = Math.min(1, Math.max(0, value + twitch));

      const c = size / 2;
      const R = size / 2 - 7;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // track arc
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(c, c, R, START, START + SPAN);
      ctx.stroke();

      // level arc
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(c, c, R, START, START + SPAN * shown);
      ctx.stroke();

      // ticks
      ctx.lineWidth = 1;
      ctx.strokeStyle = muted;
      for (let i = 0; i <= 27; i++) {
        const a = START + (SPAN * i) / 27;
        const len = i % 9 === 0 ? 6 : 3;
        ctx.globalAlpha = i % 9 === 0 ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * (R - 3), c + Math.sin(a) * (R - 3));
        ctx.lineTo(c + Math.cos(a) * (R - 3 - len), c + Math.sin(a) * (R - 3 - len));
        ctx.stroke();
      }

      // needle
      const na = START + SPAN * shown;
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c - Math.cos(na) * 6, c - Math.sin(na) * 6);
      ctx.lineTo(c + Math.cos(na) * (R - 12), c + Math.sin(na) * (R - 12));
      ctx.stroke();

      // hub
      ctx.fillStyle = accent;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(c, c, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // readout
      const db = (shown * 60 - 54).toFixed(1);
      ctx.font = `600 ${Math.max(8, size * 0.09)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.9;
      ctx.fillText(`${db}dB`, c, size - 6);

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      aria-label="Sound spectrometer gauge"
      role="img"
    />
  );
}

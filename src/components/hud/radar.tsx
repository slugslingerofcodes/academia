"use client";

import { useEffect, useRef } from "react";

interface Blip {
  r: number; // 0..1 radius fraction
  a: number; // angle rad
  dr: number;
  da: number;
  pulse: number;
}

function themeColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/** Circular radar / spectrum analyzer: concentric rings, rotating sweep, drifting blips. */
export function Radar({ size = 172 }: { size?: number }) {
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

    const blips: Blip[] = Array.from({ length: 14 }, (_, i) => ({
      r: 0.2 + ((i * 37) % 71) / 100,
      a: ((i * 137.5) % 360) * (Math.PI / 180),
      dr: (((i * 13) % 7) - 3) * 0.00003,
      da: (((i * 7) % 9) - 4) * 0.00018,
      pulse: (i * 0.61) % (Math.PI * 2),
    }));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const sweep = reduced ? Math.PI / 3 : (t * (Math.PI * 2)) / 9; // one rev / 9s
      const c = size / 2;
      const R = size / 2 - 8;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineWidth = 1;

      // concentric rings
      ctx.strokeStyle = accent;
      for (const f of [0.28, 0.52, 0.76, 1]) {
        ctx.globalAlpha = f === 1 ? 0.4 : 0.18;
        ctx.beginPath();
        ctx.arc(c, c, R * f, 0, Math.PI * 2);
        ctx.stroke();
      }

      // cross hairs
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(c - R, c);
      ctx.lineTo(c + R, c);
      ctx.moveTo(c, c - R);
      ctx.lineTo(c, c + R);
      ctx.stroke();

      // outer ticks every 15°
      ctx.strokeStyle = muted;
      ctx.globalAlpha = 0.55;
      for (let d = 0; d < 360; d += 15) {
        const a = (d * Math.PI) / 180;
        const len = d % 45 === 0 ? 6 : 3;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
        ctx.lineTo(c + Math.cos(a) * (R - len), c + Math.sin(a) * (R - len));
        ctx.stroke();
      }

      // sweep wedge (conic gradient trailing the beam)
      try {
        const grad = ctx.createConicGradient(sweep - Math.PI * 1.999, c, c);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.82, "rgba(0,0,0,0)");
        grad.addColorStop(1, accent);
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.arc(c, c, R, 0, Math.PI * 2);
        ctx.fill();
      } catch {
        // conic gradients unsupported — beam line below still shows the sweep
      }

      // beam line
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(sweep) * R, c + Math.sin(sweep) * R);
      ctx.stroke();

      // blips — brighten as the sweep passes, then decay
      for (const b of blips) {
        b.r = Math.min(0.96, Math.max(0.12, b.r + b.dr));
        b.a += b.da;
        const behind = (((sweep - b.a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const hit = Math.exp(-behind * 1.6);
        const idle = 0.25 + 0.15 * Math.sin(t * 2 + b.pulse);
        const glow = Math.min(1, idle + hit);
        const x = c + Math.cos(b.a) * R * b.r;
        const y = c + Math.sin(b.a) * R * b.r;
        ctx.globalAlpha = glow;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + hit * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      aria-label="Message spectrometer radar"
      role="img"
    />
  );
}

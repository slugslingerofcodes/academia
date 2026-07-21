"use client";

import { useEffect, useState } from "react";
import { Radar } from "./radar";
import { Gauge } from "./gauge";

const CHANNELS = ["CH.01", "CH.02", "AUX"] as const;

function Readouts() {
  const [values, setValues] = useState([128.44, 61.02, 9.7]);

  useEffect(() => {
    const id = setInterval(() => {
      setValues((v) =>
        v.map((x, i) => {
          const jitter = (Math.random() - 0.5) * (i === 2 ? 1.4 : 6);
          return Math.max(0, x + jitter);
        })
      );
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      {CHANNELS.map((ch, i) => (
        <div
          key={ch}
          className="flex items-center justify-between gap-3 text-[9px] tracking-[0.15em]"
        >
          <span className="text-muted">{ch}</span>
          <span className={i === 0 ? "text-accent" : "text-foreground/70"}>
            {values[i].toFixed(2)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 text-[9px] tracking-[0.15em]">
        <span className="text-muted">LINK</span>
        <span className="flex items-center gap-1 text-accent">
          <span className="blink-dot size-1 rounded-full bg-accent" />
          OK
        </span>
      </div>
    </div>
  );
}

/** Floating top-right HUD widget: radar + gauge mini-visualizations. */
export function HudPanel() {
  return (
    <div className="relative w-[228px] overflow-hidden rounded-lg border border-border bg-panel p-4 backdrop-blur-md">
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] tracking-[0.3em] text-muted">
          HUD — 計器盤
        </span>
        <span className="blink-dot size-1.5 rounded-full bg-accent" />
      </div>

      <div className="flex flex-col items-center">
        <Radar size={168} />
        <div className="mt-2 flex w-full items-baseline justify-between">
          <span className="text-[9px] tracking-[0.22em] text-foreground/80">
            MESSAGE SPECTROMETER
          </span>
          <span className="font-jp text-[9px] text-muted">通信解析</span>
        </div>
      </div>

      <div className="my-3 border-t border-border" />

      <div className="flex items-center gap-4">
        <Gauge size={92} />
        <Readouts />
      </div>
      <div className="mt-2 flex w-full items-baseline justify-between">
        <span className="text-[9px] tracking-[0.22em] text-foreground/80">
          SOUND SPECTROMETER
        </span>
        <span className="font-jp text-[9px] text-muted">音響計</span>
      </div>
    </div>
  );
}

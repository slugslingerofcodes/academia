"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const SLICES = 7;
const SKEW = 6; // diagonal slant of each shard, in % of card height

/**
 * Chromatic-aberration / glitch-slice transition overlay.
 * Remounts on every `playKey` change: RGB channel ghosts separate while the
 * incoming image tears in as diagonal shards that snap into alignment.
 */
export function GlitchSlices({
  src,
  playKey,
  direction,
}: {
  src: string;
  playKey: number;
  direction: 1 | -1;
}) {
  // unmount the overlay once the tear has resolved so it doesn't keep
  // seven painted layers sitting on top of the focused card
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    const t = setTimeout(() => setDone(true), 750);
    return () => clearTimeout(t);
  }, [playKey]);

  if (playKey === 0 || done) return null; // also: no glitch on initial page load

  const bg: React.CSSProperties = {
    backgroundImage: `url(${src})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <div
      key={playKey}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      style={{ animation: "glitch-flicker 0.45s steps(1) both" }}
      aria-hidden
    >
      {/* red / blue channel ghosts pulling apart, then resolving */}
      <motion.div
        className="rgb-split-r absolute inset-0"
        style={bg}
        initial={{ x: -16 * direction, opacity: 0.85 }}
        animate={{ x: 0, opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="rgb-split-b absolute inset-0"
        style={bg}
        initial={{ x: 16 * direction, opacity: 0.85 }}
        animate={{ x: 0, opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* diagonal shards of the incoming frame sliding into registration */}
      {Array.from({ length: SLICES }, (_, i) => {
        const top = (i / SLICES) * 100;
        const bottom = ((i + 1) / SLICES) * 100;
        const clipPath = `polygon(0% ${top + SKEW}%, 100% ${top - SKEW}%, 100% ${
          bottom - SKEW
        }%, 0% ${bottom + SKEW}%)`;
        const dx = (i % 2 === 0 ? 1 : -1) * (22 + ((i * 13) % 26)) * direction;
        return (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{ ...bg, clipPath }}
            initial={{ x: dx, opacity: 1 }}
            animate={{ x: 0 }}
            transition={{
              duration: 0.5,
              delay: i * 0.018,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        );
      })}

      {/* one-frame white slap */}
      <motion.div
        className="absolute inset-0 bg-foreground"
        initial={{ opacity: 0.14 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
      />
    </div>
  );
}

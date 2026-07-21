"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Custom circular cursor. Only mounts on fine-pointer devices; on touch
 * devices it flips the body flag back so the native cursor rules never apply.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 650, damping: 45, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 650, damping: 45, mass: 0.4 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) {
      document.body.dataset.customCursor = "false";
      return;
    }
    setEnabled(true);

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const over = (e: MouseEvent) => {
      const t = e.target as Element | null;
      setHovering(
        Boolean(t?.closest?.("a, button, [role='button'], [data-cursor='hover']"))
      );
    };
    const leave = () => setVisible(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("mouseover", over);
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("mouseover", over);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[120] size-4 rounded-full bg-foreground mix-blend-difference"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{ scale: hovering ? 2.4 : 1, opacity: visible ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    />
  );
}
